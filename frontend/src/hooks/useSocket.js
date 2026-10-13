import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

let socket = null;

const socketUrl =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000";

export const useSocket = (events = {}) => {
  const eventsRef = useRef(events);

  useEffect(() => {
    // Kết nối socket
    if (!socket) {
      socket = io(socketUrl);
      console.log("✅ Socket.IO đã kết nối");
    }

    // Đăng ký các sự kiện
    Object.entries(eventsRef.current).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      // Hủy đăng ký khi component unmount
      Object.entries(eventsRef.current).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, []);

  return socket;
};

export default useSocket;
