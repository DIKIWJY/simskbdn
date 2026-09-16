"use client";

import { useEffect, useRef, useState } from "react";
import wsManager from "@/api/websocket";
import type { WSEventName } from "@/types";

/**
 * Hook 1: Inisialisasi koneksi WebSocket di DashboardLayout.
 * Aman dari double-mount React StrictMode.
 */
export function useWebSocketConnect(): void {
  const [token, setToken] = useState<string | null>(null);
  const isConnectingRef = useRef(false);

  useEffect(() => {
    setToken(
      localStorage.getItem("access_token") ??
        localStorage.getItem("token"),
    );
  }, []);

  useEffect(() => {
    if (!token || wsManager.isConnected || isConnectingRef.current) return;

    isConnectingRef.current = true;

    const delayConnect = setTimeout(() => {
      if (!wsManager.isConnected) {
        wsManager.connect(token);
      }
      isConnectingRef.current = false;
    }, 150);

    return () => {
      clearTimeout(delayConnect);
      isConnectingRef.current = false;
    };
  }, [token]);
}

/**
 * Hook 2: Dengarkan event spesifik dari WebSocket.
 */
export function useWSEvent<T = unknown>(
  eventName: WSEventName,
  callback: (data: T) => void,
): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!eventName) return;
    const unsubscribe = wsManager.on(eventName, (data) => {
      callbackRef.current(data as T);
    });
    return () => {
      unsubscribe();
    };
  }, [eventName]);
}
