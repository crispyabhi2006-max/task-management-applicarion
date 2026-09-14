import React from 'react';
import { Clock, Loader2, CheckCircle2 } from 'lucide-react';
import { TaskStatus } from '../types.ts';

interface StatusBadgeProps {
  status: TaskStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  let badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
  let icon = <Clock className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;
  let label = status;

  if (status === 'In Progress') {
    badgeStyle = 'bg-sky-50 text-sky-700 border-sky-200';
    icon = <Loader2 className={`animate-spin ${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />;
  } else if (status === 'Completed') {
    badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    icon = <CheckCircle2 className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      id={`status-badge-${status.toLowerCase().replace(/\s+/g, '-')}`}
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border whitespace-nowrap ${badgeStyle} ${padding}`}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
};
