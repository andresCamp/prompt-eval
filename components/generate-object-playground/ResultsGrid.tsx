/**
 * @fileoverview Results Grid for GenerateObject Playground
 * Displays execution results in a grid format matching the original playground UI/UX
 * X-axis: Execution threads (combinations)
 * Y-axis: Test cases (schema/input combinations)
 */

'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Input } from '@/components/ui/input';
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group';
import { Loader2, Play, Copy, Check, Clock, Hash, Lock, Unlock, ArrowUpDown, LayoutGrid, Brain, Code, Cpu, FileJson, X, WholeWord, Type } from 'lucide-react';
import { GenerateObjectExecutionThread } from './types';
import { useAtom } from 'jotai';
import { snapshotAtomFamily, buildSnapshotFromObjectThread, getGenerateObjectThreadKey } from '@/lib/atoms';
import { usePersistentLock } from '@/lib/hooks';
import { countWords } from '../prompt-playground/shared/utils';

interface ResultsGridProps {
  executionThreads: GenerateObjectExecutionThread[];
  onRunThread: (threadId: string) => void;
  onCopy: (text: string, key: string) => void;
  copiedStates: Record<string, boolean>;
}

type SortOption = 'model' | 'schema' | 'system' | 'prompt' | 'status';
type ColumnOption = 'auto' | '1' | '2' | '3' | '4' | 'custom';

