'use client';

import { Lock, Unlock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SnapshotState } from '@/lib/types/snapshot';

interface SnapshotIndicatorProps {
  state: SnapshotState;
  changeCount?: number;
  className?: string;
  showLabel?: boolean;
}

export function SnapshotIndicator({
  state,
  changeCount = 0,
  className,
  showLabel = true,
}: SnapshotIndicatorProps) {
  const getStateConfig = () => {
    switch (state) {
      case 'unlocked':
        return {
          icon: Unlock,
          label: 'Unlocked',
          variant: 'secondary' as const,
          color: 'text-gray-500',
        };
      case 'locked':
        return {
          icon: Lock,
          label: 'Locked',
          variant: 'default' as const,
          color: 'text-blue-600',
        };
      case 'modified':
        return {
          icon: AlertTriangle,
          label: `Modified (${changeCount} changes)`,
          variant: 'destructive' as const,
          color: 'text-amber-600',
        };
      case 'error':
        return {
          icon: AlertTriangle,
          label: 'Error',
          variant: 'destructive' as const,
          color: 'text-red-600',
        };
      default:
        return {
          icon: CheckCircle,
          label: 'Unknown',
          variant: 'outline' as const,
          color: 'text-gray-400',
        };
    }
  };

  const config = getStateConfig();
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'flex items-center gap-1.5 px-2 py-0.5',
        config.color,
        className
      )}
    >
      <Icon size={12} />
      {showLabel && (
        <span className="text-xs font-medium">{config.label}</span>
      )}
    </Badge>
  );
}