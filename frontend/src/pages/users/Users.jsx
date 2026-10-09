import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import {
  Check,
  ChevronDown,
  KeyRound,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

const ROLE_MAP = {
  admin: {
    label: "Quản trị viên",
    color: "#b91c1c",
    background: "#fef2f2",
    border: "#fecaca",
    initials: "QT",
  },
  giang_vien: {
    label: "Giảng viên",
    color: "#1d4ed8",
    background: "#eff6ff",
    border: "#bfdbfe",
    initials: "GV",
  },
  ky_thuat_vien: {
    label: "Kỹ thuật viên",
    color: "#15803d",
    background: "#f0fdf4",
    border: "#bbf7d0",
    initials: "KT",
  },
};

const EMPTY_FORM = {
  role_id: "",
  username: "",
  email: "",
  password: "",
  full_name: "",
  phone: "",
  is_active: true,
};

function getRoleInfo(roleName) {
  return (
    ROLE_MAP[roleName] || {
      label: roleName || "Chưa phân vai trò",
      color: "#475569",
      background: "#f8fafc",
      border: "#e2e8f0",
      initials: "ND",
    }
  );
}

function formatCreatedAt(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("vi-VN");
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");

      const response = await api.get("/users");
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Không thể tải danh sách người dùng:", error);
      setLoadError(
        error.response?.data?.message ||
          "Không thể tải người dùng. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await api.get("/users/roles");
      setRoles(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Không thể tải danh sách vai trò:", error);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");

    return users.filter((user) => {
      const searchableText = [
        user.full_name,
        user.username,
        user.email,
        user.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("vi");

      const matchesSearch = !keyword || searchableText.includes(keyword);
      const matchesRole = !filterRole || user.role_name === filterRole;

      return matchesSearch && matchesRole;
    });
  }, [users, search, filterRole]);

  const stats = useMemo(
    () => ({
      total: users.length,
      admin: users.filter((user) => user.role_name === "admin").length,
      giang_vien: users.filter((user) => user.role_name === "giang_vien")
        .length,
      ky_thuat_vien: users.filter((user) => user.role_name === "ky_thuat_vien")
        .length,
      active: users.filter((user) => Boolean(user.is_active)).length,
    }),
    [users],
  );

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const openUserModal = (user = null) => {
    setFormError("");

    if (user) {
      setEditUser(user);

      // GET /users hiện trả role_name nhưng không trả role_id.
      const matchedRole = roles.find((role) => role.name === user.role_name);

      setForm({
        role_id: String(user.role_id ?? matchedRole?.id ?? ""),
        username: user.username ?? "",
        email: user.email ?? "",
        password: "",
        full_name: user.full_name ?? "",
        phone: user.phone ?? "",
        is_active: Boolean(user.is_active),
      });
    } else {
      setEditUser(null);
      setForm(EMPTY_FORM);
    }

    setShowModal(true);
  };

  const closeUserModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditUser(null);
    setForm(EMPTY_FORM);
    setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!form.role_id) {
      setFormError("Vui lòng chọn vai trò.");
      return;
    }

    try {
      setSaving(true);

      if (editUser) {
        await api.put(`/users/${editUser.id}`, {
          role_id: Number(form.role_id),
          email: form.email.trim(),
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          is_active: form.is_active,
        });
      } else {
        await api.post("/users", {
          role_id: Number(form.role_id),
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
        });
      }

      setShowModal(false);
      setEditUser(null);
      setForm(EMPTY_FORM);
      await fetchUsers();
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          "Không thể lưu tài khoản. Vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (String(user.id) === String(selectedUser?.id)) {
      window.alert("Đang mở hộp thoại đặt lại mật khẩu cho tài khoản này.");
      return;
    }

    if (!window.confirm(`Bạn có chắc muốn xóa tài khoản ${user.username}?`)) {
      return;
    }

    try {
      setDeletingId(user.id);
      await api.delete(`/users/${user.id}`);
      await fetchUsers();
    } catch (error) {
      window.alert(
        error.response?.data?.message || "Không thể xóa người dùng.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const openPasswordModal = (user) => {
    setSelectedUser(user);
    setNewPassword("");
    setPasswordError("");
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    if (resettingPassword) return;

    setShowPasswordModal(false);
    setSelectedUser(null);
    setNewPassword("");
    setPasswordError("");
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setPasswordError("");

    if (newPassword.length < 6) {
      setPasswordError("Mật khẩu cần có ít nhất 6 ký tự.");
      return;
    }

    try {
      setResettingPassword(true);
      await api.patch(`/users/${selectedUser.id}/password`, {
        password: newPassword,
      });
      closePasswordModal();
      window.alert("Đặt lại mật khẩu thành công.");
    } catch (error) {
      setPasswordError(
        error.response?.data?.message ||
          "Không thể đặt lại mật khẩu. Vui lòng thử lại.",
      );
    } finally {
      setResettingPassword(false);
    }
  };

  const statCards = [
    {
      label: "Tổng tài khoản",
      value: stats.total,
      icon: UsersRound,
      color: "#2563eb",
      background: "#eff6ff",
    },
    {
      label: "Quản trị viên",
      value: stats.admin,
      icon: Shield,
      color: "#dc2626",
      background: "#fef2f2",
    },
    {
      label: "Giảng viên",
      value: stats.giang_vien,
      icon: UserRound,
      color: "#2563eb",
      background: "#eff6ff",
    },
    {
      label: "Kỹ thuật viên",
      value: stats.ky_thuat_vien,
      icon: KeyRound,
      color: "#16a34a",
      background: "#f0fdf4",
    },
    {
      label: "Đang hoạt động",
      value: stats.active,
      icon: Check,
      color: "#7c3aed",
      background: "#f5f3ff",
    },
  ];

  return (
    <div className="min-h-screen space-y-6 bg-slate-50/70 p-4 md:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-600">
            <UsersRound size={16} />
            <span>Quản trị hệ thống</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Quản lý người dùng
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý tài khoản, vai trò và trạng thái hoạt động.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openUserModal()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
        >
          <Plus size={18} />
          Thêm người dùng
        </button>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-5">
        {statCards.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="text-xs font-medium text-slate-500 sm:text-sm">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {item.value}
                </p>
              </div>
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ color: item.color, backgroundColor: item.background }}
              >
                <Icon size={20} />
              </span>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative block flex-1">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên, tên đăng nhập, email..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </label>

          <div className="relative w-full xl:w-60">
            <select
              value={filterRole}
              onChange={(event) => setFilterRole(event.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              aria-label="Lọc theo vai trò"
            >
              <option value="">Tất cả vai trò</option>
              {roles.map((role) => (
                <option key={role.id} value={role.name}>
                  {ROLE_MAP[role.name]?.label || role.description || role.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              Danh sách tài khoản
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Hiển thị {filteredUsers.length} / {users.length} tài khoản
            </p>
          </div>
          <button
            type="button"
            onClick={fetchUsers}
            className="self-start rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 sm:self-auto"
          >
            Tải lại
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-500">
            <LoaderCircle size={28} className="animate-spin text-blue-600" />
            <p className="text-sm">Đang tải người dùng...</p>
          </div>
        ) : loadError ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <p className="font-semibold text-slate-800">{loadError}</p>
            <button
              type="button"
              onClick={fetchUsers}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Thử lại
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <UsersRound size={26} />
            </span>
            <p className="mt-4 font-semibold text-slate-800">
              {search || filterRole
                ? "Không tìm thấy tài khoản phù hợp"
                : "Chưa có người dùng"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Thử thay đổi bộ lọc hoặc thêm người dùng mới.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px]">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Người dùng",
                    "Tên đăng nhập",
                    "Email",
                    "Vai trò",
                    "Trạng thái",
                    "Ngày tạo",
                    "Thao tác",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const role = getRoleInfo(user.role_name);
                  const initials =
                    user.full_name
                      ?.trim()
                      .split(/\s+/)
                      .slice(-2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase() || "ND";

                  return (
                    <tr
                      key={user.id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
                            {initials}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-800">
                              {user.full_name || "Chưa cập nhật tên"}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {user.phone || "Chưa có số điện thoại"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-700">
                          {user.username}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {user.email}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className="whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold"
                          style={{
                            color: role.color,
                            backgroundColor: role.background,
                            borderColor: role.border,
                          }}
                        >
                          {role.label}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.is_active
                              ? "bg-green-50 text-green-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              user.is_active ? "bg-green-500" : "bg-slate-400"
                            }`}
                          />
                          {user.is_active ? "Đang hoạt động" : "Đã vô hiệu"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                        {formatCreatedAt(user.created_at)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openUserModal(user)}
                            className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"
                            title="Chỉnh sửa"
                            aria-label={`Chỉnh sửa ${user.username}`}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openPasswordModal(user)}
                            className="rounded-lg p-2 text-amber-600 transition hover:bg-amber-50"
                            title="Đặt lại mật khẩu"
                            aria-label={`Đặt lại mật khẩu cho ${user.username}`}
                          >
                            <KeyRound size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(user)}
                            disabled={deletingId === user.id}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Xóa người dùng"
                            aria-label={`Xóa ${user.username}`}
                          >
                            {deletingId === user.id ? (
                              <LoaderCircle
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeUserModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-modal-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-sm font-semibold text-blue-600">
                  Quản lý tài khoản
                </p>
                <h2
                  id="user-modal-title"
                  className="mt-1 text-xl font-bold text-slate-900"
                >
                  {editUser ? "Chỉnh sửa người dùng" : "Thêm người dùng"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeUserModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="user-full-name"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Họ và tên
                  </label>
                  <input
                    id="user-full-name"
                    type="text"
                    value={form.full_name}
                    onChange={(event) =>
                      updateForm("full_name", event.target.value)
                    }
                    placeholder="Nguyễn Văn A"
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="user-username"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Tên đăng nhập
                  </label>
                  <input
                    id="user-username"
                    type="text"
                    value={form.username}
                    onChange={(event) =>
                      updateForm("username", event.target.value)
                    }
                    placeholder="nguyenvana"
                    required={!editUser}
                    disabled={Boolean(editUser)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="user-email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email
                </label>
                <input
                  id="user-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                  placeholder="email@campus.edu.vn"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              {!editUser && (
                <div>
                  <label
                    htmlFor="user-password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Mật khẩu
                  </label>
                  <input
                    id="user-password"
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      updateForm("password", event.target.value)
                    }
                    placeholder="Tối thiểu 6 ký tự"
                    minLength={6}
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="user-role"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Vai trò
                  </label>
                  <div className="relative">
                    <select
                      id="user-role"
                      value={form.role_id}
                      onChange={(event) =>
                        updateForm("role_id", event.target.value)
                      }
                      required
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    >
                      <option value="">Chọn vai trò</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {ROLE_MAP[role.name]?.label ||
                            role.description ||
                            role.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="user-phone"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Số điện thoại
                  </label>
                  <input
                    id="user-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      updateForm("phone", event.target.value)
                    }
                    placeholder="0901234567"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </div>

              {editUser && (
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) =>
                      updateForm("is_active", event.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">
                      Tài khoản đang hoạt động
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      Bỏ chọn để vô hiệu hóa tài khoản này.
                    </span>
                  </span>
                </label>
              )}

              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {formError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeUserModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <LoaderCircle size={17} className="animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Check size={17} />
                      {editUser ? "Lưu thay đổi" : "Tạo tài khoản"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showPasswordModal && selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePasswordModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-modal-title"
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-sm font-semibold text-amber-600">
                  Bảo mật tài khoản
                </p>
                <h2
                  id="password-modal-title"
                  className="mt-1 text-xl font-bold text-slate-900"
                >
                  Đặt lại mật khẩu
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Tài khoản: {selectedUser.full_name || selectedUser.username}
                </p>
              </div>
              <button
                type="button"
                onClick={closePasswordModal}
                disabled={resettingPassword}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-5 p-6">
              <div>
                <label
                  htmlFor="new-password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Mật khẩu mới
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Nhập mật khẩu mới"
                  minLength={6}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-50"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Mật khẩu cần có ít nhất 6 ký tự.
                </p>
              </div>

              {passwordError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {passwordError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  disabled={resettingPassword}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resettingPassword ? (
                    <>
                      <LoaderCircle size={17} className="animate-spin" />
                      Đang cập nhật...
                    </>
                  ) : (
                    <>
                      <KeyRound size={17} />
                      Đặt lại mật khẩu
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
