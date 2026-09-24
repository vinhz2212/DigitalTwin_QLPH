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

  // Thống kê phòng
  getStats: async () => {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(status = 'trong') as available,
        SUM(status = 'dang_hoc') as occupied,
        SUM(status = 'bao_tri') as maintenance,
        SUM(status = 'su_co') as incident
      FROM Rooms
    `);
    return rows[0];
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
