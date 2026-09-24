import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import MainLayout from "./layouts/MainLayout";
import Login from "./pages/auth/Login";
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
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="twin" element={<Twin />} />
        <Route path="rooms" element={<Rooms />} />
        <Route path="devices" element={<Devices />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="schedules" element={<Schedules />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="users" element={<Users />} />
        <Route path="simulation" element={<Simulation />} />
        <Route path="sensors" element={<Sensors />} />
        <Route path="energy" element={<Energy />} />
        <Route path="reports" element={<Reports />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="logs" element={<Logs />} />
        <Route path="ai" element={<AIAssistant />} />
        <Route path="settings" element={<Settings />} />
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
