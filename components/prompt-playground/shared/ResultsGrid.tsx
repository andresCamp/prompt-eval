/**
 * @fileoverview Generic Results Grid Component
 * Reusable grid for displaying execution results across different playground types
 */

'use client';

import { useState, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Input } from '@/components/ui/input';
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group';
import { Loader2, Play, Copy, Check, ArrowUpDown, LayoutGrid, X } from 'lucide-react';
import { ThreadCard, ThreadFieldInfo } from './ThreadCard';
import { useAtom } from 'jotai';
import { snapshotAtomFamily } from '@/lib/atoms';
import { usePersistentLock } from '@/lib/hooks';

export interface SortOption {
  value: string;
  label: string;
  color?: string; // For colored toggle buttons
}

export interface ResultsGridProps<TThread, TResult> {
  executionThreads: TThread[];
  onRunThread: (threadId: string) => void;
  onCopy: (text: string, key: string) => void;
  copiedStates: Record<string, boolean>;

  // Thread extraction
  getThreadId: (thread: TThread) => string;
  getThreadName: (thread: TThread) => string;
  getThreadVisible: (thread: TThread) => boolean;
  getThreadRunning: (thread: TThread) => boolean;
  getThreadResult: (thread: TThread) => TResult | undefined;

  // Thread key/snapshot management
  getThreadKey: (thread: TThread, ns?: string) => string;
  buildSnapshot: (thread: TThread) => unknown;

