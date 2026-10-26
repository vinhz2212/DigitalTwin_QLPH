const db = require("../config/database");

const syncRoomOperationalStatus = async (roomId, executor = db) => {
  await executor.query(
    `UPDATE Rooms r
     SET r.status = CASE
       WHEN EXISTS (
         SELECT 1 FROM Incidents i
         WHERE i.room_id = r.id AND i.status <> 'da_giai_quyet'
       ) THEN 'su_co'
       WHEN r.power_status = 'ngat_dien' THEN 'su_co'
       WHEN EXISTS (
         SELECT 1 FROM Maintenance m
         JOIN Devices d ON m.device_id = d.id
         WHERE d.room_id = r.id
           AND m.status IN ('cho_xu_ly', 'dang_sua')
       ) THEN 'bao_tri'
       WHEN r.status IN ('su_co', 'bao_tri') THEN 'trong'
       ELSE r.status
     END
     WHERE r.id = ?`,
    [roomId],
  );

  const [rows] = await executor.query(
    "SELECT status FROM Rooms WHERE id = ? LIMIT 1",
    [roomId],
  );
  return rows[0]?.status;
};

const syncAllRoomOperationalStatuses = async (executor = db) => {
  await executor.query(`
    UPDATE Rooms r
    SET r.status = CASE
      WHEN EXISTS (
        SELECT 1 FROM Incidents i
        WHERE i.room_id = r.id AND i.status <> 'da_giai_quyet'
      ) THEN 'su_co'
      WHEN r.power_status = 'ngat_dien' THEN 'su_co'
      WHEN EXISTS (
        SELECT 1 FROM Maintenance m
        JOIN Devices d ON m.device_id = d.id
        WHERE d.room_id = r.id
          AND m.status IN ('cho_xu_ly', 'dang_sua')
      ) THEN 'bao_tri'
      WHEN r.status IN ('su_co', 'bao_tri') THEN 'trong'
      ELSE r.status
    END
  `);
};

const restoreRoomPowerAfterResolvedIncident = async (roomId, executor = db) => {
  const [[blockingIncidents]] = await executor.query(
    `SELECT COUNT(*) AS total FROM Incidents
     WHERE room_id = ? AND status <> 'da_giai_quyet'
       AND type IN ('chay', 'mat_dien')`,
    [roomId],
  );
  if (Number(blockingIncidents.total) > 0) {
    return { powerRestored: false, devicesRestored: 0 };
  }

  const [powerResult] = await executor.query(
    `UPDATE Rooms r
     SET r.power_status = 'co_dien'
     WHERE r.id = ? AND r.power_status = 'ngat_dien'
       AND NOT EXISTS (
         SELECT 1 FROM Incidents i
         WHERE i.room_id = r.id
           AND i.status <> 'da_giai_quyet'
           AND i.type IN ('chay', 'mat_dien')
       )`,
    [roomId],
  );

  const [deviceResult] = await executor.query(
    `UPDATE Devices d
     JOIN Rooms r ON r.id = d.room_id
     SET d.status = CASE
           WHEN d.status = 'tat' AND d.power_status = 'ngat_dien'
             THEN CASE
               WHEN d.power_cut_previous_status IN ('hong', 'dang_sua')
                 THEN d.power_cut_previous_status
               ELSE 'tat' END
           WHEN d.status = 'tat' THEN d.power_cut_previous_status
           ELSE d.status
         END,
         d.power_cut_previous_status = NULL
     WHERE d.room_id = ?
       AND r.power_status = 'co_dien'
       AND d.power_cut_previous_status IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM Incidents i
         WHERE i.room_id = d.room_id
           AND i.status <> 'da_giai_quyet'
           AND i.type IN ('chay', 'mat_dien')
       )`,
    [roomId],
  );

  return {
    powerRestored: powerResult.affectedRows > 0,
    devicesRestored: deviceResult.affectedRows,
  };
};

module.exports = {
  syncRoomOperationalStatus,
  syncAllRoomOperationalStatuses,
  restoreRoomPowerAfterResolvedIncident,
};
