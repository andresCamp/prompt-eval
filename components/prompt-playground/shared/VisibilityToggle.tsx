/**
 * @fileoverview VisibilityToggle - Eye/EyeOff icon toggle for controlling thread visibility
 * 
 * This component provides a visual toggle to control whether threads are "in the flow"
 * (included in execution) or hidden from execution.
 */

'use client';

import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

interface VisibilityToggleProps {
  visible: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon" | null | undefined;
}

/**
 * VisibilityToggle component
 * Shows Eye icon when visible=true, EyeOff icon when visible=false
 */
export function VisibilityToggle({
  visible,
  onToggle,
  disabled = false,
  className = '',
  size = 'sm'
}: VisibilityToggleProps) {
  return (
    <Button
      variant="ghost"
      size={size}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`h-8 w-8 p-0 cursor-pointer hover:bg-muted hover:scale-105 transition-all disabled:hover:scale-100 disabled:hover:bg-transparent ${className}`}
      disabled={disabled}
      title={visible ? 'Hide from execution flow' : 'Include in execution flow'}
    >
      {visible ? (
        <Eye className="h-4 w-4 text-blue-600" />
      ) : (
        <EyeOff className="h-4 w-4 text-gray-400" />
      )}
    </Button>
  );
} 