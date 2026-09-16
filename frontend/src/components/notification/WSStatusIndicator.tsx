"use client";

import { useState } from "react";
import { useWSEvent } from "@/hooks/useWebSocket";
import { Wifi, WifiOff } from "lucide-react";
import type { WSConnectionEvent } from "@/types";

export default function WSStatusIndicator() {
  const [status, setStatus] = useState<WSConnectionEvent["status"]>("disconnected");

  useWSEvent<WSConnectionEvent>("connection", (data) => {
    setStatus(data.status);
  });

  if (status === "connected") {
    return (
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-full
                       bg-green-50 border border-green-200"
        title="Real-time terkoneksi"
      >
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        <span className="text-[10px] font-medium text-green-600">Live</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-full
                     bg-gray-100 border border-gray-200"
      title="Menghubungkan..."
    >
      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
      <span className="text-[10px] font-medium text-gray-400">Offline</span>
    </div>
  );
}
