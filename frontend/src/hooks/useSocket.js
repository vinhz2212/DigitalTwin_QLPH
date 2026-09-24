import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

let socket = null;

export const useSocket = (events = {}) => {
  const eventsRef = useRef(events);

  useEffect(() => {
    // Kết nối socket
    if (!socket) {
      socket = io("http://localhost:5000");
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
