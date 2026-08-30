import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";

const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:4000";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = io(WS_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, []);

  const joinDoctorRoom = useCallback((doctorId: string) => {
    socketRef.current?.emit("join:doctor-room", doctorId);
  }, []);

  const joinPatientRoom = useCallback((patientId: string) => {
    socketRef.current?.emit("join:patient-room", patientId);
  }, []);

  const joinQueueRoom = useCallback((doctorId: string) => {
    socketRef.current?.emit("join:queue-room", doctorId);
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    const socket = socketRef.current;
    socket?.on(event, handler);
    const cleanup = () => { socket?.off(event, handler); };
    return cleanup;
  }, []);

  return { socket: socketRef.current, connected, joinDoctorRoom, joinPatientRoom, joinQueueRoom, on };
}