export function ResultsGrid({
  executionThreads,
  onRunThread,
  onCopy,
  copiedStates,
}: ResultsGridProps) {
  const [sortBy, setSortBy] = useState<SortOption>('model');
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

  const selectByField = (fieldKey: 'model' | 'schema' | 'system' | 'prompt', value: string) => {
    const matchingThreadIds = executionThreads
      .filter(thread => {
        switch (fieldKey) {
          case 'model':
            return thread.modelThread.name === value;
          case 'schema':
            return thread.schemaThread.name === value;
          case 'system':
            return thread.systemPromptThread.name === value;
          case 'prompt':
            return thread.promptDataThread.name === value;
        }
      })
      .map(thread => thread.id);

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
      await Promise.all(batch.map(thread => onRunThread(thread.id)));
    }
  };

  const handleRunSelected = async () => {
    const selectedThreads = executionThreads.filter(t => selectedThreadIds.has(t.id));
    const batchSize = 3;
    for (let i = 0; i < selectedThreads.length; i += batchSize) {
      const batch = selectedThreads.slice(i, i + batchSize);
      await Promise.all(batch.map(thread => onRunThread(thread.id)));
    }
  };

  const copyAll = () => {
    // Copy all thread results as JSON array
    const allResults = executionThreads.map(thread => {
      const ns = (typeof window !== 'undefined' ? (window as unknown as { __PAGE_NS__?: string }).__PAGE_NS__ : undefined);
      const key = getGenerateObjectThreadKey(thread, ns);
      const snapRaw = (typeof window !== 'undefined') ? localStorage.getItem(`snapshot:${ns || 'root'}:go-snap:${key}`) : null;
      const snap = snapRaw ? JSON.parse(snapRaw) : null;
      const effective = snap?.result ? snap : { result: thread.result };

      return {
        thread: thread.name,
        model: thread.modelThread.name,
        schema: thread.schemaThread.name,
        system: thread.systemPromptThread.name,
        prompt: thread.promptDataThread.name,
        result: effective?.result?.object,
        metadata: {
          duration: effective?.result?.duration,
          tokens: effective?.result?.usage,
          error: effective?.result?.error
        }
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
    switch (sortBy) {
      case 'model':
        return a.modelThread.name.localeCompare(b.modelThread.name);
      case 'schema':
        return a.schemaThread.name.localeCompare(b.schemaThread.name);
      case 'system':
        return a.systemPromptThread.name.localeCompare(b.systemPromptThread.name);
      case 'prompt':
        return a.promptDataThread.name.localeCompare(b.promptDataThread.name);
      case 'status':
        // Sort by: running > has result > error > not run
        const getStatusPriority = (thread: GenerateObjectExecutionThread) => {
          if (thread.isRunning) return 0;
          if (thread.result?.object) return 1;
          if (thread.result?.error) return 2;
          return 3;
        };
        return getStatusPriority(a) - getStatusPriority(b);
      default:
        return 0; // Keep original order
    }
  });

  if (executionThreads.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No execution threads. Configure threads above to see results.
      </div>
    );
  }

  // For single thread, show detailed view
  if (executionThreads.length === 1) {
    const thread = executionThreads[0];
    return (
      <Card className="gap-0 py-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-medium text-sm">{thread.name}</h4>
            <p className="text-xs text-gray-500 mt-1">
              Schema: {thread.schemaThread.name} | Prompt: {thread.promptDataThread.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRunThread(thread.id)}
              disabled={thread.isRunning}
            >
              {thread.isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run
                </>
              )}
            </Button>
            {(thread.result?.object !== undefined && thread.result?.object !== null) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCopy(JSON.stringify(thread.result?.object, null, 2), `result-${thread.id}`)}
              >
                {copiedStates[`result-${thread.id}`] ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
        {thread.result && (
          <div>
            {thread.result.error ? (
              <div className="text-red-600 text-sm">
                {thread.result.validationError ? 'Validation Error: ' : 'Error: '}
                {thread.result.error}
              </div>
            ) : thread.result.object ? (
              <pre className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md overflow-x-auto text-xs font-mono text-gray-900 dark:text-gray-100">
                {JSON.stringify(thread.result.object, null, 2)}
              </pre>
            ) : (
              <div className="text-gray-500 text-sm">No output generated</div>
            )}
          </div>
        )}
      </Card>
    );
  }

  // Grid view for multiple threads - Card-based layout
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-gray-500" />
            <ToggleGroup type="single" value={sortBy} onValueChange={(value) => value && setSortBy(value as SortOption)} size="sm" variant="outline">
              <ToggleGroupItem
                value="model"
                aria-label="Sort by model"
                className={sortBy === 'model' ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-800 hover:text-blue-900 dark:hover:text-blue-100 data-[state=on]:bg-blue-100 dark:data-[state=on]:bg-blue-900 data-[state=on]:text-blue-900 dark:data-[state=on]:text-blue-100' : ''}
              >
                Model
              </ToggleGroupItem>
              <ToggleGroupItem
                value="schema"
                aria-label="Sort by schema"
                className={sortBy === 'schema' ? 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 hover:bg-green-200 dark:hover:bg-green-800 hover:text-green-900 dark:hover:text-green-100 data-[state=on]:bg-green-100 dark:data-[state=on]:bg-green-900 data-[state=on]:text-green-900 dark:data-[state=on]:text-green-100' : ''}
              >
                Schema
              </ToggleGroupItem>
              <ToggleGroupItem
                value="system"
                aria-label="Sort by system prompt"
                className={sortBy === 'system' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 hover:bg-yellow-200 dark:hover:bg-yellow-800 hover:text-yellow-900 dark:hover:text-yellow-100 data-[state=on]:bg-yellow-100 dark:data-[state=on]:bg-yellow-900 data-[state=on]:text-yellow-900 dark:data-[state=on]:text-yellow-100' : ''}
              >
                System
              </ToggleGroupItem>
              <ToggleGroupItem
                value="prompt"
                aria-label="Sort by prompt"
                className={sortBy === 'prompt' ? 'bg-orange-100 dark:bg-orange-900 text-orange-900 dark:text-orange-100 hover:bg-orange-200 dark:hover:bg-orange-800 hover:text-orange-900 dark:hover:text-orange-100 data-[state=on]:bg-orange-100 dark:data-[state=on]:bg-orange-900 data-[state=on]:text-orange-900 dark:data-[state=on]:text-orange-100' : ''}
              >
                Prompt
              </ToggleGroupItem>
              <ToggleGroupItem value="status" aria-label="Sort by status">
                Status
              </ToggleGroupItem>
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
          <ThreadCard
            key={thread.id}
            thread={thread}
            sortBy={sortBy}
            isSelected={selectedThreadIds.has(thread.id)}
            onToggleSelection={toggleSelection}
            onRunThread={onRunThread}
            onCopy={onCopy}
            copiedStates={copiedStates}
            onSelectByField={selectByField}
            selectionState={selectionState}
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
                disabled={executionThreads.some(t => t.isRunning)}
                size="lg"
                className="px-6 py-3 text-base font-semibold rounded-2xl"
              >
                {executionThreads.some(t => t.isRunning) ? (
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
                disabled={executionThreads.some(t => t.isRunning) || executionThreads.length === 0}
                size="lg"
                className="px-6 py-3 text-base font-semibold rounded-2xl"
              >
                {executionThreads.some(t => t.isRunning) ? (
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

interface ThreadCardProps {
  thread: GenerateObjectExecutionThread;
  sortBy: SortOption;
  isSelected: boolean;
  onToggleSelection: (threadId: string) => void;
  onRunThread: (threadId: string) => void;
  onCopy: (text: string, key: string) => void;
  copiedStates: Record<string, boolean>;
  onSelectByField: (fieldKey: 'model' | 'schema' | 'system' | 'prompt', value: string) => void;
  selectionState: { threadId: string | null; selectedText: string };
}

function ThreadCard({ thread, sortBy, isSelected, onToggleSelection, onRunThread, onCopy, copiedStates, onSelectByField, selectionState }: ThreadCardProps) {
  const pageNs = (typeof window !== 'undefined' ? (window as unknown as { __PAGE_NS__?: string }).__PAGE_NS__ : undefined);
  const stableKey = getGenerateObjectThreadKey(thread, pageNs);
  const [snapshot] = useAtom(snapshotAtomFamily(stableKey));
  const isLocked = !!snapshot;
  const result = (isLocked && snapshot?.result) ? snapshot.result : thread.result;

  // Dynamic word/char count based on text selection
  const hasSelection = selectionState.threadId === thread.id;
  const selectedText = hasSelection ? selectionState.selectedText : '';
  const jsonString = result?.object ? JSON.stringify(result.object, null, 2) : '';
  const displayText = hasSelection ? selectedText : jsonString;
  const wordCount = countWords(displayText);
  const charCount = displayText.length;

  // Dynamic styling for word/char counts
  const dynamicStatsClassName = hasSelection
    ? 'text-gray-900 dark:text-gray-100'
    : 'text-gray-500 dark:text-gray-400';

  // Determine field order based on sort
  type FieldInfo = { name: string; icon: React.ComponentType<{ className?: string }>; color: string; key: string };

  const getFieldsInOrder = (): FieldInfo[] => {
    const fields = {
      model: { name: thread.modelThread.name, icon: Brain, color: 'text-blue-600', key: 'model' },
      schema: { name: thread.schemaThread.name, icon: Code, color: 'text-green-600', key: 'schema' },
      system: { name: thread.systemPromptThread.name, icon: Cpu, color: 'text-yellow-600', key: 'system' },
      prompt: { name: thread.promptDataThread.name, icon: FileJson, color: 'text-orange-600', key: 'prompt' }
    };

    switch (sortBy) {
      case 'schema':
        return [fields.schema, fields.model, fields.system, fields.prompt];
      case 'system':
        return [fields.system, fields.model, fields.schema, fields.prompt];
      case 'prompt':
        return [fields.prompt, fields.model, fields.schema, fields.system];
      case 'model':
      case 'status':
      default:
        return [fields.model, fields.schema, fields.system, fields.prompt];
    }
  };

  const fieldsInOrder = getFieldsInOrder();
  const [titleField, ...subtitleFields] = fieldsInOrder;

  return (
    <Card className={`h-full flex flex-col gap-0 py-0 ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      {/* title and subtitle */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-2 mb-0">
          <div className="flex-1 min-w-0">
            <h4
              className="font-medium text-sm truncate cursor-pointer hover:underline"
              title={titleField.name}
              onClick={() => onSelectByField(titleField.key as 'model' | 'schema' | 'system' | 'prompt', titleField.name)}
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
                    onClick={() => onSelectByField(field.key as 'model' | 'schema' | 'system' | 'prompt', field.name)}
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
              <LockToggle thread={thread} />
              <Button
                size="icon"
                variant={isSelected ? "default" : "outline"}
                onClick={() => onToggleSelection(thread.id)}
                className="h-8 w-8"
              >
                <Check className={`h-4 w-4 ${isSelected ? '' : 'opacity-0'}`} />
              </Button>
            </div>
            {/* Row 2: Run button */}
            <Button
              size="icon"
              variant="outline"
              onClick={() => onRunThread(thread.id)}
              disabled={thread.isRunning}
              className="h-8 w-8"
            >
              {thread.isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* result */}
      <div className="flex-1 p-4 overflow-hidden">
        {!result ? (
          thread.isRunning ? (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Generating...
            </div>
          ) : (
            <div className="text-gray-400 dark:text-gray-500 text-sm">Not run yet</div>
          )
        ) : result.error ? (
          <div className="text-red-600 dark:text-red-400 text-sm">
            <div className="font-semibold mb-1">
              {result.validationError ? 'Schema Validation Error' : 'Error'}
            </div>
            <div className="text-xs">{result.error}</div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-3">
                {/* Duration - static, always gray */}
                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <Clock className="h-3 w-3" />
                  {result.duration !== undefined ? `${result.duration.toFixed(1)}s` : '--'}
                </span>
                {/* Token count - static, NEW ICON: WholeWord */}
                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <WholeWord className="h-3 w-3" />
                  {result.usage?.totalTokens || ((result.usage?.inputTokens || 0) + (result.usage?.outputTokens || 0)) || 0}
                </span>
                {/* Word count - DYNAMIC, NEW ICON: Hash */}
                <span className={`flex items-center gap-1 transition-colors ${dynamicStatsClassName}`}>
                  <Hash className="h-3 w-3" />
                  {wordCount || 0}
                </span>
                {/* Character count - DYNAMIC, NEW STAT + ICON: Type */}
                <span className={`flex items-center gap-1 transition-colors ${dynamicStatsClassName}`}>
                  <Type className="h-3 w-3" />
                  {charCount || 0}
                </span>
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 hover:bg-muted"
                onClick={() => onCopy(JSON.stringify(result.object, null, 2), `card-${thread.id}`)}
              >
                {copiedStates[`card-${thread.id}`] ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
            <ScrollArea className="h-auto max-h-64" data-json-output={thread.id}>
              <pre className="text-xs font-mono whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
                {JSON.stringify(result.object, null, 2)}
              </pre>
            </ScrollArea>
          </div>
        )}
      </div>
    </Card>
  );
}

function LockToggle({ thread }: { thread: GenerateObjectExecutionThread }) {
  const pageNs = (typeof window !== 'undefined' ? (window as unknown as { __PAGE_NS__?: string }).__PAGE_NS__ : undefined);
  const stableKey = getGenerateObjectThreadKey(thread, pageNs);
  const { isLocked, lockWith, unlock } = usePersistentLock(stableKey, 'cell');

  const toggle = () => {
    if (!isLocked) lockWith(buildSnapshotFromObjectThread(thread));
    else unlock();
  };

  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-6 w-6 hover:bg-muted"
      onClick={toggle}
      title={isLocked ? 'Unlock (stop persisting on reload)' : 'Lock (persist on reload)'}
    >
      {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
    </Button>
  );
}