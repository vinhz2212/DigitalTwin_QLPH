const IncidentModel = require("../models/incidentModel");
const RoomModel = require("../models/roomModel");

const incidentController = {
  getAll: async (req, res) => {
    try {
      const incidents = await IncidentModel.getAll();
      res.json(incidents);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  getStats: async (req, res) => {
    try {
      const stats = await IncidentModel.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const data = { ...req.body, triggered_by: req.user.id };
      const id = await IncidentModel.create(data);

      // Cập nhật trạng thái phòng → su_co
      await RoomModel.updateStatus(data.room_id, "su_co");

      // Gửi socket realtime
      const io = req.app.get("io");
      io.emit("incident_created", { incidentId: id, roomId: data.room_id });

      const incident = await IncidentModel.getById(id);
      res.status(201).json({ message: "Tạo sự cố thành công", incident });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  updateStatus: async (req, res) => {
    try {
      const { status } = req.body;
      await IncidentModel.updateStatus(req.params.id, status);

      // Nếu giải quyết xong → phòng về trạng thái trống
      if (status === "da_giai_quyet") {
        const incident = await IncidentModel.getById(req.params.id);
        if (incident) await RoomModel.updateStatus(incident.room_id, "trong");
      }

      const io = req.app.get("io");
      io.emit("incident_updated", { incidentId: req.params.id, status });

      res.json({ message: "Cập nhật trạng thái thành công" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      await IncidentModel.delete(req.params.id);
      res.json({ message: "Xóa sự cố thành công" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },
};

module.exports = incidentController;
