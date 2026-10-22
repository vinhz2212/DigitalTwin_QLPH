import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

let socket = null;
let socketToken = null;

const socketUrl =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000";

export const useSocket = (events = {}) => {
  const eventsRef = useRef(events);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return undefined;

    if (!socket || socketToken !== token) {
      if (socket) socket.disconnect();
      socketToken = token;
      socket = io(socketUrl, { auth: { token } });
    }

    const listeners = Object.keys(eventsRef.current).map((event) => {
      const listener = (...args) => eventsRef.current[event]?.(...args);
      socket.on(event, listener);
      return [event, listener];
    });

    return () => {
      listeners.forEach(([event, listener]) => {
        socket?.off(event, listener);
      });
    };
  }, []);

  return socket;
};

export const disconnectSocket = () => {
  if (socket) socket.disconnect();
  socket = null;
  socketToken = null;
};

export default useSocket;
