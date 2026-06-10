import * as React from 'react';
import { cn } from '@/lib/utils';

type CardColor = 'amber' | 'green' | 'blue' | 'red' | 'purple';

const colorMap: Record<CardColor, { bg: string; icon: string }> = {
  amber: { bg: 'bg-amber-100', icon: 'text-amber-600' },
  green: { bg: 'bg-green-100', icon: 'text-green-600' },
  blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
  red: { bg: 'bg-red-100', icon: 'text-red-600' },
  purple: { bg: 'bg-purple-100', icon: 'text-purple-600' },
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: CardColor;
  subtitle?: string;
  loading?: boolean;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  icon,
  color = 'amber',
  subtitle,
  loading,
  onClick,
}: StatCardProps) {
  const { bg, icon: iconColor } = colorMap[color];

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 shadow-sm p-6',
        'flex items-center justify-between',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow'
      )}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
        {loading ? (
          <div className="mt-1 h-8 w-32 animate-pulse bg-gray-200 rounded" />
        ) : (
          <p className="mt-1 text-2xl font-bold text-gray-900 truncate">{value}</p>
        )}
        {subtitle && <p className="mt-1 text-xs text-gray-400 truncate">{subtitle}</p>}
      </div>
      <div className={cn('ml-4 shrink-0 rounded-xl p-3', bg)}>
        <div className={cn('h-6 w-6', iconColor)}>{icon}</div>
      </div>
    </div>
  );
}
