import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";
import { disconnectSocket } from "../hooks/useSocket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      if (!token) {
        localStorage.removeItem("user");
        setLoading(false);
        return;
      }

      try {
        // Luôn lấy vai trò mới nhất từ server, không tin dữ liệu localStorage.
        const response = await api.get("/auth/me");
        localStorage.setItem("user", JSON.stringify(response.data));
        setUser(response.data);
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        } else if (savedUser) {
          // Mất kết nối tạm thời không tự đăng xuất người dùng. Backend vẫn
          // kiểm tra token và vai trò thật trên mọi API cần xác thực.
          try {
            setUser(JSON.parse(savedUser));
          } catch {
            localStorage.removeItem("user");
            setUser(null);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = (userData, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    const token = localStorage.getItem("token");
    const logoutRequest = token
      ? api
          .post("/auth/logout", null, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch((error) => {
            console.error("Không thể ghi nhận đăng xuất:", error);
          })
      : Promise.resolve();
    disconnectSocket();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("ai_messages");
    sessionStorage.removeItem("ai_workspace_state");
    setUser(null);
    return logoutRequest;
  };

  // Cập nhật thông tin user sau khi đổi profile
  const updateUser = (newData) => {
    const updated = { ...user, ...newData };
    localStorage.setItem("user", JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
