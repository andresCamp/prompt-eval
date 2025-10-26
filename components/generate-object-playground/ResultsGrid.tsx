/**
 * @fileoverview Results Grid for GenerateObject Playground
 * Displays execution results in a grid format matching the original playground UI/UX
 * X-axis: Execution threads (combinations)
 * Y-axis: Test cases (schema/input combinations)
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Input } from '@/components/ui/input';
import { Loader2, Play, Copy, Check, Clock, Hash, Lock, Unlock, ArrowUpDown, FileText, LayoutGrid, Brain, Code, Cpu, FileJson } from 'lucide-react';
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

  const copyThread = (thread: GenerateObjectExecutionThread) => {
    const ns = (typeof window !== 'undefined' ? (window as unknown as { __PAGE_NS__?: string }).__PAGE_NS__ : undefined);
    const key = getGenerateObjectThreadKey(thread, ns);
    const snapRaw = (typeof window !== 'undefined') ? localStorage.getItem(`snapshot:${ns || 'root'}:go-snap:${key}`) : null;
    const snap = snapRaw ? JSON.parse(snapRaw) : null;
    const effective = snap?.result ? snap : { result: thread.result };
    if (effective?.result?.object) {
      const text = JSON.stringify({
        thread: thread.name,
        result: effective.result.object,
        metadata: {
          duration: effective.result.duration,
          tokens: effective.result.usage
        }
      }, null, 2);
      onCopy(text, `thread-${thread.id}`);
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

  const handleRunAllThreads = async () => {
    for (const thread of executionThreads) {
      const ns = (typeof window !== 'undefined' ? (window as unknown as { __PAGE_NS__?: string }).__PAGE_NS__ : undefined);
      const key = getGenerateObjectThreadKey(thread, ns);
      const hasSnap = (typeof window !== 'undefined') ? !!localStorage.getItem(`snapshot:${ns || 'root'}:go-snap:${key}`) : false;
      if (!hasSnap && !thread.isRunning && thread.visible) {
        await onRunThread(thread.id);
      }
    }
  };

  const anyThreadRunning = executionThreads.some(t => t.isRunning);
  const visibleThreads = executionThreads.filter(t => t.visible);

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
            onClick={handleRunAllThreads}
            disabled={anyThreadRunning || visibleThreads.length === 0}
            variant="outline"
            size="sm"
          >
            {anyThreadRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run All ({visibleThreads.length})
              </>
            )}
          </Button>
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
            onRunThread={onRunThread}
            onCopy={onCopy}
            copiedStates={copiedStates}
          />
        ))}
      </div>
    </div>
  );
}

interface ThreadCardProps {
  thread: GenerateObjectExecutionThread;
  sortBy: SortOption;
  onRunThread: (threadId: string) => void;
  onCopy: (text: string, key: string) => void;
  copiedStates: Record<string, boolean>;
}

function ThreadCard({ thread, sortBy, onRunThread, onCopy, copiedStates }: ThreadCardProps) {
  const pageNs = (typeof window !== 'undefined' ? (window as unknown as { __PAGE_NS__?: string }).__PAGE_NS__ : undefined);
  const stableKey = getGenerateObjectThreadKey(thread, pageNs);
  const [snapshot] = useAtom(snapshotAtomFamily(stableKey));
  const isLocked = !!snapshot;
  const result = (isLocked && snapshot?.result) ? snapshot.result : thread.result;

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
    <Card className="h-full flex flex-col gap-0 py-0">
      {/* title and subtitle */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-2 mb-0">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate" title={titleField.name}>
              {titleField.name}
            </h4>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-1">
              {subtitleFields.map((field) => {
                const Icon = field.icon;
                return (
                  <div key={field.key} className="flex items-center gap-2 truncate" title={field.name}>
                    <Icon className={`h-4 w-4 ${field.color} flex-shrink-0`} />
                    <span className="truncate">{field.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <LockToggle thread={thread} />
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
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {result.duration !== undefined ? `${result.duration.toFixed(1)}s` : '--'}
                </span>
                <span className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {result.usage?.totalTokens || ((result.usage?.inputTokens || 0) + (result.usage?.outputTokens || 0)) || 0}
                </span>
                {/* add word count - count words in the result.object */}
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {countWords(JSON.stringify(result.object, null, 2)) || 0}
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
            <ScrollArea className="h-auto max-h-64">
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