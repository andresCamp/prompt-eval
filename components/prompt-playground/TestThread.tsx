/**
 * @fileoverview TestThread - Individual test thread component for multi-threaded testing
 * 
 * This component represents a single test thread within a unified system.
 * Each thread can have different model/provider configurations but shares
 * the same system prompts and user messages.
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Loader2, Plus, Trash2 } from 'lucide-react';
import { TestThreadProps } from './shared/types';
import { ResponsesSection } from './ResponsesSection';
import { ProviderSelector, ModelSelector } from './shared/ModelSelector';
import { formatAllResponses } from './shared/utils';

export function TestThread({
  thread,
  onUpdateThread,
  onRunThread,
  onDuplicateThread,
  onDeleteThread,
  canDelete
}: TestThreadProps) {
  const copyToClipboard = (text: string, buttonId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      onUpdateThread(thread.id, {
        copiedStates: { ...thread.copiedStates, [buttonId]: true }
      });
      
      // Hide checkmark after 3 seconds
      setTimeout(() => {
        onUpdateThread(thread.id, {
          copiedStates: { ...thread.copiedStates, [buttonId]: false }
        });
      }, 3000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const copyAllResponses = () => {
    const allResponses = formatAllResponses(thread.responses);
    copyToClipboard(allResponses, `copy-all-${thread.id}`);
  };

  return (
    <div className="space-y-4">
      {/* Thread Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg">{thread.name}</CardTitle>
          <div className="flex items-center gap-2">
            <ProviderSelector 
              value={thread.selectedProvider}
              onValueChange={(provider: string) => onUpdateThread(thread.id, { selectedProvider: provider })}
            />
            <ModelSelector 
              value={thread.selectedModel}
              onValueChange={(model: string) => onUpdateThread(thread.id, { selectedModel: model })}
            />
            <Button
              onClick={() => onRunThread(thread.id)}
              disabled={thread.isRunning}
              size="sm"
              className="flex items-center gap-2"
            >
              {thread.isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Test
                </>
              )}
            </Button>
            <Button
              onClick={() => onDuplicateThread(thread.id)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Duplicate
            </Button>
            {canDelete && (
              <Button
                onClick={() => onDeleteThread(thread.id)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Responses Section */}
      {thread.responses.length > 0 && (
        <ResponsesSection
          responses={thread.responses}
          copiedStates={thread.copiedStates}
          onCopyResponse={copyToClipboard}
          onCopyAllResponses={copyAllResponses}
        />
      )}
    </div>
  );
} 