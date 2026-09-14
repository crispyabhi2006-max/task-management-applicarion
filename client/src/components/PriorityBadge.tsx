import React from 'react';
import { ArrowDown, Minus, ArrowUp } from 'lucide-react';
import { TaskPriority } from '../types.ts';

interface PriorityBadgeProps {
  priority: TaskPriority | string;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
  let icon = <Minus className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;

  if (priority === 'High') {
    badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
    icon = <ArrowUp className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;
  } else if (priority === 'Medium') {
    badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
    icon = <Minus className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;
  } else if (priority === 'Low') {
    badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    icon = <ArrowDown className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      id={`priority-badge-${priority.toLowerCase()}`}
      className={`inline-flex items-center gap-1 font-medium rounded-full border whitespace-nowrap ${badgeStyle} ${padding}`}
    >
      {icon}
      <span>{priority}</span>
    </span>
  );
};
