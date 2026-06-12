import React from 'react';
import clsx from 'clsx';

type StatusType = 'confirmed' | 'pending' | 'cancelled' | 'rescheduled' | 'rejected' | string;

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className }) => {
  const normStatus = status.toLowerCase();
  let colorClasses = 'bg-gray-100 text-gray-800 border-gray-200'; // Default / Rejected

  if (normStatus.includes('confirm') || normStatus === 'active') {
    colorClasses = 'bg-green-100 text-green-800 border-green-200';
  } else if (normStatus.includes('pend') || normStatus === 'no_answer') {
    colorClasses = 'bg-orange-100 text-orange-800 border-orange-200';
  } else if (normStatus.includes('cancel')) {
    colorClasses = 'bg-red-100 text-red-800 border-red-200';
  } else if (normStatus.includes('reschedule')) {
    colorClasses = 'bg-blue-100 text-blue-800 border-blue-200';
  }

  const displayText = label || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <span className={clsx(`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colorClasses}`, className)}>
      {displayText}
    </span>
  );
};
