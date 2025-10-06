/**
 * @fileoverview Results Grid for GenerateText Playground
 * Displays execution results in a grid format matching the original playground UI/UX
 * X-axis: Execution threads (combinations)
 * Y-axis: Test cases (system/prompt combinations)
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, Play, Copy, Check, Clock, Hash, Lock, Unlock } from 'lucide-react';
import { GenerateTextExecutionThread, GenerateTextResult } from './types';
import { useAtom } from 'jotai';
import { snapshotAtomFamily, buildSnapshotFromThread, getGenerateTextThreadKey } from '@/lib/atoms';
import { usePersistentLock } from '@/lib/hooks';

interface ResultsGridProps {
  executionThreads: GenerateTextExecutionThread[];
  onRunThread: (threadId: string) => void;
  onCopy: (text: string, key: string) => void;
  copiedStates: Record<string, boolean>;
}

export function TextResultsGrid({
  executionThreads,
  onRunThread,
  onCopy,
  copiedStates,
}: ResultsGridProps) {
  // Fixed column widths matching the original playground
  const TEST_CASE_COL_WIDTH = 200; // px for first column
  const THREAD_COL_WIDTH = 320; // px for each thread column

  // Group threads by unique test cases (system + prompt combinations)
  const testCases = new Map<string, { systemName: string; promptName: string; key: string }>();
  executionThreads.forEach(thread => {
    const testCaseKey = `${thread.systemPromptThread.id}-${thread.promptDataThread.id}`;
    if (!testCases.has(testCaseKey)) {
      testCases.set(testCaseKey, {
        systemName: thread.systemPromptThread.name,
        promptName: thread.promptDataThread.name,
        key: testCaseKey
      });
    }
  });

  const testCaseArray = Array.from(testCases.values());

  // Table cell component to safely use hooks
  const ThreadCell = ({ thread }: { thread: GenerateTextExecutionThread }) => {
    const pageNs = (typeof window !== 'undefined' ? (window as unknown as { __PAGE_NS__?: string }).__PAGE_NS__ : undefined);
    const stableKey = getGenerateTextThreadKey(thread, pageNs);
    const [snapshot] = useAtom(snapshotAtomFamily(stableKey));
    const isLocked = !!snapshot;
    const resp = (isLocked && snapshot?.result) ? snapshot.result : thread.result;
    const textResp = resp as GenerateTextResult | undefined;

    if (!textResp) {
      return thread.isRunning ? (
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs">
          <Loader2 className="h-3 w-3 animate-spin" /> Generating...
        </div>
      ) : (
        <div className="text-gray-400 dark:text-gray-500 text-xs">Not run</div>
      );
    }

    if (textResp.error) {
      return (
        <div className="text-red-600 dark:text-red-400 text-xs">
          Error: {textResp.error}
        </div>
      );
    }

    const durationText = textResp.duration !== undefined ? `${textResp.duration.toFixed(1)}s` : '--';
    const tokenCount = textResp.usage?.totalTokens || ((textResp.usage?.inputTokens || 0) + (textResp.usage?.outputTokens || 0)) || 0;

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />{durationText}
            </span>
            <span className="flex items-center gap-1">
              <Hash className="h-3 w-3" />{tokenCount}
            </span>
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              onCopy(textResp.text || '', `cell-${thread.id}`);
            }}
          >
            {copiedStates[`cell-${thread.id}`] ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
        <div className="max-h-32 overflow-y-auto">
          <div className="text-[10px] whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 rounded p-2">
            {textResp.text}
          </div>
        </div>
      </div>
    );
  };

  const copyThread = (thread: GenerateTextExecutionThread) => {
    const ns = (typeof window !== 'undefined' ? (window as unknown as { __PAGE_NS__?: string }).__PAGE_NS__ : undefined);
    const key = getGenerateTextThreadKey(thread, ns);
    const snapRaw = (typeof window !== 'undefined') ? localStorage.getItem(`snapshot:${ns || 'root'}:go-snap:${key}`) : null;
    const snap = snapRaw ? JSON.parse(snapRaw) : null;
    const effective = snap?.result ? snap : { result: thread.result };
    if (effective?.result?.text) {
      const text = JSON.stringify({
        thread: thread.name,
        result: effective.result.text,
        metadata: {
          duration: effective.result.duration,
          tokens: effective.result.usage
        }
      }, null, 2);
      onCopy(text, `thread-${thread.id}`);
    }
  };

  const copyAll = () => {
    const headers = ['Test Case', ...executionThreads.map(t => t.name)];
    const rows: string[][] = [];
    
    testCaseArray.forEach(testCase => {
      const row = [`${testCase.systemName} / ${testCase.promptName}`];
      executionThreads.forEach(thread => {
        const matchesTestCase = 
          thread.systemPromptThread.name === testCase.systemName && 
          thread.promptDataThread.name === testCase.promptName;
        
        if (matchesTestCase && thread.result?.text) {
          row.push(thread.result.text);
        } else {
          row.push('');
        }
      });
      rows.push(row);
    });
    
    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))].join('\n');
    onCopy(csv, 'copy-all');
  };

  const handleRunAllThreads = async () => {
    for (const thread of executionThreads) {
      const ns = (typeof window !== 'undefined' ? (window as unknown as { __PAGE_NS__?: string }).__PAGE_NS__ : undefined);
      const key = getGenerateTextThreadKey(thread, ns);
      const hasSnap = (typeof window !== 'undefined') ? !!localStorage.getItem(`snapshot:${ns || 'root'}:go-snap:${key}`) : false;
      if (!hasSnap && !thread.isRunning && thread.visible) {
        await onRunThread(thread.id);
      }
    }
  };

  const anyThreadRunning = executionThreads.some(t => t.isRunning);
  const visibleThreads = executionThreads.filter(t => t.visible);

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
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-medium text-sm">{thread.name}</h4>
            <p className="text-xs text-gray-500 mt-1">
              System: {thread.systemPromptThread.name} | Prompt: {thread.promptDataThread.name}
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
            {thread.result?.text && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCopy(thread.result?.text || '', `result-${thread.id}`)}
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
                Error: {thread.result.error}
              </div>
            ) : thread.result.text ? (
              <div className="bg-gray-50 dark:bg-neutral-800 p-3 rounded-md overflow-x-auto text-sm whitespace-pre-wrap dark:text-gray-100">
                {thread.result.text}
              </div>
            ) : (
              <div className="text-gray-500 text-sm">No output generated</div>
            )}
          </div>
        )}
      </Card>
    );
  }

  // Grid view for multiple threads
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {visibleThreads.length} threads × {testCaseArray.length} test cases
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
      
      <ScrollArea className="w-full border rounded-lg bg-white dark:bg-neutral-900">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-neutral-800 sticky top-0 z-10">
            <tr>
              <th
                className="sticky left-0 bg-gray-50 dark:bg-neutral-800 px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100 z-20" 
                style={{ width: TEST_CASE_COL_WIDTH, minWidth: TEST_CASE_COL_WIDTH }}
              >
                Test Case
              </th>
              {executionThreads.map((thread) => (
                <th
                  key={thread.id}
                  style={{
                    width: THREAD_COL_WIDTH,
                    minWidth: THREAD_COL_WIDTH,
                  }}
                  className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100 border-l border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate max-w-[200px]" title={thread.name}>
                      {thread.modelThread.name} × {thread.systemPromptThread.name}
                    </span>
                    <div className="flex items-center gap-1">
                      {/* Lock toggle */}
                      <LockToggle thread={thread} />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onRunThread(thread.id)}
                        disabled={thread.isRunning}
                        className="h-6 w-6"
                      >
                        {thread.isRunning ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 hover:bg-muted" 
                        onClick={() => copyThread(thread)}
                      >
                        {copiedStates[`thread-${thread.id}`] ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-neutral-900">
            {testCaseArray.map((testCase) => (
              <tr key={testCase.key}>
                <td 
                  className="sticky left-0 bg-white dark:bg-neutral-900 whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 z-10" 
                  style={{ width: TEST_CASE_COL_WIDTH, minWidth: TEST_CASE_COL_WIDTH }}
                >
                  <div className="space-y-1">
                    <div className="text-xs font-semibold">{testCase.systemName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{testCase.promptName}</div>
                  </div>
                </td>
                {executionThreads.map((thread) => {
                  const matchesTestCase = 
                    thread.systemPromptThread.name === testCase.systemName && 
                    thread.promptDataThread.name === testCase.promptName;
                  
                  return (
                    <td
                      key={thread.id}
                      style={{
                        width: THREAD_COL_WIDTH,
                        minWidth: THREAD_COL_WIDTH,
                      }}
                      className="whitespace-normal px-4 py-2 text-sm text-gray-500 dark:text-gray-400 align-top border-l border-gray-200 dark:border-gray-700"
                    >
                      {matchesTestCase ? <ThreadCell thread={thread} /> : (
                        <div className="text-gray-300 dark:text-gray-500 text-xs">N/A</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

function LockToggle({ thread }: { thread: GenerateTextExecutionThread }) {
  const pageNs = (typeof window !== 'undefined' ? (window as unknown as { __PAGE_NS__?: string }).__PAGE_NS__ : undefined);
  const stableKey = getGenerateTextThreadKey(thread, pageNs);
  const { isLocked, lockWith, unlock } = usePersistentLock(stableKey, 'cell');

  const toggle = () => {
    if (!isLocked) lockWith(buildSnapshotFromThread(thread) as Parameters<typeof lockWith>[0]);
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