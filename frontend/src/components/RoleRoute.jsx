import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RoleRoute({ children, roles }) {
  const { user } = useAuth();

  if (!roles.includes(user?.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h2 className="text-2xl font-black text-gray-700 mb-2">
          Không có quyền truy cập
        </h2>
        <p className="text-gray-400 text-sm">
          Bạn không có quyền xem trang này
        </p>
      </div>
    );
  }

  return children;
}
