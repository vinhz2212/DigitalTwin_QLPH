const LogModel = require("../models/logModel");

const logController = {
  getAll: async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 100;
      const logs = await LogModel.getAll(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },
};

module.exports = logController;
