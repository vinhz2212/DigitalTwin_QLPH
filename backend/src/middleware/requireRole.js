const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Bạn không có quyền thực hiện thao tác này.",
      });
    }

    next();
  };
};

module.exports = requireRole;
