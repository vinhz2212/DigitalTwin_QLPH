const db = require("../config/database");

async function withRoomAvailabilityLock(roomId, work) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Mọi thao tác tạo lịch/đặt phòng đều khóa cùng một dòng phòng trước.
    // Nhờ đó hai yêu cầu đồng thời không thể cùng vượt qua bước kiểm tra trùng.
    const [rooms] = await connection.query(
      "SELECT id, status FROM Rooms WHERE id = ? LIMIT 1 FOR UPDATE",
      [roomId],
    );

    if (rooms.length === 0) {
      const error = new Error("Phòng học không tồn tại.");
      error.code = "ROOM_NOT_FOUND";
      throw error;
    }

    const result = await work(connection, rooms[0]);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { withRoomAvailabilityLock };
