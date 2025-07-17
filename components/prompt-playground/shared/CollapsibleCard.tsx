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
  defaultOpen = true
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const cardCursor = isOpen ? 'cursor-n-resize' : 'cursor-s-resize';

  return (
    <Card
      className={`w-full self-start border-2 ${borderColor} ${cardCursor} hover:bg-muted transition-colors`}
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
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
            >
              {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
            {canDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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