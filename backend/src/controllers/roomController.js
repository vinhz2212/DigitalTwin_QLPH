const RoomModel = require("../models/roomModel");
const db = require("../config/database");
const {
  restoreRoomPowerAfterResolvedIncident,
} = require("../services/roomOperationalStatusService");

const ROOM_STATUSES = new Set([
  "trong",
  "dang_hoc",
  "bao_tri",
  "su_co",
  "ngat_dien",
]);

function roomError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function saveRoomState(connection, id, requestedStatus, fields) {
  if (!ROOM_STATUSES.has(requestedStatus)) {
    throw roomError(400, "Trạng thái phòng không hợp lệ.");
  }

  const [rooms] = await connection.query(
    "SELECT id, power_status FROM Rooms WHERE id = ? FOR UPDATE",
    [id],
  );
  const currentRoom = rooms[0];
  if (!currentRoom) throw roomError(404, "Không tìm thấy phòng.");

  if (requestedStatus === "ngat_dien") {
    if (currentRoom.power_status !== "ngat_dien") {
      await connection.query(
        "UPDATE Rooms SET power_status = 'ngat_dien' WHERE id = ?",
        [id],
      );
      await connection.query(
        `UPDATE Devices
         SET power_cut_previous_status = COALESCE(power_cut_previous_status, status),
             status = 'tat'
         WHERE room_id = ?`,
        [id],
      );
    }
  } else if (currentRoom.power_status === "ngat_dien") {
    const [[blocking]] = await connection.query(
      `SELECT COUNT(*) AS total FROM Incidents
       WHERE room_id = ? AND status <> 'da_giai_quyet'
         AND type IN ('chay', 'mat_dien')`,
      [id],
    );
    if (Number(blocking.total) > 0) {
      throw roomError(
        409,
        "Phòng vẫn có sự cố cháy hoặc mất điện. Hãy giải quyết sự cố trước khi cấp điện lại.",
      );
    }
    await restoreRoomPowerAfterResolvedIncident(id, connection);
  }

  const roomStatus = requestedStatus === "ngat_dien" ? "su_co" : requestedStatus;
  if (fields) {
    await RoomModel.update(id, { ...fields, status: roomStatus }, connection);
  } else {
    await RoomModel.updateStatus(id, roomStatus, connection);
  }
}

function emitRoomsChanged(req, payload) {
  const io = req.app.get("io");
  if (io) io.emit("rooms_changed", payload);
}

const roomController = {
  getAll: async (req, res) => {
    try {
      const rooms = await RoomModel.getAll();
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  getById: async (req, res) => {
    try {
      const room = await RoomModel.getById(req.params.id);
      if (!room)
        return res.status(404).json({ message: "Không tìm thấy phòng" });
      res.json(room);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  getStats: async (req, res) => {
    try {
      const stats = await RoomModel.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  getAvailable: async (req, res) => {
    try {
      const rooms = await RoomModel.getAvailable();
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  getBuildings: async (req, res) => {
    try {
      const buildings = await RoomModel.getBuildings();
      res.json(buildings);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  getFloors: async (req, res) => {
    try {
      const floors = await RoomModel.getFloorsByBuilding(req.params.buildingId);
      res.json(floors);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const status = req.body.status ?? "trong";
      if (!ROOM_STATUSES.has(status)) {
        return res.status(400).json({ message: "Trạng thái phòng không hợp lệ." });
      }
      const id = await RoomModel.create({ ...req.body, status });
      const room = await RoomModel.getById(id);
      emitRoomsChanged(req, { action: "created", roomId: id });
      res.status(201).json({ message: "Tạo phòng thành công", room });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  update: async (req, res) => {
    let connection;
    let committed = false;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();
      await saveRoomState(connection, req.params.id, req.body.status, req.body);
      await connection.commit();
      committed = true;
      const room = await RoomModel.getById(req.params.id);
      emitRoomsChanged(req, { action: "updated", roomId: req.params.id });
      res.json({ message: "Cập nhật thành công", room });
    } catch (error) {
      if (connection && !committed) await connection.rollback();
      res.status(error.status || 500).json({
        message: error.status ? error.message : "Lỗi server",
        ...(!error.status && { error: error.message }),
      });
    } finally {
      connection?.release();
    }
  },

  updateStatus: async (req, res) => {
    let connection;
    let committed = false;
    try {
      const { status } = req.body;
      connection = await db.getConnection();
      await connection.beginTransaction();
      await saveRoomState(connection, req.params.id, status);
      await connection.commit();
      committed = true;

      // Gửi socket realtime
      const io = req.app.get("io");
      if (io) {
        io.emit("room_status_changed", {
          roomId: req.params.id,
          status: status === "ngat_dien" ? "su_co" : status,
        });
        io.emit("rooms_changed", {
          action: "status_changed",
          roomId: req.params.id,
          status,
        });
      }

      res.json({ message: "Cập nhật trạng thái thành công" });
    } catch (error) {
      if (connection && !committed) await connection.rollback();
      res.status(error.status || 500).json({
        message: error.status ? error.message : "Lỗi server",
        ...(!error.status && { error: error.message }),
      });
    } finally {
      connection?.release();
    }
  },

  delete: async (req, res) => {
    try {
      await RoomModel.delete(req.params.id);
      emitRoomsChanged(req, { action: "deleted", roomId: req.params.id });
      res.json({ message: "Xóa phòng thành công" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },
};

module.exports = roomController;
