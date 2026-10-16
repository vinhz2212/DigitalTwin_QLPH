const db = require("../config/database");

const RoomModel = {
  // Lấy tất cả phòng kèm tòa nhà và tầng
  getAll: async () => {
    const [rows] = await db.query(`
      SELECT r.*, f.floor_number, f.name as floor_name,
             b.id as building_id, b.code as building_code, b.name as building_name
      FROM Rooms r
      JOIN Floors f ON r.floor_id = f.id
      JOIN Buildings b ON f.building_id = b.id
      ORDER BY b.code, f.floor_number, r.code
    `);
    return rows;
  },

  // Lấy phòng theo id
  getById: async (id) => {
    const [rows] = await db.query(
      `
      SELECT r.*, f.floor_number, f.name as floor_name,
             b.id as building_id, b.code as building_code, b.name as building_name
      FROM Rooms r
      JOIN Floors f ON r.floor_id = f.id
      JOIN Buildings b ON f.building_id = b.id
      WHERE r.id = ?
    `,
      [id],
    );
    return rows[0];
  },

  // Lấy phòng theo tòa nhà
  getByBuilding: async (buildingId) => {
    const [rows] = await db.query(
      `
      SELECT r.*, f.floor_number, f.name as floor_name,
             b.code as building_code, b.name as building_name
      FROM Rooms r
      JOIN Floors f ON r.floor_id = f.id
      JOIN Buildings b ON f.building_id = b.id
      WHERE b.id = ?
      ORDER BY f.floor_number, r.code
    `,
      [buildingId],
    );
    return rows;
  },

  // Lấy phòng trống
  getAvailable: async () => {
    const [rows] = await db.query(`
      SELECT r.*, f.floor_number, b.code as building_code
      FROM Rooms r
      JOIN Floors f ON r.floor_id = f.id
      JOIN Buildings b ON f.building_id = b.id
      WHERE r.status = 'trong'
      ORDER BY b.code, f.floor_number
    `);
    return rows;
  },

  // Nguồn thống kê phòng dùng chung cho Dashboard, trang Phòng và AI.
  getStats: async (buildingCodes = []) => {
    const normalizedCodes = Array.isArray(buildingCodes)
      ? buildingCodes
          .map((code) => String(code).trim().toUpperCase())
          .filter(Boolean)
      : [];
    const buildingFilter = normalizedCodes.length
      ? `WHERE UPPER(b.code) IN (${normalizedCodes.map(() => "?").join(", ")})`
      : "";
    const [rows] = await db.query(
      `
        SELECT
          COUNT(*) AS total,
          COALESCE(SUM(r.status = 'trong'), 0) AS trong,
          COALESCE(SUM(r.status = 'dang_hoc'), 0) AS dang_hoc,
          COALESCE(SUM(r.status = 'bao_tri'), 0) AS bao_tri,
          COALESCE(SUM(r.status = 'su_co'), 0) AS su_co
        FROM Rooms r
        JOIN Floors f ON r.floor_id = f.id
        JOIN Buildings b ON f.building_id = b.id
        ${buildingFilter}
      `,
      normalizedCodes,
    );
    const stats = rows[0] || {};
    const result = {
      total: Number(stats.total) || 0,
      trong: Number(stats.trong) || 0,
      dang_hoc: Number(stats.dang_hoc) || 0,
      bao_tri: Number(stats.bao_tri) || 0,
      su_co: Number(stats.su_co) || 0,
    };

    // Giữ các tên cũ để những nơi đang dùng API /rooms/stats không bị lỗi.
    return {
      ...result,
      available: result.trong,
      occupied: result.dang_hoc,
      maintenance: result.bao_tri,
      incident: result.su_co,
    };
  },

  // Tạo phòng mới
  create: async (data) => {
    const { floor_id, code, name, capacity, type, description } = data;
    const [result] = await db.query(
      `
      INSERT INTO Rooms (floor_id, code, name, capacity, type, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [floor_id, code, name, capacity, type, description],
    );
    return result.insertId;
  },

  // Cập nhật phòng
  update: async (id, data) => {
    const { code, name, capacity, type, status, description } = data;
    await db.query(
      `
      UPDATE Rooms SET code=?, name=?, capacity=?, type=?, status=?, description=?
      WHERE id=?
    `,
      [code, name, capacity, type, status, description, id],
    );
  },

  // Cập nhật trạng thái
  updateStatus: async (id, status) => {
    await db.query("UPDATE Rooms SET status=? WHERE id=?", [status, id]);
  },

  // Xóa phòng
  delete: async (id) => {
    await db.query("DELETE FROM Rooms WHERE id=?", [id]);
  },

  // Lấy tất cả tòa nhà
  getBuildings: async () => {
    const [rows] = await db.query("SELECT * FROM Buildings ORDER BY code");
    return rows;
  },

  // Lấy tầng theo tòa nhà
  getFloorsByBuilding: async (buildingId) => {
    const [rows] = await db.query(
      "SELECT * FROM Floors WHERE building_id=? ORDER BY floor_number",
      [buildingId],
    );
    return rows;
  },
};

module.exports = RoomModel;
