import { create } from "zustand";
import type { StoreNotification, ApiNotification, DocumentStatus } from "@/types";

// ─── State ────────────────────────────────────────────────────────────────────

interface NotificationState {
  notifications: StoreNotification[];
  unreadCount: number;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

interface NotificationActions {
  addNotification: (notif: ApiNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

type NotificationStore = NotificationState & NotificationActions;

const MAX_NOTIFICATIONS = 50;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useNotificationStore = create<NotificationStore>((set) => ({
  // State
  notifications: [],
  unreadCount: 0,

  // Actions
  addNotification: (notif: ApiNotification) => {
    set((state) => {
      const normalized: StoreNotification = {
        id:
          notif.id ??
          `ws_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title: notif.title,
        message: notif.message,
        documentId: notif.document_id,
        status: notif.status as DocumentStatus | undefined,
        actorName: notif.actor_name,
        actorRole: notif.actor_role,
        createdAt: notif.created_at ?? new Date().toISOString(),
        isRead: false,
      };

      const newNotifs = [normalized, ...state.notifications].slice(
        0,
        MAX_NOTIFICATIONS,
      );

      return {
        notifications: newNotifs,
        unreadCount: newNotifs.filter((n) => !n.isRead).length,
      };
    });
  },

  markAsRead: (id: string) => {
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n,
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.isRead).length,
      };
    });
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },

  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));