  // Result extraction
  getResultText: (result: TResult) => string;
  getResultError: (result: TResult) => string | undefined;
  getResultValidationError: (result: TResult) => boolean;
  getResultDuration: (result: TResult) => number | undefined;
  getResultUsage: (result: TResult) => { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined;
  getResultObject: (result: TResult) => unknown | undefined; // For "copy all" functionality

  // Rendering
  renderResultContent: (result: TResult, threadId: string) => ReactNode;

  // Thread fields configuration
  getThreadFields: (thread: TThread) => ThreadFieldInfo[];

  // Sort options
  sortOptions: SortOption[];
}

type ColumnOption = 'auto' | '1' | '2' | '3' | '4' | 'custom';

export function ResultsGrid<TThread, TResult>({
  executionThreads,
  onRunThread,
  onCopy,
  copiedStates,
  getThreadId,
  getThreadName,
  getThreadVisible,
  getThreadRunning,
  getThreadResult,
  getThreadKey,
  buildSnapshot,
  getResultText,
  getResultError,
  getResultValidationError,
  getResultDuration,
  getResultUsage,
  getResultObject,
  renderResultContent,
  getThreadFields,
  sortOptions,
}: ResultsGridProps<TThread, TResult>) {
  const [sortBy, setSortBy] = useState<string>(sortOptions[0]?.value || 'model');
  const [columns, setColumns] = useState<ColumnOption>('auto');
  const [customColumnCount, setCustomColumnCount] = useState<number>(5);
  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(new Set());

  // Global selection tracking for dynamic word/char counts
  const [selectionState, setSelectionState] = useState<{
    threadId: string | null;
    selectedText: string;
  }>({ threadId: null, selectedText: '' });

  // Single global selection listener for all cards
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const selectedStr = selection?.toString() || '';

      if (!selection || !selectedStr.trim() || selection.rangeCount === 0) {
        // Only clear if there was previously a selection
        setSelectionState(prev => {
          if (prev.threadId === null && prev.selectedText === '') {
            return prev; // No change, return same reference to prevent re-render
          }
          return { threadId: null, selectedText: '' };
        });
        return;
      }

      // Find which card the selection is in
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      let element: HTMLElement | null = container.nodeType === Node.TEXT_NODE
        ? container.parentElement
        : container as HTMLElement;

      // Walk up the DOM to find data-json-output attribute
      while (element) {
        const threadId = element.getAttribute('data-json-output');
        if (threadId) {
          // Only update if selection actually changed
          setSelectionState(prev => {
            if (prev.threadId === threadId && prev.selectedText === selectedStr) {
              return prev; // No change, return same reference to prevent re-render
            }
            return { threadId, selectedText: selectedStr };
          });
          return;
        }
        element = element.parentElement;
      }

      // Selection not in any card - only clear if there was previously a selection
      setSelectionState(prev => {
        if (prev.threadId === null && prev.selectedText === '') {
          return prev; // No change, return same reference to prevent re-render
        }
        return { threadId: null, selectedText: '' };
      });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const toggleSelection = (threadId: string) => {
    setSelectedThreadIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(threadId)) {
        newSet.delete(threadId);
      } else {
        newSet.add(threadId);
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedThreadIds(new Set());
  };

  const selectByField = (fieldKey: string, value: string) => {
    const matchingThreadIds = executionThreads
      .filter(thread => {
        const fields = getThreadFields(thread);
        const field = fields.find(f => f.key === fieldKey);
        return field?.name === value;
      })
      .map(thread => getThreadId(thread));

    // Check if all matching threads are already selected
    const allMatchingSelected = matchingThreadIds.every(id => selectedThreadIds.has(id));

    if (allMatchingSelected && matchingThreadIds.length > 0) {
      // If all matching threads are selected, deselect all (clear selection)
      setSelectedThreadIds(new Set());
    } else {
      // Otherwise, select all matching threads
      setSelectedThreadIds(new Set(matchingThreadIds));
    }
  };

  const selectedCount = selectedThreadIds.size;

  const handleRunAllThreads = async () => {
    // Run all threads in batches to prevent rate limiting
    const batchSize = 3;
    for (let i = 0; i < executionThreads.length; i += batchSize) {
      const batch = executionThreads.slice(i, i + batchSize);
      await Promise.all(batch.map(thread => onRunThread(getThreadId(thread))));
    }
  };

  const handleRunSelected = async () => {
    const selectedThreads = executionThreads.filter(t => selectedThreadIds.has(getThreadId(t)));
    const batchSize = 3;
    for (let i = 0; i < selectedThreads.length; i += batchSize) {
      const batch = selectedThreads.slice(i, i + batchSize);
      await Promise.all(batch.map(thread => onRunThread(getThreadId(thread))));
    }
  };

  const copyAll = () => {
    // Copy all thread results as JSON array
    const allResults = executionThreads.map(thread => {
      const ns = (typeof window !== 'undefined' ? (window as unknown as { __PAGE_NS__?: string }).__PAGE_NS__ : undefined);
      const key = getThreadKey(thread, ns);
      const snapRaw = (typeof window !== 'undefined') ? localStorage.getItem(`snapshot:${ns || 'root'}:go-snap:${key}`) : null;
      const snap = snapRaw ? JSON.parse(snapRaw) : null;
      const result = snap?.result || getThreadResult(thread);

      const fields = getThreadFields(thread);
      const fieldObj: Record<string, string> = {};
      fields.forEach(f => {
        fieldObj[f.key] = f.name;
      });

      return {
        thread: getThreadName(thread),
        ...fieldObj,
        result: result ? getResultObject(result) : null,
        metadata: result ? {
          duration: getResultDuration(result),
          tokens: getResultUsage(result),
          error: getResultError(result)
        } : null
      };
    });

    onCopy(JSON.stringify(allResults, null, 2), 'copy-all');
  };

  // Get grid class based on column selection
  const getGridClass = () => {
    if (columns === 'auto') {
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
    }
    // For fixed columns and custom, use inline styles instead
    return '';
  };

  // Get grid style for custom and fixed columns (using CSS Grid directly)
  const getGridStyle = () => {
    if (columns === 'auto') {
      return {};
    } else if (columns === 'custom') {
      return { gridTemplateColumns: `repeat(${customColumnCount}, minmax(0, 1fr))` };
    } else {
      // For fixed 1, 2, 3, 4 columns
      return { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };
    }
  };

  // Sort threads based on selected option
  const sortedThreads = [...executionThreads].sort((a, b) => {
    if (sortBy === 'status') {
      // Sort by: running > has result > error > not run
      const getStatusPriority = (thread: TThread) => {
        if (getThreadRunning(thread)) return 0;
        const result = getThreadResult(thread);
        if (result && !getResultError(result)) return 1;
        if (result && getResultError(result)) return 2;
        return 3;
      };
      return getStatusPriority(a) - getStatusPriority(b);
    } else {
      // Sort by field
      const fieldsA = getThreadFields(a);
      const fieldsB = getThreadFields(b);
      const fieldA = fieldsA.find(f => f.key === sortBy);
      const fieldB = fieldsB.find(f => f.key === sortBy);
      if (fieldA && fieldB) {
        return fieldA.name.localeCompare(fieldB.name);
      }
    }
    return 0;
  });

  if (executionThreads.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No execution threads. Configure threads above to see results.
      </div>
    );
  }

