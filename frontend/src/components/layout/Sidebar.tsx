import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { AdminPermission } from '../../../../shared/src/types';
import {
  LayoutDashboard,
  MapPin,
  Sliders,
  Image,
  LayoutTemplate,
  Store,
  Calendar,
  IndianRupee,
  Tag,
  Settings,
  BarChart3,
  Users,
  User,
  ShieldAlert,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: AdminPermission;
}

export const Sidebar: React.FC = () => {
  const { hasPermission, logout, adminProfile } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCmsOpen, setIsCmsOpen] = useState(false);

  const menuItems: SidebarItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Zones', path: '/zones', icon: MapPin, permission: 'zones' },
    { name: 'UI Config', path: '/ui-config', icon: Sliders, permission: 'uiconfig' },
    { name: 'Categories', path: '/categories', icon: Tag, permission: 'content' },
    { name: 'Image Library', path: '/image-library', icon: Image, permission: 'content' },
    { name: 'Home Content', path: '/home-content', icon: LayoutTemplate, permission: 'content' },
    { name: 'Vendors', path: '/vendors', icon: Store, permission: 'vendors' },
    { name: 'Customers', path: '/users', icon: User, permission: 'users' },
    { name: 'Bookings', path: '/bookings', icon: Calendar },
    { name: 'Settlements', path: '/settlements', icon: IndianRupee, permission: 'settlements' },
    { name: 'Promotions', path: '/promotions', icon: Tag, permission: 'content' },
    { name: 'Platform Config', path: '/platform-config', icon: Settings, permission: 'content' },
    { name: 'Analytics', path: '/analytics', icon: BarChart3, permission: 'analytics' },
    { name: 'Admin Users', path: '/admin-users', icon: Users, permission: 'admin-users' },
    { name: 'Audit Log', path: '/audit-log', icon: ShieldAlert, permission: 'audit' },
    { name: 'Waitlist', path: '/waitlist', icon: ClipboardList }
  ];

  const filteredItems = menuItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <aside
      className={`relative flex flex-col border-r border-slate-600 bg-slate-800 text-slate-100 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-600">
        {!isCollapsed && (
          <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            JAYPLE ADMIN
          </span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ml-auto rounded-md p-1.5 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Profile Summary */}
      {!isCollapsed && adminProfile && (
        <div className="p-4 border-b border-slate-600 bg-[#0f172a]/40">
          <p className="text-sm font-semibold truncate">{adminProfile.name}</p>
          <p className="text-xs text-slate-400 truncate capitalize mt-0.5">
            Role: {adminProfile.role}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-transparent'
              }`
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span>{item.name}</span>}
          </NavLink>
        ))}

        {/* CMS Submenu */}
        {hasPermission('content') && (
          <div className="pt-4 mt-4 border-t border-slate-600">
            <button
              onClick={() => !isCollapsed && setIsCmsOpen(!isCmsOpen)}
              className="flex items-center w-full gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all"
            >
              <LayoutDashboard className="h-5 w-5 shrink-0" />
              {!isCollapsed && (
                <div className="flex flex-1 items-center justify-between">
                  <span>Content (CMS)</span>
                  <ChevronRight className={`h-4 w-4 transition-transform ${isCmsOpen ? 'rotate-90' : ''}`} />
                </div>
              )}
            </button>
            
            {!isCollapsed && isCmsOpen && (
              <div className="pl-11 pr-3 py-2 space-y-1">
                {[
                  { name: 'Hero Banners', path: '/content/hero-banners' },
                  { name: 'Promotions', path: '/content/promotions' },
                  { name: 'Referral Banner', path: '/content/referral-banner' },
                  { name: 'Cashback Banner', path: '/content/cashback-banner' },
                  { name: 'Static Pages', path: '/content/static-pages' },
                  { name: 'FAQs', path: '/content/faqs' },
                  { name: 'Announcements', path: '/content/announcements' },
                  { name: 'CMS Settings', path: '/content/settings' }
                ].map(sub => (
                  <NavLink
                    key={sub.path}
                    to={sub.path}
                    className={({ isActive }) =>
                      `block py-2 text-sm transition-colors ${
                        isActive ? 'text-violet-400 font-medium' : 'text-slate-500 hover:text-slate-300'
                      }`
                    }
                  >
                    {sub.name}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Footer / Logout */}
      <div className="p-3 border-t border-slate-600 bg-[#0f172a]/20">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition-all border border-transparent hover:border-rose-900/30"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};
