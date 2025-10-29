/**
 * @fileoverview Copyable Input Components
 * Input and Textarea components with clear and copy buttons
 */

'use client';

import { forwardRef, useRef, useImperativeHandle } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { StandaloneCopyButton } from './StandaloneCopyButton';

interface CopyableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onClear?: () => void;
}

interface CopyableTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onClear?: () => void;
}

export const CopyableInput = forwardRef<HTMLInputElement, CopyableInputProps>(
  ({ value, onClear, className, ...props }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    // Expose the input ref to parent components
    useImperativeHandle(ref, () => inputRef.current!);

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onClear?.();
      // Return focus to input after clearing
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    };

    return (
      <div className="relative flex items-center group">
        <Input
          ref={inputRef}
          value={value}
          className={className}
          {...props}
        />
        {value && (
          <div className="absolute right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150">
            {onClear && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="h-7 w-7 flex-shrink-0 bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm"
                title="Clear"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            <StandaloneCopyButton value={value} className="h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm" />
          </div>
        )}
      </div>
    );
  }
);

CopyableInput.displayName = 'CopyableInput';

export const CopyableTextarea = forwardRef<HTMLTextAreaElement, CopyableTextareaProps>(
  ({ value, onClear, className, ...props }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Expose the textarea ref to parent components
    useImperativeHandle(ref, () => textareaRef.current!);

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onClear?.();
      // Return focus to textarea after clearing
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    };

    return (
      <div className="relative group">
        <Textarea
          ref={textareaRef}
          value={value}
          className={className}
          {...props}
        />
        {value && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150">
            {onClear && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="h-7 w-7 flex-shrink-0 bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm"
                title="Clear"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            <StandaloneCopyButton value={value} className="h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm" />
          </div>
        )}
      </div>
    );
  }
);

CopyableTextarea.displayName = 'CopyableTextarea';
