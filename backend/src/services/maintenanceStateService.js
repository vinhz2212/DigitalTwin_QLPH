const db = require("../config/database");
const {
  syncAllRoomOperationalStatuses,
} = require("./roomOperationalStatusService");

const reconcileOpenMaintenanceState = async () => {
  await db.query(`
    UPDATE Devices d
    JOIN (
      SELECT device_id,
             MAX(status = 'dang_sua') AS is_repairing
      FROM Maintenance
      WHERE status IN ('cho_xu_ly', 'dang_sua')
      GROUP BY device_id
    ) open_ticket ON open_ticket.device_id = d.id
    SET d.status = CASE
      WHEN open_ticket.is_repairing = 1 THEN 'dang_sua'
      ELSE 'hong'
    END
  `);

  await syncAllRoomOperationalStatuses(db);
};

module.exports = { reconcileOpenMaintenanceState };
