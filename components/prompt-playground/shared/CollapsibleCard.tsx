/**
 * @fileoverview CollapsibleCard - Reusable collapsible card component
 * 
 * This component provides a card that can be expanded/collapsed with its own internal state.
 * It follows the same pattern as the biographer page modules.
 */

'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, Copy, Trash2, Plus, Check } from 'lucide-react';
import { VisibilityToggle } from './VisibilityToggle';

interface CollapsibleCardProps {
  id: string;
  name: string;
  onNameChange: (name: string) => void;
  onCopy?: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canDelete: boolean;
  borderColor: string;
  children: React.ReactNode;
  subtitle: string;
  icon: React.ReactNode;
  copied?: boolean;
  defaultOpen?: boolean;
  // New visibility props
  visible?: boolean;
  onVisibilityToggle?: () => void;
  showVisibilityToggle?: boolean;
}

export function CollapsibleCard({
  id,
  name,
  onNameChange,
  onCopy = () => {},
  onDuplicate,
  onDelete,
  canDelete,
  borderColor,
  children,
  subtitle,
  icon,
  copied = false,
  defaultOpen = false,
  visible = true,
  onVisibilityToggle,
  showVisibilityToggle = true
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const cardCursor = isOpen ? 'cursor-n-resize' : 'cursor-s-resize';
  const cardOpacity = visible ? 'opacity-100' : 'opacity-60';
  const cardBorder = visible ? borderColor : 'border-gray-300';

  return (
    <Card
      className={`w-full self-start border-2 ${cardBorder} ${cardCursor} ${cardOpacity} hover:bg-muted transition-all`}
      onClick={toggleOpen}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
          <div className="flex items-center gap-2">
            {icon}
            {isOpen ? (
              <Input
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                className="text-sm font-medium border-none p-0 h-auto w-auto max-w-[160px] bg-transparent focus-visible:ring-0"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-sm font-medium truncate" title={name}>
                {name}
              </span>
            )}
          </div>
          {subtitle && <span className="text-[10px] text-gray-500 ml-6">{subtitle}</span>}
          </div>
          <div className="flex items-center gap-1">
            <ChevronDown 
              className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            />
            {/* Visibility Toggle */}
            {showVisibilityToggle && onVisibilityToggle && (
              <VisibilityToggle
                visible={visible}
                onToggle={onVisibilityToggle}
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
              className="h-8 w-8 p-0 cursor-pointer hover:bg-muted hover:scale-105 transition-all"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="h-8 w-8 p-0 cursor-pointer hover:bg-muted hover:scale-105 transition-all"
            >
              <Plus className="h-4 w-4" />
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="h-8 w-8 p-0 cursor-pointer hover:bg-destructive hover:text-destructive-foreground hover:scale-105 transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
}