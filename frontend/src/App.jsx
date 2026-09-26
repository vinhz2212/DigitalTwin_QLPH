import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import MainLayout from "./layouts/MainLayout";
import RoleRoute from "./components/RoleRoute";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/dashboard/Dashboard";
import Rooms from "./pages/rooms/Rooms";
import Devices from "./pages/devices/Devices";
import Incidents from "./pages/incidents/Incidents";
import Schedules from "./pages/schedules/Schedules";
import Users from "./pages/users/Users";
import AIAssistant from "./pages/ai/AI";
import Simulation from "./pages/simulation/Simulation";
import Twin from "./pages/twin/Twin";
import Statistics from "./pages/statistics/Statistics";
import Logs from "./pages/logs/Logs";
import Bookings from "./pages/bookings/Bookings";
import Sensors from "./pages/sensors/Sensors";
import Notifications from "./pages/notifications/Notifications";
import Energy from "./pages/energy/Energy";
import Settings from "./pages/settings/Settings";
import Reports from "./pages/reports/Reports";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        Đang tải...
      </div>
    );
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" />} />

        {/* Tất cả vai trò */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="twin" element={<Twin />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="ai" element={<AIAssistant />} />
        <Route path="settings" element={<Settings />} />
        <Route path="statistics" element={<Statistics />} />

        {/* Phòng học - tất cả xem được */}
        <Route path="rooms" element={<Rooms />} />

        {/* Lịch học - Admin + Giảng viên */}
        <Route
          path="schedules"
          element={
            <RoleRoute roles={["admin", "giang_vien"]}>
              <Schedules />
            </RoleRoute>
          }
        />

        {/* Đặt phòng - Admin + Giảng viên */}
        <Route
          path="bookings"
          element={
            <RoleRoute roles={["admin", "giang_vien"]}>
              <Bookings />
            </RoleRoute>
          }
        />

        {/* Thiết bị - Admin + Kỹ thuật viên */}
        <Route
          path="devices"
          element={
            <RoleRoute roles={["admin", "ky_thuat_vien"]}>
              <Devices />
            </RoleRoute>
          }
        />

        {/* Sự cố & Bảo trì - Admin + Kỹ thuật viên */}
        <Route
          path="incidents"
          element={
            <RoleRoute roles={["admin", "ky_thuat_vien"]}>
              <Incidents />
            </RoleRoute>
          }
        />

        {/* Mô phỏng - Admin + Kỹ thuật viên */}
        <Route
          path="simulation"
          element={
            <RoleRoute roles={["admin", "ky_thuat_vien"]}>
              <Simulation />
            </RoleRoute>
          }
        />

        {/* Cảm biến - Admin + Kỹ thuật viên */}
        <Route
          path="sensors"
          element={
            <RoleRoute roles={["admin", "ky_thuat_vien"]}>
              <Sensors />
            </RoleRoute>
          }
        />

        {/* Điện năng - Admin + Kỹ thuật viên */}
        <Route
          path="energy"
          element={
            <RoleRoute roles={["admin", "ky_thuat_vien"]}>
              <Energy />
            </RoleRoute>
          }
        />

        {/* Nhật ký - Admin + Kỹ thuật viên */}
        <Route
          path="logs"
          element={
            <RoleRoute roles={["admin", "ky_thuat_vien"]}>
              <Logs />
            </RoleRoute>
          }
        />

        {/* Báo cáo - Admin + Kỹ thuật viên */}
        <Route
          path="reports"
          element={
            <RoleRoute roles={["admin", "ky_thuat_vien"]}>
              <Reports />
            </RoleRoute>
          }
        />

        {/* Người dùng - chỉ Admin */}
        <Route
          path="users"
          element={
            <RoleRoute roles={["admin"]}>
              <Users />
            </RoleRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
