/**
 * @fileoverview ExecutionResults component for displaying pipeline execution results
 * 
 * This component displays all execution thread combinations in a responsive grid
 * and handles running individual threads or all threads simultaneously.
 */

'use client';


import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MetricsBadge } from './shared/MetricsBadge';
import { CopyButton } from './shared/CopyButton';
import { getGridCols } from './shared/utils';
import type { ExecutionThread, BiographerResponse } from './shared/types';

interface ExecutionResultsProps {
  executionThreads: ExecutionThread[];
  isOpen: boolean;
  onToggle: () => void;
  onRunThread: (threadId: string) => void;
  onRunAllThreads: () => void;
  onUpdateThread: (threadId: string, updates: Partial<ExecutionThread>) => void;
  copiedStates: Record<string, boolean>;
  onCopy: (text: string, buttonId: string) => void;
}

export function ExecutionResults({
  executionThreads,
  isOpen,
  onToggle,
  onRunThread,
  onRunAllThreads,
  onUpdateThread,
  copiedStates,
  onCopy
}: ExecutionResultsProps) {
  const anyThreadRunning = executionThreads.some(thread => thread.isRunning);
  const totalCombinations = executionThreads.length;

  return (
    <Card className="border-2">
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Execution Results
                <span className="text-sm font-normal text-gray-500">
                  ({totalCombinations} {totalCombinations === 1 ? 'combination' : 'combinations'})
                </span>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  onClick={onRunAllThreads}
                  disabled={anyThreadRunning || totalCombinations === 0}
                  variant="default"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  {anyThreadRunning ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                  Run All
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent>
            {totalCombinations === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No execution threads generated.</p>
                <p className="text-sm mt-1">Add threads to any pipeline stage to create combinations.</p>
              </div>
            ) : (
              <div className={`grid ${getGridCols(totalCombinations)} gap-4`}>
                {executionThreads.map((thread) => (
                  <ExecutionThreadCard
                    key={thread.id}
                    thread={thread}
                    onRunThread={onRunThread}
                    onUpdateThread={onUpdateThread}
                    copiedStates={copiedStates}
                    onCopy={onCopy}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface ExecutionThreadCardProps {
  thread: ExecutionThread;
  onRunThread: (threadId: string) => void;
  onUpdateThread: (threadId: string, updates: Partial<ExecutionThread>) => void;
  copiedStates: Record<string, boolean>;
  onCopy: (text: string, buttonId: string) => void;
}

function ExecutionThreadCard({
  thread,
  onRunThread,
  // onUpdateThread,
  copiedStates,
  onCopy
}: ExecutionThreadCardProps) {
  const handleCopyResponse = (response: string, responseId: string) => {
    onCopy(response, responseId);
  };

  // const handleCopyThreadState = (text: string, buttonId: string) => {
  //   onUpdateThread(thread.id, {
  //     copiedStates: { ...thread.copiedStates, [buttonId]: true }
  //   });
    
  //   navigator.clipboard.writeText(text).then(() => {
  //     setTimeout(() => {
  //       onUpdateThread(thread.id, {
  //         copiedStates: { ...thread.copiedStates, [buttonId]: false }
  //       });
  //     }, 3000);
  //   });
  // };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium truncate" title={thread.name}>
              {thread.name}
            </CardTitle>
            <div className="text-xs text-gray-500 mt-1 space-y-1">
              <div>Model: {thread.modelThread.provider}/{thread.modelThread.model}</div>
              <div>Data: {thread.dataThread.name}</div>
              <div>System: {thread.systemPromptThread.name}</div>
              <div>Initial: {thread.initialMessageThread.name}</div>
              <div>User: {thread.userMessageThread.name}</div>
            </div>
          </div>
          <Button
            onClick={() => onRunThread(thread.id)}
            disabled={thread.isRunning}
            variant="outline"
            size="sm"
            className="flex-shrink-0"
          >
            {thread.isRunning ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <ScrollArea className="h-64">
          {thread.responses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No responses yet</p>
              <p className="text-xs mt-1">Click run to execute this thread</p>
            </div>
          ) : (
            <div className="space-y-3">
              {thread.responses.map((response, index) => (
                <ResponseCard
                  key={index}
                  response={response}
                  responseId={`${thread.id}-${index}`}
                  copiedStates={copiedStates}
                  onCopy={handleCopyResponse}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface ResponseCardProps {
  response: BiographerResponse;
  responseId: string;
  copiedStates: Record<string, boolean>;
  onCopy: (text: string, buttonId: string) => void;
}

function ResponseCard({
  response,
  responseId,
  copiedStates,
  onCopy
}: ResponseCardProps) {
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">{response.name}</h4>
        <div className="flex items-center gap-1">
          {response.duration && (
                      <MetricsBadge
            duration={response.duration}
            tokenCount={response.tokenCount}
            wordCount={response.wordCount}
            cost={response.cost}
          />
          )}
          <CopyButton
            text={response.response}
            buttonId={responseId}
            copiedStates={copiedStates}
            onCopy={onCopy}
            disabled={response.loading}
            variant="ghost"
            size="sm"
          />
        </div>
      </div>
      
      <div className="text-sm">
        {response.loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating response...
          </div>
        ) : response.error ? (
          <div className="text-red-600 bg-red-50 p-2 rounded">
            Error: {response.error}
          </div>
        ) : (
          <div className="whitespace-pre-wrap text-gray-700">
            {response.response}
          </div>
        )}
      </div>
    </div>
  );
} 