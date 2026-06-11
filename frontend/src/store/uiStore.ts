import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── UI Store ──────────────────────────────────────────────────────────────────
// Manages sidebar collapse state, expanded groups, and global UI preferences.
// Persisted to localStorage so state survives page reloads.

interface UIStore {
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;

  // Expanded nav groups (by group id)
  expandedGroups: string[];
  toggleGroup: (id: string) => void;
  expandGroup: (id: string) => void;
  collapseGroup: (id: string) => void;
  collapseAllGroups: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      expandedGroups: ['dashboard'],
      toggleGroup: (id) =>
        set((s) => ({
          expandedGroups: s.expandedGroups.includes(id)
            ? s.expandedGroups.filter((g) => g !== id)
            : [...s.expandedGroups, id],
        })),
      expandGroup: (id) =>
        set((s) => ({
          expandedGroups: s.expandedGroups.includes(id)
            ? s.expandedGroups
            : [...s.expandedGroups, id],
        })),
      collapseGroup: (id) =>
        set((s) => ({ expandedGroups: s.expandedGroups.filter((g) => g !== id) })),
      collapseAllGroups: () => set({ expandedGroups: [] }),
    }),
    {
      name: 'jayple-admin-ui',
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        expandedGroups: s.expandedGroups,
      }),
    },
  ),
);
