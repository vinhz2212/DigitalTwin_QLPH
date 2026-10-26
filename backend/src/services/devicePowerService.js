const db = require("../config/database");

const FAILURE_DEVICE_TYPES = {
  may_chieu_hong: "may_chieu",
  dieu_hoa_hong: "dieu_hoa",
};

const getFailureDevice = async (roomId, incidentType, executor = db) => {
  const deviceType = FAILURE_DEVICE_TYPES[incidentType];
  if (!deviceType) return null;

  const [devices] = await executor.query(
    `SELECT d.id, d.room_id, d.name, d.status, d.power_status
     FROM Devices d
     JOIN DeviceTypes dt ON dt.id = d.device_type_id
     WHERE d.room_id = ? AND dt.name = ?
     ORDER BY d.id FOR UPDATE`,
    [roomId, deviceType],
  );
  if (devices.length !== 1) {
    const error = new Error(
      devices.length === 0
        ? `Phòng không có ${deviceType === "may_chieu" ? "máy chiếu" : "điều hòa"} để mô phỏng.`
        : "Phòng có nhiều thiết bị cùng loại; cần chọn thiết bị cụ thể trước khi mô phỏng.",
    );
    error.status = 409;
    throw error;
  }
  return devices[0];
};

const isolateFailedDevice = async (roomId, incidentType, executor = db) => {
  const device = await getFailureDevice(roomId, incidentType, executor);
  if (!device) return null;
  await executor.query(
    "UPDATE Devices SET status = 'hong', power_status = 'ngat_dien' WHERE id = ?",
    [device.id],
  );
  return device;
};

// Chỉ cấp lại nguồn cho thiết bị đã sửa và không còn phiếu/sự cố đang mở.
const restoreRepairedDevice = async (
  deviceId,
  executor = db,
  { allowRepairing = false } = {},
) => {
  const [rows] = await executor.query(
    `SELECT d.id, d.room_id, d.status, d.power_status,
            r.power_status AS room_power_status,
            dt.name AS device_type
     FROM Devices d
     JOIN DeviceTypes dt ON dt.id = d.device_type_id
     JOIN Rooms r ON r.id = d.room_id
     WHERE d.id = ? FOR UPDATE`,
    [deviceId],
  );
  const device = rows[0];
  if (!device || device.power_status !== "ngat_dien") {
    return { restored: false, blocked: false, device };
  }

  const incidentType = Object.keys(FAILURE_DEVICE_TYPES).find(
    (type) => FAILURE_DEVICE_TYPES[type] === device.device_type,
  );
  const [[openState]] = await executor.query(
    `SELECT
       (SELECT COUNT(*) FROM Maintenance m
        WHERE m.device_id = ? AND m.status IN ('cho_xu_ly', 'dang_sua')) AS maintenance_count,
       (SELECT COUNT(*) FROM Incidents i
        WHERE i.room_id = ? AND i.type = ?
          AND i.status <> 'da_giai_quyet') AS incident_count`,
    [deviceId, device.room_id, incidentType || ""],
  );
  if (
    Number(openState.maintenance_count) ||
    Number(openState.incident_count) ||
    (device.status === "dang_sua" && !allowRepairing)
  ) {
    return { restored: false, blocked: true, device };
  }

  if (device.room_power_status === "ngat_dien") {
    await executor.query(
      `UPDATE Devices
       SET power_status = 'co_dien', status = 'tat',
           power_cut_previous_status = 'hoat_dong'
       WHERE id = ?`,
      [deviceId],
    );
  } else {
    await executor.query(
      `UPDATE Devices
       SET power_status = 'co_dien', status = 'hoat_dong',
           power_cut_previous_status = NULL
       WHERE id = ?`,
      [deviceId],
    );
  }
  return { restored: true, blocked: false, device };
};

module.exports = {
  FAILURE_DEVICE_TYPES,
  getFailureDevice,
  isolateFailedDevice,
  restoreRepairedDevice,
};
