import { create } from "zustand";
import type { StoreNotification, ApiNotification, DocumentStatus } from "@/types";

interface NotificationState {
  notifications: StoreNotification[];
  unreadCount: number;
}

interface NotificationActions {
  addNotification: (notif: ApiNotification) => void;
  loadFromDB: (notifs: ApiNotification[]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

type NotificationStore = NotificationState & NotificationActions;

const MAX_NOTIFICATIONS = 50;

function normalize(notif: ApiNotification): StoreNotification {
  return {
    id: notif.id ?? `ws_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title:      notif.title,
    message:    notif.message,
    documentId: notif.document_id,
    status:     notif.status as DocumentStatus | undefined,
    actorName:  notif.actor_name,
    actorRole:  notif.actor_role,
    createdAt:  notif.created_at ?? new Date().toISOString(),
    isRead:     notif.is_read ?? false,
  };
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notif: ApiNotification) => {
    set((state) => {
      const n = normalize(notif);
      if (state.notifications.some((e) => e.id === n.id)) return state;
      const newNotifs = [n, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
      return { notifications: newNotifs, unreadCount: newNotifs.filter((x) => !x.isRead).length };
    });
  },

  loadFromDB: (notifs: ApiNotification[]) => {
    set(() => {
      const normalized = notifs.map(normalize);
      return {
        notifications: normalized.slice(0, MAX_NOTIFICATIONS),
        unreadCount: normalized.filter((n) => !n.isRead).length,
      };
    });
  },

  markAsRead: (id: string) => {
    set((state) => {
      const updated = state.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n);
      return { notifications: updated, unreadCount: updated.filter((n) => !n.isRead).length };
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
