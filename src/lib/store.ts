import { create } from "zustand";

export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "EMPLOYEE"
  | "CUSTOMER"
  | "SALES_HEAD"
  | "REGIONAL_SALES_MANAGER"
  | "BRANCH_MANAGER"
  | "SALES_MANAGER"
  | "SALES_EXECUTIVE"
  | "REGIONAL_OFFICER"
  | "BRANCH_USER"
  | "VIEWER"
  | "REGIONAL_MANAGER"
  | "INVENTORY_MANAGER"
  | "PURCHASE_MANAGER"
  | "LOGISTICS_MANAGER"
  | "ACCOUNTS_MANAGER";

export interface UserDetails {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branch: string;
  status: string; // ACTIVE, PENDING, REJECTED
}

interface ErpStore {
  activeRole: UserRole;
  activeUser: UserDetails | null;
  isAuthenticated: boolean;
  loginSession: (user: UserDetails) => void;
  logoutSession: () => void;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;
  notifications: Array<{ id: string; title: string; message: string; time: string; read: boolean }>;
  addNotification: (title: string, message: string) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  // Admin region filter: "ALL" or a branch code like "HYD", "BLR", etc.
  adminRegionFilter: string;
  setAdminRegionFilter: (region: string) => void;
}

export const useErpStore = create<ErpStore>((set) => ({
  activeRole: "CUSTOMER",
  activeUser: null,
  isAuthenticated: false,
  loginSession: (user) => set({
    activeUser: user,
    activeRole: user.role,
    isAuthenticated: true
  }),
  logoutSession: () => set({
    activeUser: null,
    activeRole: "CUSTOMER",
    isAuthenticated: false
  }),
  theme: "light",
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  globalSearchQuery: "",
  setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),
  notifications: [
    { id: "1", title: "New user registration", message: "A new sales account needs admin approval.", time: "5 mins ago", read: false },
    { id: "2", title: "Low Stock Alert", message: "APP-IP15PM-001 stock in HYD branch is low (8 left).", time: "1 hour ago", read: false },
  ],
  addNotification: (title, message) => set((state) => ({
    notifications: [
      { id: Date.now().toString(), title, message, time: "Just now", read: false },
      ...state.notifications
    ]
  })),
  markNotificationAsRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
  })),
  markAllNotificationsAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true }))
  })),
  adminRegionFilter: "ALL",
  setAdminRegionFilter: (region) => set({ adminRegionFilter: region }),
}));
