const db = require("../config/database");

const EnergyModel = {
  // Lấy tổng quan điện năng (Hôm nay, Tuần này, Cảnh báo)
  getSummary: async () => {
    const [todayRows] = await db.query(`
      SELECT COALESCE(SUM(kwh), 0) as total_kwh, COALESCE(SUM(cost), 0) as total_cost
      FROM EnergyLogs
      WHERE DATE(recorded_at) = CURDATE()
    `);

    const [weekRows] = await db.query(`
      SELECT COALESCE(SUM(kwh), 0) as total_kwh
      FROM EnergyLogs
      WHERE recorded_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    const [alertsRows] = await db.query(`
      SELECT COUNT(*) as alert_count
      FROM Devices
      WHERE status = 'hoat_dong' AND device_type_id = 2
    `);

    return {
      today_kwh: todayRows[0].total_kwh,
      today_cost: todayRows[0].total_cost,
      weekly_kwh: weekRows[0].total_kwh,
      alerts_count: alertsRows[0].alert_count,
    };
  },

  // Lấy dữ liệu biểu đồ điện năng (day, week, month)
  getChartData: async (period = "day") => {
    if (period === "week") {
      const [rows] = await db.query(`
        SELECT DAYNAME(recorded_at) as date,
               SUM(CASE WHEN b.code = 'A' THEN el.kwh ELSE 0 END) as toaA,
               SUM(CASE WHEN b.code = 'B' THEN el.kwh ELSE 0 END) as toaB
        FROM EnergyLogs el
        JOIN Buildings b ON el.building_id = b.id
        WHERE el.recorded_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(recorded_at), DAYNAME(recorded_at)
        ORDER BY DATE(recorded_at)
      `);
      return rows;
    } else if (period === "month") {
      const [rows] = await db.query(`
        SELECT DATE_FORMAT(recorded_at, '%m/%Y') as month,
               SUM(kwh) as kwh, SUM(cost) as cost
        FROM EnergyLogs
        GROUP BY DATE_FORMAT(recorded_at, '%m/%Y')
        ORDER BY MIN(recorded_at) ASC
        LIMIT 12
      `);
      return rows;
    } else {
      // day
      const [rows] = await db.query(`
        SELECT DATE_FORMAT(recorded_at, '%H:00') as time,
               SUM(kwh) as kwh, SUM(cost) as cost
        FROM EnergyLogs
        WHERE DATE(recorded_at) = CURDATE()
        GROUP BY HOUR(recorded_at)
        ORDER BY HOUR(recorded_at) ASC
      `);
      return rows;
    }
  },

  // Phân bổ năng lượng theo loại thiết bị
  getDeviceBreakdown: async () => {
    const [rows] = await db.query(`
      SELECT dt.name, dt.code, COUNT(d.id) as device_count,
             ROUND(COUNT(d.id) * 0.75, 1) as kwh,
             ROUND((COUNT(d.id) / (SELECT COUNT(*) FROM Devices WHERE status = 'hoat_dong')) * 100, 1) as percentage
      FROM Devices d
      JOIN DeviceTypes dt ON d.device_type_id = dt.id
      WHERE d.status = 'hoat_dong'
      GROUP BY dt.id, dt.name, dt.code
      ORDER BY kwh DESC
    `);
    return rows;
  },

  // Top phòng tiêu thụ nhiều điện nhất
  getTopRooms: async (limit = 5) => {
    const [rows] = await db.query(`
      SELECT r.code as room, r.name as room_name,
             COALESCE(SUM(el.kwh), 0) as kwh
      FROM Rooms r
      LEFT JOIN EnergyLogs el ON r.id = el.room_id
      GROUP BY r.id, r.code, r.name
      ORDER BY kwh DESC
      LIMIT ?
    `, [limit]);
    return rows;
  },
};

module.exports = EnergyModel;
