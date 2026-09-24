import { useState, useEffect } from "react";
import api from "../../services/api";
import {
  Plus,
  Edit,
  Trash2,
  Key,
  Search,
  Users as UsersIcon,
} from "lucide-react";

const ROLE_MAP = {
  admin: {
    label: "Quản trị viên",
    color: "#ef4444",
    bg: "#fef2f2",
    icon: "👑",
  },
  giang_vien: {
    label: "Giảng viên",
    color: "#3b82f6",
    bg: "#eff6ff",
    icon: "👨‍🏫",
  },
  ky_thuat_vien: {
    label: "Kỹ thuật viên",
    color: "#22c55e",
    bg: "#f0fdf4",
    icon: "🔧",
  },
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [form, setForm] = useState({
    role_id: "",
    username: "",
    email: "",
    password: "",
    full_name: "",
    phone: "",
    is_active: true,
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/users");
      setUsers(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get("/users/roles");
      setRoles(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditUser(user);
      setForm({
        role_id: user.role_id,
        username: user.username,
        email: user.email,
        password: "",
        full_name: user.full_name,
        phone: user.phone || "",
        is_active: user.is_active,
      });
    } else {
      setEditUser(null);
      setForm({
        role_id: "",
        username: "",
        email: "",
        password: "",
        full_name: "",
        phone: "",
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editUser) {
        await api.put(`/users/${editUser.id}`, form);
      } else {
        await api.post("/users", form);
      }
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || "Có lỗi xảy ra!");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa người dùng này?")) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || "Không thể xóa!");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/users/${selectedUser.id}/password`, {
        password: newPassword,
      });
      alert("Đặt lại mật khẩu thành công!");
      setShowPasswordModal(false);
      setNewPassword("");
    } catch (error) {
      alert("Có lỗi xảy ra!");
    }
  };

  const filtered = users.filter((u) => {
    const matchSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole ? u.role_name === filterRole : true;
    return matchSearch && matchRole;
  });

  const stats = {
    total: users.length,
    admin: users.filter((u) => u.role_name === "admin").length,
    giang_vien: users.filter((u) => u.role_name === "giang_vien").length,
    ky_thuat_vien: users.filter((u) => u.role_name === "ky_thuat_vien").length,
    active: users.filter((u) => u.is_active).length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800">
            Quản lý Người dùng
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {users.length} tài khoản trong hệ thống
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg transition-all hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, #1a56db, #3b82f6)",
            boxShadow: "0 4px 15px rgba(26,86,219,0.35)",
          }}
        >
          <Plus size={16} /> Thêm người dùng
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          {
            label: "Tổng tài khoản",
            value: stats.total,
            color: "#1a56db",
            bg: "#eff6ff",
            icon: "👥",
          },
          {
            label: "Quản trị viên",
            value: stats.admin,
            color: "#ef4444",
            bg: "#fef2f2",
            icon: "👑",
          },
          {
            label: "Giảng viên",
            value: stats.giang_vien,
            color: "#3b82f6",
            bg: "#dbeafe",
            icon: "👨‍🏫",
          },
          {
            label: "Kỹ thuật viên",
            value: stats.ky_thuat_vien,
            color: "#22c55e",
            bg: "#f0fdf4",
            icon: "🔧",
          },
          {
            label: "Đang hoạt động",
            value: stats.active,
            color: "#8b5cf6",
            bg: "#f5f3ff",
            icon: "✅",
          },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 hover:shadow-md transition-all"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: s.bg }}
            >
              {s.icon}
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">{s.label}</p>
              <p className="text-2xl font-black" style={{ color: s.color }}>
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Tìm kiếm tên, username, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50 focus:bg-white transition-all"
            />
          </div>
          <div className="flex gap-2">
            {[
              { value: "", label: "Tất cả" },
              { value: "admin", label: "👑 Admin" },
              { value: "giang_vien", label: "👨‍🏫 Giảng viên" },
              { value: "ky_thuat_vien", label: "🔧 Kỹ thuật viên" },
            ].map((r) => (
              <button
                key={r.value}
                onClick={() => setFilterRole(r.value)}
                className="px-3 py-2.5 rounded-xl text-xs font-bold transition-all border-2"
                style={{
                  background: filterRole === r.value ? "#eff6ff" : "white",
                  color: filterRole === r.value ? "#1a56db" : "#6b7280",
                  borderColor: filterRole === r.value ? "#1a56db" : "#e5e7eb",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Đang tải...</p>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr
                style={{
                  background: "linear-gradient(135deg, #f8fafc, #eff6ff)",
                }}
              >
                {[
                  "Người dùng",
                  "Username",
                  "Email",
                  "Vai trò",
                  "Trạng thái",
                  "Ngày tạo",
                  "Thao tác",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider border-b border-gray-100"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((user) => {
                const role = ROLE_MAP[user.role_name];
                return (
                  <tr
                    key={user.id}
                    className="hover:bg-blue-50/20 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-sm"
                          style={{
                            background:
                              "linear-gradient(135deg, #1a56db, #3b82f6)",
                          }}
                        >
                          {user.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">
                            {user.full_name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {user.phone || "--"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                        {user.username}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-bold px-3 py-1.5 rounded-full"
                        style={{ color: role?.color, background: role?.bg }}
                      >
                        {role?.icon} {role?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{
                          color: user.is_active ? "#22c55e" : "#6b7280",
                          background: user.is_active ? "#f0fdf4" : "#f9fafb",
                        }}
                      >
                        {user.is_active ? "● Hoạt động" : "○ Vô hiệu"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(user.created_at).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => handleOpenModal(user)}
                          className="p-2 rounded-lg text-blue-500 hover:bg-blue-100 transition-all"
                          title="Chỉnh sửa"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowPasswordModal(true);
                          }}
                          className="p-2 rounded-lg text-amber-500 hover:bg-amber-100 transition-all"
                          title="Đặt lại mật khẩu"
                        >
                          <Key size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-100 transition-all"
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-300">
            <UsersIcon size={48} className="mx-auto mb-3" />
            <p className="text-sm">Không tìm thấy người dùng nào</p>
          </div>
        )}
      </div>

      {/* Modal Thêm/Sửa */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div
              className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"
              style={{
                background: "linear-gradient(135deg, #f8fafc, #eff6ff)",
              }}
            >
              <div>
                <h2 className="text-lg font-black text-gray-800">
                  {editUser
                    ? "✏️ Chỉnh sửa người dùng"
                    : "👤 Thêm người dùng mới"}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Điền đầy đủ thông tin bên dưới
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-all"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Họ và tên
                  </label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) =>
                      setForm({ ...form, full_name: e.target.value })
                    }
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) =>
                      setForm({ ...form, username: e.target.value })
                    }
                    placeholder="nguyenvana"
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                    required
                    disabled={!!editUser}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@campus.edu.vn"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                  required
                />
              </div>
              {!editUser && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Mật khẩu
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    placeholder="Mật khẩu"
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                    required
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Vai trò
                  </label>
                  <select
                    value={form.role_id}
                    onChange={(e) =>
                      setForm({ ...form, role_id: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                    required
                  >
                    <option value="">Chọn vai trò</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    placeholder="0901234567"
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                  />
                </div>
              </div>
              {editUser && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div
                    className={`w-5 h-5 rounded-full border-2 cursor-pointer transition-all flex items-center justify-center ${form.is_active ? "bg-green-500 border-green-500" : "border-gray-300"}`}
                    onClick={() =>
                      setForm({ ...form, is_active: !form.is_active })
                    }
                  >
                    {form.is_active && (
                      <span className="text-white text-xs">✓</span>
                    )}
                  </div>
                  <label
                    className="text-sm font-bold text-gray-700 cursor-pointer"
                    onClick={() =>
                      setForm({ ...form, is_active: !form.is_active })
                    }
                  >
                    Tài khoản đang hoạt động
                  </label>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl text-white text-sm font-bold transition-all"
                  style={{
                    background: "linear-gradient(135deg, #1a56db, #3b82f6)",
                    boxShadow: "0 4px 15px rgba(26,86,219,0.35)",
                  }}
                >
                  {editUser ? "💾 Cập nhật" : "👤 Thêm người dùng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Đặt lại mật khẩu */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div
              className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"
              style={{
                background: "linear-gradient(135deg, #fffdf0, #fffbeb)",
              }}
            >
              <div>
                <h2 className="text-lg font-black text-gray-800">
                  🔑 Đặt lại mật khẩu
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Cho: {selectedUser?.full_name}
                </p>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-all"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 bg-gray-50"
                  required
                  minLength={6}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl text-white text-sm font-bold transition-all"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                    boxShadow: "0 4px 15px rgba(245,158,11,0.35)",
                  }}
                >
                  🔑 Đặt lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
