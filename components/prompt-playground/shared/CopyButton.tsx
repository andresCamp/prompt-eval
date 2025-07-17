/**
 * @fileoverview Reusable copy button component with visual feedback
 */

import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { CopyButtonProps } from './types';

/**
 * Reusable copy button component with checkmark feedback
 * Shows a checkmark for 3 seconds after successful copy
 */
export function CopyButton({
  text,
  buttonId,
  copiedStates,
  onCopy,
  disabled = false,
  variant = 'ghost',
  size = 'sm',
  className = ''
}: CopyButtonProps) {
  const isCopied = copiedStates[buttonId];
  
  return (
    <Button
      variant={variant}
      size={size}
      onClick={(e) => {
        e.stopPropagation();
        onCopy(text, buttonId);
      }}
      className={`h-8 w-8 p-0 cursor-pointer hover:bg-muted hover:scale-105 transition-all disabled:hover:scale-100 disabled:hover:bg-transparent ${className}`}
      disabled={disabled}
    >
      {isCopied ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
} 