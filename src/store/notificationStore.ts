import { create } from "zustand";
import type { AppNotification } from "@/types/models";

function localId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface NotificationState {
  items: AppNotification[];
  pushLocal: (n: Omit<AppNotification, "id" | "read" | "createdAt" | "userId"> & { userId?: string }) => void;
  markRead: (id: string) => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],

  pushLocal: (n) => {
    const item: AppNotification = {
      id: localId(),
      userId: n.userId ?? "local",
      title: n.title,
      body: n.body,
      type: n.type,
      read: false,
      createdAt: Date.now(),
      data: n.data,
    };
    set({ items: [item, ...get().items].slice(0, 100) });
  },

  markRead: (id) => {
    set({
      items: get().items.map((i) => (i.id === id ? { ...i, read: true } : i)),
    });
  },

  clear: () => set({ items: [] }),
}));
