/**
 * @fileoverview Standalone Copy Button Component
 * Self-contained copy button with internal state management
 * Shows copy icon that transitions to checkmark on successful copy
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

interface StandaloneCopyButtonProps {
  value: string;
  onCopy?: () => void; // Optional callback after successful copy
  className?: string;
  disabled?: boolean;
}

export function StandaloneCopyButton({
  value,
  onCopy,
  className,
  disabled
}: StandaloneCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopy?.();
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      disabled={disabled}
      className={`flex-shrink-0 ${className || ''}`}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}
