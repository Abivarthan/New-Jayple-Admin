import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUIStore } from '../../store/uiStore';
import { navigationConfig } from '../../router/navigationConfig';
import type { NavGroup, NavChild } from '../../router/navigationConfig';
import {
  LayoutDashboard,
  Users,
  Store,
  Calendar,
  Tag,
  LayoutTemplate,
  Percent,
  IndianRupee,
  ShieldAlert,
  BarChart3,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
} from 'lucide-react';

type LucideIcon = React.ElementType;

// ── Icon map ──────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Store,
  Calendar,
  Tag,
  LayoutTemplate,
  Percent,
  IndianRupee,
  ShieldAlert,
  BarChart3,
  Settings,
  Shield,
};

// ── Sub-item ──────────────────────────────────────────────────────────────────
const SidebarChild: React.FC<{ child: NavChild; collapsed: boolean }> = ({ child, collapsed }) => {
  if (child.disabled) {
    return (
      <span
        title={collapsed ? child.title : undefined}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-600 cursor-not-allowed select-none"
      >
        <span className="h-1 w-1 rounded-full bg-slate-700 shrink-0" />
        {!collapsed && (
          <span className="flex items-center gap-2">
            {child.title}
            <span className="text-[10px] text-slate-700 bg-slate-800 px-1.5 py-0.5 rounded">SOON</span>
          </span>
        )}
      </span>
    );
  }

  return (
    <NavLink
      to={child.path}
      title={collapsed ? child.title : undefined}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150 ${
          isActive
            ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
            : 'text-slate-400 hover:bg-slate-700/60 hover:text-slate-200 border border-transparent'
        }`
      }
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0 opacity-60" />
      {!collapsed && (
        <span className="flex items-center gap-2">
          {child.title}
          {child.badge && (
            <span className="text-[9px] font-bold text-violet-300 bg-violet-900/50 px-1.5 py-0.5 rounded-full border border-violet-700/50">
              {child.badge}
            </span>
          )}
        </span>
      )}
    </NavLink>
  );
};

// ── Group item ────────────────────────────────────────────────────────────────
const SidebarGroup: React.FC<{
  group: NavGroup;
  collapsed: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ group, collapsed, isExpanded, onToggle }) => {
  const Icon = ICON_MAP[group.icon] ?? LayoutDashboard;
  const location = useLocation();

  const isGroupActive = group.children.some(
    (c) => !c.disabled && location.pathname.startsWith(c.path.replace('/:id', '')),
  );

  return (
    <div className="mb-0.5">
      <button
        onClick={onToggle}
        title={collapsed ? group.title : undefined}
        className={`flex items-center w-full gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 group ${
          isGroupActive
            ? 'bg-violet-600/15 text-violet-300'
            : 'text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
        }`}
      >
        <Icon
          className={`h-[18px] w-[18px] shrink-0 transition-colors ${
            isGroupActive ? 'text-violet-400' : 'text-slate-500 group-hover:text-slate-300'
          }`}
        />
        {!collapsed && (
          <>
            <span className="flex-1 text-left truncate">{group.title}</span>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              } ${isGroupActive ? 'text-violet-400' : 'text-slate-600'}`}
            />
          </>
        )}
      </button>

      {/* Children — only shown when expanded and not collapsed */}
      {!collapsed && isExpanded && (
        <div className="pl-4 pr-1 pb-1 mt-0.5 space-y-0.5 border-l border-slate-700/60 ml-[22px]">
          {group.children.map((child) => (
            <SidebarChild key={child.path} child={child} collapsed={false} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Sidebar ──────────────────────────────────────────────────────────────
export const Sidebar: React.FC = () => {
  const { hasPermission, logout, adminProfile } = useAuth();
  const { sidebarCollapsed, toggleSidebar, expandedGroups, toggleGroup, expandGroup } = useUIStore();
  const location = useLocation();

  // Auto-expand the group containing the active route
  useEffect(() => {
    const active = navigationConfig.find((group) =>
      group.children.some(
        (c) => !c.disabled && location.pathname.startsWith(c.path.replace('/:id', '')),
      ),
    );
    if (active) expandGroup(active.id);
  }, [location.pathname, expandGroup]);

  // Filter groups by permission
  const visibleGroups = navigationConfig.filter(
    (group) => !group.permission || hasPermission(group.permission),
  );

  return (
    <aside
      className={`relative flex flex-col border-r border-slate-700/60 bg-[#0c1524] text-slate-100 transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'w-[68px]' : 'w-64'
      }`}
    >
      {/* ── Header ── */}
      <div className="flex h-16 items-center justify-between px-3 border-b border-slate-700/60 shrink-0">
        {!sidebarCollapsed && (
          <span className="text-[15px] font-bold tracking-wider bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent select-none">
            JAYPLE ADMIN
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className={`${sidebarCollapsed ? 'mx-auto' : 'ml-auto'} rounded-lg p-1.5 hover:bg-slate-700/60 text-slate-500 hover:text-slate-200 transition-colors`}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* ── Profile ── */}
      {!sidebarCollapsed && adminProfile && (
        <div className="px-4 py-3 border-b border-slate-700/60 bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {adminProfile.name?.charAt(0)?.toUpperCase() ?? 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-200 truncate">{adminProfile.name}</p>
              <p className="text-[11px] text-slate-500 capitalize mt-0.5 truncate">
                {adminProfile.role.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
        {visibleGroups.map((group) => {
          // Single-child groups (e.g. Dashboard) render differently — no expand toggle
          if (group.children.length === 1 && !group.children[0].disabled) {
            const Icon = ICON_MAP[group.icon] ?? LayoutDashboard;
            const child = group.children[0];
            return (
              <NavLink
                key={group.id}
                to={child.path}
                title={sidebarCollapsed ? group.title : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                      : 'text-slate-400 hover:bg-slate-700/60 hover:text-slate-200 border border-transparent'
                  }`
                }
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!sidebarCollapsed && <span>{group.title}</span>}
              </NavLink>
            );
          }

          return (
            <SidebarGroup
              key={group.id}
              group={group}
              collapsed={sidebarCollapsed}
              isExpanded={expandedGroups.includes(group.id)}
              onToggle={() => !sidebarCollapsed && toggleGroup(group.id)}
            />
          );
        })}
      </nav>

      {/* ── Footer / Logout ── */}
      <div className="p-2 border-t border-slate-700/60 bg-[#0c1524] shrink-0">
        <button
          onClick={logout}
          title={sidebarCollapsed ? 'Logout' : undefined}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-all border border-transparent hover:border-rose-900/30"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};