  // Grid view for multiple threads - Card-based layout
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-gray-500" />
            <ToggleGroup type="single" value={sortBy} onValueChange={(value) => value && setSortBy(value)} size="sm" variant="outline">
              {sortOptions.map(option => (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  aria-label={`Sort by ${option.label}`}
                  className={option.color && sortBy === option.value ? option.color : ''}
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-gray-500" />
            <ToggleGroup type="single" value={columns === 'custom' ? '' : columns} onValueChange={(value) => value && setColumns(value as ColumnOption)} size="sm" variant="outline">
              <ToggleGroupItem value="auto" aria-label="Auto columns">
                Auto
              </ToggleGroupItem>
              <ToggleGroupItem value="1" aria-label="1 column">
                1
              </ToggleGroupItem>
              <ToggleGroupItem value="2" aria-label="2 columns">
                2
              </ToggleGroupItem>
              <ToggleGroupItem value="3" aria-label="3 columns">
                3
              </ToggleGroupItem>
              <ToggleGroupItem value="4" aria-label="4 columns">
                4
              </ToggleGroupItem>
              {columns !== 'custom' ? (
                <ToggleGroupItem value="custom" aria-label="Custom columns">
                  Custom
                </ToggleGroupItem>
              ) : (
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={customColumnCount}
                  onChange={(e) => setCustomColumnCount(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                  onBlur={() => setColumns('auto')}
                  autoFocus
                  className="w-16 h-8"
                />
              )}
            </ToggleGroup>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={copyAll}
            variant="outline"
            size="sm"
          >
            {copiedStates['copy-all'] ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy All
              </>
            )}
          </Button>
        </div>
      </div>

      <div className={`grid ${getGridClass()} gap-4`} style={getGridStyle()}>
        {sortedThreads.map((thread) => (
          <ThreadCardWrapper
            key={getThreadId(thread)}
            thread={thread}
            sortBy={sortBy}
            isSelected={selectedThreadIds.has(getThreadId(thread))}
            onToggleSelection={toggleSelection}
            onRunThread={onRunThread}
            onCopy={onCopy}
            copiedStates={copiedStates}
            onSelectByField={selectByField}
            selectionState={selectionState}
            getThreadId={getThreadId}
            getThreadRunning={getThreadRunning}
            getThreadResult={getThreadResult}
            getThreadKey={getThreadKey}
            buildSnapshot={buildSnapshot}
            getResultText={getResultText}
            getResultError={getResultError}
            getResultValidationError={getResultValidationError}
            getResultDuration={getResultDuration}
            getResultUsage={getResultUsage}
            renderResultContent={renderResultContent}
            getThreadFields={getThreadFields}
          />
        ))}
      </div>

      {/* Portal floating button to document.body */}
      {typeof window !== 'undefined' && createPortal(
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          {selectedCount > 0 ? (
            <ButtonGroup className="shadow-lg rounded-2xl">
              <Button
                onClick={handleRunSelected}
                disabled={executionThreads.some(t => getThreadRunning(t))}
                size="lg"
                className="px-6 py-3 text-base font-semibold rounded-2xl"
              >
                {executionThreads.some(t => getThreadRunning(t)) ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Run Selected ({selectedCount})
                  </>
                )}
              </Button>
              <ButtonGroupSeparator />
              <Button
                onClick={clearSelection}
                size="lg"
                className="rounded-2xl px-4 py-3"
              >
                <X className="h-5 w-5" />
              </Button>
            </ButtonGroup>
          ) : (
            <ButtonGroup className="shadow-lg rounded-2xl">
              <Button
                onClick={handleRunAllThreads}
                disabled={executionThreads.some(t => getThreadRunning(t)) || executionThreads.length === 0}
                size="lg"
                className="px-6 py-3 text-base font-semibold rounded-2xl"
              >
                {executionThreads.some(t => getThreadRunning(t)) ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Run All ({executionThreads.length})
                  </>
                )}
              </Button>
            </ButtonGroup>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

// Wrapper component to safely use hooks per thread
function ThreadCardWrapper<TThread, TResult>(props: {
  thread: TThread;
  sortBy: string;
  isSelected: boolean;
  onToggleSelection: (threadId: string) => void;
  onRunThread: (threadId: string) => void;
  onCopy: (text: string, key: string) => void;
  copiedStates: Record<string, boolean>;
  onSelectByField: (fieldKey: string, value: string) => void;
  selectionState: { threadId: string | null; selectedText: string };
  getThreadId: (thread: TThread) => string;
  getThreadRunning: (thread: TThread) => boolean;
  getThreadResult: (thread: TThread) => TResult | undefined;
  getThreadKey: (thread: TThread, ns?: string) => string;
  buildSnapshot: (thread: TThread) => unknown;
  getResultText: (result: TResult) => string;
  getResultError: (result: TResult) => string | undefined;
  getResultValidationError: (result: TResult) => boolean;
  getResultDuration: (result: TResult) => number | undefined;
  getResultUsage: (result: TResult) => { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined;
  renderResultContent: (result: TResult, threadId: string) => ReactNode;
  getThreadFields: (thread: TThread) => ThreadFieldInfo[];
}) {
  const {
    thread,
    sortBy,
    isSelected,
    onToggleSelection,
    onRunThread,
    onCopy,
    copiedStates,
    onSelectByField,
    selectionState,
    getThreadId,
    getThreadRunning,
    getThreadResult,
    getThreadKey,
    buildSnapshot,
    getResultText,
    getResultError,
    getResultValidationError,
    getResultDuration,
    getResultUsage,
    renderResultContent,
    getThreadFields,
  } = props;

  const threadId = getThreadId(thread);
  const pageNs = (typeof window !== 'undefined' ? (window as unknown as { __PAGE_NS__?: string }).__PAGE_NS__ : undefined);
  const stableKey = getThreadKey(thread, pageNs);
  const [snapshot] = useAtom(snapshotAtomFamily(stableKey));
  const { isLocked, lockWith, unlock } = usePersistentLock(stableKey, 'cell');

  const result = (isLocked && snapshot?.result) ? snapshot.result as TResult : getThreadResult(thread);

  const handleToggleLock = () => {
    if (!isLocked) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lockWith(buildSnapshot(thread) as any);
    } else {
      unlock();
    }
  };

  return (
    <ThreadCard
      threadId={threadId}
      isRunning={getThreadRunning(thread)}
      isSelected={isSelected}
      isLocked={isLocked}
      result={result}
      fields={getThreadFields(thread)}
      sortBy={sortBy}
      getResultText={getResultText}
      getResultError={getResultError}
      getResultValidationError={getResultValidationError}
      getResultDuration={getResultDuration}
      getResultUsage={getResultUsage}
      renderResultContent={renderResultContent}
      onToggleSelection={onToggleSelection}
      onRunThread={onRunThread}
      onCopy={onCopy}
      onSelectByField={onSelectByField}
      onToggleLock={handleToggleLock}
      copiedStates={copiedStates}
      selectionState={selectionState}
    />
  );
}
