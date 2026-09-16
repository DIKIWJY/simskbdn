import type { WSEventName, WSConnectionEvent, WSMessage } from "@/types";

type WSCallback = (data: unknown) => void;

/**
 * WebSocket connection manager — Singleton dengan Exponential Backoff & Heartbeat.
 * Hanya berjalan di browser (tidak di-instantiate saat SSR).
 */
class WSManager {
  private ws: WebSocket | null = null;
  private readonly listeners: Map<string, Set<WSCallback>> = new Map();
  private reconnectAttempts = 0;
  private readonly maxReconnect = 10;
  private reconnectDelay = 2_000;
  private isConnecting = false;
  private shouldReconnect = true;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private currentToken: string | null = null;

  connect(token: string): void {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) return;
    if (!token) return;

    this.isConnecting = true;
    this.shouldReconnect = true;
    this.currentToken = token;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.hostname;
    const port = "8080";
    const url = `${protocol}://${host}:${port}/ws?token=${token}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log("🔌 WebSocket terkoneksi");
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 2_000;
        this._emit("connection", { status: "connected" } satisfies WSConnectionEvent);

        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30_000);
      };

      this.ws.onmessage = (event: MessageEvent<string>) => {
        try {
          const data = JSON.parse(event.data) as WSMessage;
          if (data.event) this._emit(data.event, data.payload);
          this._emit("any", data);
        } catch (err) {
          console.error("Gagal membaca payload WS:", err);
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        console.log("🔌 WebSocket terputus. Code:", event.code);
        this.isConnecting = false;
        this._cleanup();
        this._emit("connection", { status: "disconnected" } satisfies WSConnectionEvent);

        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnect) {
          this.reconnectAttempts++;
          const delay = Math.min(
            this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1),
            30_000,
          );
          setTimeout(() => {
            if (this.currentToken) this.connect(this.currentToken);
          }, delay);
        }
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
      };
    } catch (e) {
      console.error("Gagal membuat WebSocket:", e);
      this.isConnecting = false;
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this._cleanup();
    if (this.ws) {
      this.ws.close(1000, "User disconnected");
      this.ws = null;
    }
    this.currentToken = null;
  }

  on(event: WSEventName, callback: WSCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private _emit(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error("Error di WS listener:", err);
        }
      });
    }
  }

  private _cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton — diexport dan juga ditempel ke window agar Sidebar bisa disconnect saat logout
const wsManager = new WSManager();

// Declare window extension untuk logout handler
declare global {
  interface Window {
    __wsManager?: WSManager;
  }
}

if (typeof window !== "undefined") {
  window.__wsManager = wsManager;
}

export default wsManager;
