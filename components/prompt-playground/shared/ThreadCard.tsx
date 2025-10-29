/**
 * @fileoverview Generic Thread Card Component
 * Reusable card for displaying execution thread results across different playground types
 */

'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Play, Copy, Check, Clock, Hash, WholeWord, Type, Lock, Unlock } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export interface ThreadFieldInfo {
  key: string;
  name: string;
  icon: LucideIcon;
  color: string;
}

export interface ThreadCardProps<TResult> {
  threadId: string;
  isRunning: boolean;
  isSelected: boolean;
  isLocked: boolean;
  result?: TResult;
  fields: ThreadFieldInfo[];
  sortBy: string;

  // Extraction functions
  getResultText: (result: TResult) => string;
  getResultError: (result: TResult) => string | undefined;
  getResultValidationError: (result: TResult) => boolean;
  getResultDuration: (result: TResult) => number | undefined;
  getResultUsage: (result: TResult) => { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined;

  // Rendering
  renderResultContent: (result: TResult, threadId: string) => ReactNode;

  // Actions
  onToggleSelection: (threadId: string) => void;
  onRunThread: (threadId: string) => void;
  onCopy: (text: string, key: string) => void;
  onSelectByField: (fieldKey: string, value: string) => void;
  onToggleLock: () => void;

  // State
  copiedStates: Record<string, boolean>;
  selectionState: { threadId: string | null; selectedText: string };
}

export function ThreadCard<TResult>({
  threadId,
  isRunning,
  isSelected,
  isLocked,
  result,
  fields,
  sortBy,
  getResultText,
  getResultError,
  getResultValidationError,
  getResultDuration,
  getResultUsage,
  renderResultContent,
  onToggleSelection,
  onRunThread,
  onCopy,
  onSelectByField,
  onToggleLock,
  copiedStates,
  selectionState,
}: ThreadCardProps<TResult>) {

  // Dynamic word/char count based on text selection
  const hasSelection = selectionState.threadId === threadId;
  const selectedText = hasSelection ? selectionState.selectedText : '';
  const fullText = result ? getResultText(result) : '';
  const displayText = hasSelection ? selectedText : fullText;
  const wordCount = countWords(displayText);
  const charCount = displayText.length;

  // Dynamic styling for word/char counts
  const dynamicStatsClassName = hasSelection
    ? 'text-gray-900 dark:text-gray-100'
    : 'text-gray-500 dark:text-gray-400';

  // Determine field order based on sort
  const getFieldsInOrder = (): ThreadFieldInfo[] => {
    const sortedField = fields.find(f => f.key === sortBy);
    if (sortedField) {
      return [sortedField, ...fields.filter(f => f.key !== sortBy)];
    }
    return fields;
  };

  const fieldsInOrder = getFieldsInOrder();
  const [titleField, ...subtitleFields] = fieldsInOrder;

  const error = result ? getResultError(result) : undefined;
  const duration = result ? getResultDuration(result) : undefined;
  const usage = result ? getResultUsage(result) : undefined;
  const isValidationError = result ? getResultValidationError(result) : false;

  return (
    <Card className={`h-full flex flex-col gap-0 py-0 ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      {/* Title and subtitle */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-2 mb-0">
          <div className="flex-1 min-w-0">
            <h4
              className="font-medium text-sm truncate cursor-pointer hover:underline"
              title={titleField.name}
              onClick={() => onSelectByField(titleField.key, titleField.name)}
            >
              {titleField.name}
            </h4>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-1">
              {subtitleFields.map((field) => {
                const Icon = field.icon;
                return (
                  <div
                    key={field.key}
                    className="flex items-center gap-2 truncate cursor-pointer hover:underline"
                    title={field.name}
                    onClick={() => onSelectByField(field.key, field.name)}
                  >
                    <Icon className={`h-4 w-4 ${field.color} flex-shrink-0`} />
                    <span className="truncate">{field.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {/* Row 1: Lock + Checkbox (horizontal) */}
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 hover:bg-muted"
                onClick={onToggleLock}
                title={isLocked ? 'Unlock (stop persisting on reload)' : 'Lock (persist on reload)'}
              >
                {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant={isSelected ? "default" : "outline"}
                onClick={() => onToggleSelection(threadId)}
                className="h-8 w-8"
              >
                <Check className={`h-4 w-4 ${isSelected ? '' : 'opacity-0'}`} />
              </Button>
            </div>
            {/* Row 2: Run button */}
            <Button
              size="icon"
              variant="outline"
              onClick={() => onRunThread(threadId)}
              disabled={isRunning}
              className="h-8 w-8"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Result */}
      <div className="flex-1 p-4 overflow-hidden">
        {!result ? (
          isRunning ? (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Generating...
            </div>
          ) : (
            <div className="text-gray-400 dark:text-gray-500 text-sm">Not run yet</div>
          )
        ) : error ? (
          <div className="text-red-600 dark:text-red-400 text-sm">
            <div className="font-semibold mb-1">
              {isValidationError ? 'Schema Validation Error' : 'Error'}
            </div>
            <div className="text-xs">{error}</div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-3">
                {/* Duration - static, always gray */}
                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <Clock className="h-3 w-3" />
                  {duration !== undefined ? `${duration.toFixed(1)}s` : '--'}
                </span>
                {/* Token count - static */}
                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <WholeWord className="h-3 w-3" />
                  {usage?.totalTokens || ((usage?.inputTokens || 0) + (usage?.outputTokens || 0)) || 0}
                </span>
                {/* Word count - DYNAMIC */}
                <span className={`flex items-center gap-1 transition-colors ${dynamicStatsClassName}`}>
                  <Hash className="h-3 w-3" />
                  {wordCount || 0}
                </span>
                {/* Character count - DYNAMIC */}
                <span className={`flex items-center gap-1 transition-colors ${dynamicStatsClassName}`}>
                  <Type className="h-3 w-3" />
                  {charCount || 0}
                </span>
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 hover:bg-muted"
                onClick={() => onCopy(fullText, `card-${threadId}`)}
              >
                {copiedStates[`card-${threadId}`] ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
            <ScrollArea className="h-auto max-h-64" data-json-output={threadId}>
              {renderResultContent(result, threadId)}
            </ScrollArea>
          </div>
        )}
      </div>
    </Card>
  );
}

// Utility function for counting words
function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}
