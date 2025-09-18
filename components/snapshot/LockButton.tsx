'use client';

import { Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface LockButtonProps {
  isLocked: boolean;
  hasChanges?: boolean;
  onLock: () => void;
  onUnlock: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  className?: string;
  disabled?: boolean;
  showTooltip?: boolean;
}

export function LockButton({
  isLocked,
  hasChanges = false,
  onLock,
  onUnlock,
  size = 'sm',
  variant = 'ghost',
  className,
  disabled = false,
  showTooltip = true,
}: LockButtonProps) {
  const handleClick = () => {
    if (isLocked) {
      onUnlock();
    } else {
      onLock();
    }
  };

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-10 w-10',
  };

  const iconSize = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  const button = (
    <Button
      onClick={handleClick}
      variant={variant}
      size="icon"
      disabled={disabled}
      className={cn(
        sizeClasses[size],
        'relative transition-all',
        isLocked && 'text-blue-600 hover:text-blue-700',
        hasChanges && 'ring-2 ring-amber-500 ring-offset-1',
        className
      )}
    >
      {isLocked ? (
        <Lock size={iconSize[size]} />
      ) : (
        <Unlock size={iconSize[size]} />
      )}
      {hasChanges && (
        <span className="absolute -top-1 -right-1 h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
      )}
    </Button>
  );

  if (!showTooltip) {
    return button;
  }

  const tooltipContent = () => {
    if (hasChanges) {
      return 'Content has changed since snapshot was created';
    }
    if (isLocked) {
      return 'Click to unlock and remove snapshot';
    }
    return 'Click to lock and create snapshot';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {button}
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}