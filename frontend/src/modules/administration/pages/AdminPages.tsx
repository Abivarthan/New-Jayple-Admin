import React from 'react';
import { Users, UserCog, ScrollText, Activity } from 'lucide-react';

const mkPage = (icon: React.ReactNode, title: string, desc: string) => {
  const P: React.FC = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">{desc}</p>
      </div>
      <div className="p-8 bg-white rounded-2xl border border-gray-200 flex flex-col items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-slate-700 flex items-center justify-center">
          {icon}
        </div>
        <div className="text-center">
          <p className="text-gray-800 font-semibold">{title}</p>
          <p className="text-gray-500 text-sm mt-2">Full implementation coming soon.</p>
        </div>
      </div>
    </div>
  );
  P.displayName = title;
  return P;
};

const AdminUsers = mkPage(<Users className="h-8 w-8 text-gray-500" />, 'Admin Users', 'Create, deactivate, and manage admin accounts and their access.');
const RolesPermissions = mkPage(<UserCog className="h-8 w-8 text-gray-500" />, 'Roles & Permissions', 'Define roles and granular permission sets for each admin user.');
const AuditLog = mkPage(<ScrollText className="h-8 w-8 text-gray-500" />, 'Audit Log', 'Immutable write-only log of all admin actions across the platform.');
const ActivityLogs = mkPage(<Activity className="h-8 w-8 text-gray-500" />, 'Activity Logs', 'Chronological view of all admin session activity and page access.');

export { AdminUsers, RolesPermissions, AuditLog, ActivityLogs };
