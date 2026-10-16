const db = require("../config/database");

const syncRoomOperationalStatus = async (roomId, executor = db) => {
  await executor.query(
    `UPDATE Rooms r
     SET r.status = CASE
       WHEN EXISTS (
         SELECT 1 FROM Incidents i
         WHERE i.room_id = r.id AND i.status <> 'da_giai_quyet'
       ) THEN 'su_co'
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

module.exports = {
  syncRoomOperationalStatus,
  syncAllRoomOperationalStatuses,
};
