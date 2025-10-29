/**
 * @fileoverview Results Grid for GenerateObject Playground
 * Uses shared ResultsGrid component with object-specific adapters
 */

'use client';

import { GenerateObjectExecutionThread, GenerateObjectResult } from './types';
import { ResultsGrid as SharedResultsGrid } from '@/components/prompt-playground/shared/ResultsGrid';
import * as adapters from './adapters';

interface ResultsGridProps {
  executionThreads: GenerateObjectExecutionThread[];
  onRunThread: (threadId: string) => void;
  onCopy: (text: string, key: string) => void;
  copiedStates: Record<string, boolean>;
}

export function ResultsGrid({
  executionThreads,
  onRunThread,
  onCopy,
  copiedStates,
}: ResultsGridProps) {
  return (
    <SharedResultsGrid<GenerateObjectExecutionThread, GenerateObjectResult>
      executionThreads={executionThreads}
      onRunThread={onRunThread}
      onCopy={onCopy}
      copiedStates={copiedStates}
      getThreadId={adapters.getThreadId}
      getThreadName={adapters.getThreadName}
      getThreadVisible={adapters.getThreadVisible}
      getThreadRunning={adapters.getThreadRunning}
      getThreadResult={adapters.getThreadResult}
      getThreadKey={adapters.getThreadKey}
      buildSnapshot={adapters.buildSnapshot}
      getResultText={adapters.getResultText}
      getResultError={adapters.getResultError}
      getResultValidationError={adapters.getResultValidationError}
      getResultDuration={adapters.getResultDuration}
      getResultUsage={adapters.getResultUsage}
      getResultObject={adapters.getResultObject}
      renderResultContent={adapters.renderResultContent}
      getThreadFields={adapters.getThreadFields}
      sortOptions={adapters.sortOptions}
    />
  );
}
