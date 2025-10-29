/**
 * @fileoverview Generic Collapsible Thread Section Component
 * Reusable collapsible section for managing pipeline threads across different playground types
 */

'use client';

import React, { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Eye, EyeOff, ChevronDown, ChevronUp, GitBranchPlus } from 'lucide-react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { TitleInputWithAI } from './TitleInputWithAI';
import { BatchTitleGenerator } from './BatchTitleGenerator';

export interface BaseThread {
  id: string;
  name: string;
  visible: boolean;
  isExpanded?: boolean;
}

export interface CollapsibleThreadSectionProps<T extends BaseThread> {
  title: string;
  threads: T[];
  icon: ReactNode;
  borderColor: string;
  onAddThread: () => void;
  onUpdateThread: (id: string, updates: Partial<T>) => void;
  onDeleteThread: (id: string) => void;
  onDuplicateThread: (id: string) => void;
  copiedStates: Record<string, boolean>;
  onCopy: (text: string, key: string) => void;
  renderContent: (thread: T, onUpdate: (updates: Partial<T>) => void) => ReactNode;
  getThreadContent?: (thread: T) => string;
  contentType?: string;
  defaultOpen?: boolean;
  minThreads?: number;
}

export function CollapsibleThreadSection<T extends BaseThread>({
  title,
  threads,
  icon,
  borderColor,
  onAddThread,
  onUpdateThread,
  onDeleteThread,
  onDuplicateThread,
  copiedStates: _copiedStates,
  onCopy: _onCopy,
  renderContent,
  getThreadContent,
  contentType,
  defaultOpen = true,
  minThreads = 1,
}: CollapsibleThreadSectionProps<T>) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  // These are passed down but may be used by renderContent implementations
  void _copiedStates;
  void _onCopy;

  const visibleThreads = threads.filter(t => t.visible);
  const hiddenCount = threads.length - visibleThreads.length;

  const applyUpdate = (thread: T, updates: Partial<T>) => {
    onUpdateThread(thread.id, updates);
  };

  const cardCursor = isOpen ? 'cursor-n-resize' : 'cursor-s-resize';

  return (
    <Card className={`${borderColor} border-2`}>
      <CardHeader
        className={cardCursor}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle>{title} ({threads.length})</CardTitle>
            {hiddenCount > 0 && (
              <span className="text-sm text-gray-500">({hiddenCount} hidden)</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getThreadContent && threads.length > 1 && (
              <BatchTitleGenerator
                threads={threads}
                getThreadContent={getThreadContent}
                contentType={contentType}
                onUpdateThread={onUpdateThread}
              />
            )}
            <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent>
          <div className="space-y-4">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onAddThread();
              }}
              variant="outline"
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add {title} Thread
            </Button>

            <div className={`grid gap-4 ${threads.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {threads.map((thread) => {
                const isExpanded = thread.isExpanded ?? true; // Default to expanded

                return (
                  <Collapsible.Root
                    key={thread.id}
                    open={isExpanded}
                    onOpenChange={(open) => {
                      applyUpdate(thread, { isExpanded: open } as Partial<T>);
                    }}
                  >
                    <div className={`border rounded-lg p-4 space-y-3 ${!thread.visible ? 'opacity-50' : ''}`}>
                      <div className="flex items-center justify-between gap-2">
                        <TitleInputWithAI
                          value={thread.name}
                          onChange={(value) => applyUpdate(thread, { name: value } as Partial<T>)}
                          content={getThreadContent ? getThreadContent(thread) : ''}
                          contentType={contentType}
                          siblingTitles={threads.map(t => t.name)}
                          placeholder="Thread name"
                          className="flex-1"
                        />
                        <div className="flex items-center gap-1">
                          <Collapsible.Trigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title={isExpanded ? "Collapse card" : "Expand card"}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </Collapsible.Trigger>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newVisible = !thread.visible;
                              // Toggle visibility and auto-expand/collapse
                              applyUpdate(thread, {
                                visible: newVisible,
                                isExpanded: newVisible
                              } as Partial<T>);
                            }}
                            className="h-8 w-8"
                            title={thread.visible ? "Hide from execution" : "Include in execution"}
                          >
                            {thread.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicateThread(thread.id);
                            }}
                            className="h-8 w-8"
                            title="Duplicate thread"
                          >
                            <GitBranchPlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (threads.length > minThreads) {
                                onDeleteThread(thread.id);
                              }
                            }}
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete thread"
                            disabled={threads.length <= minThreads}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Collapsible.Content className="data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp">
                        {renderContent(thread, (updates) => applyUpdate(thread, updates))}
                      </Collapsible.Content>
                    </div>
                  </Collapsible.Root>
                );
              })}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
