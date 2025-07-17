/**
 * @fileoverview ThreadableSection component for pipeline threading
 * 
 * This component provides a collapsible interface for any pipeline stage
 * that can be threaded (split into multiple variants).
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Copy, Trash2, ChevronDown, Hash, FileText, Check } from 'lucide-react';
import { ModelSelector } from './shared/ModelSelector';
import { CopyButton } from './shared/CopyButton';
import {
  MODEL_PROVIDER_MAP,
} from './shared/types';
import type { 
  ModelThread, 
  DataThread, 
  SystemPromptThread, 
  InitialMessageThread, 
  UserMessageThread,
  ThreadableStage
} from './shared/types';

// Utility functions for metrics
const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

const estimateTokens = (text: string): number => {
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
};

// Base props for all threadable sections
interface BaseThreadableSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  onAddThread: () => void;
  canDelete: boolean;
  copiedStates: Record<string, boolean>;
  onCopy: (text: string, id: string) => void;
}

// Model Thread Section
interface ModelThreadSectionProps extends BaseThreadableSectionProps {
  threads: ModelThread[];
  onUpdateThread: (threadId: string, updates: Partial<ModelThread>) => void;
  onDeleteThread: (threadId: string) => void;
  onDuplicateThread: (threadId: string) => void;
}

export function ModelThreadSection({
  title,
  threads,
  isOpen,
  onToggle,
  onAddThread,
  onUpdateThread,
  onDeleteThread,
  onDuplicateThread,
  canDelete,
  copiedStates,
  onCopy
}: ModelThreadSectionProps) {
  const totalContent = threads.map(t => `${t.name} ${t.provider} ${t.model}`).join(' ');
  const totalTokens = estimateTokens(totalContent);
  const totalWords = countWords(totalContent);
  const previewText = threads.length > 0 
    ? `${threads.length} thread${threads.length > 1 ? 's' : ''}: ${threads[0].provider}/${threads[0].model}${threads.length > 1 ? '...' : ''}`
    : 'No threads';

  return (
    <Card className="cursor-pointer hover:bg-muted transition-colors" onClick={onToggle}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {previewText}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              <span>{totalTokens}</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>{totalWords}</span>
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onCopy(totalContent, 'models-all');
            }}
            className="h-8 w-8 p-0 cursor-pointer hover:bg-muted hover:scale-105 transition-all"
          >
            {copiedStates['models-all'] ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
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
              Add Model Thread
            </Button>
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${threads.length}, 1fr)` }}>
              {threads.map((thread) => (
                <div key={thread.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Input
                      value={thread.name}
                      onChange={(e) => onUpdateThread(thread.id, { name: e.target.value })}
                      className="font-medium"
                      placeholder="Thread name"
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateThread(thread.id);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteThread(thread.id);
                          }}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Model</label>
                      <Select
                        value={thread.model}
                        onValueChange={(value) => {
                          // Auto-update provider based on selected model
                          const provider = MODEL_PROVIDER_MAP[value] || thread.provider;
                          onUpdateThread(thread.id, { model: value, provider });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4 (20250514)</SelectItem>
                          <SelectItem value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet (20250219)</SelectItem>
                          <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (20241022)</SelectItem>
                          <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                          <SelectItem value="gemini-2.5-flash-lite-preview-06-17">Gemini 2.5 Flash Lite</SelectItem>
                          <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                          <SelectItem value="moonshotai/kimi-k2-instruct">Kimi-K2 Instruct</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// For backward compatibility, export the original component name
export const ThreadableSection = ModelThreadSection;

// Individual render functions for use in other components
export const renderModelThread = (thread: ModelThread, onUpdate: (updates: Partial<ModelThread>) => void) => (
  <div className="space-y-3">
    <div>
      <label className="text-sm font-medium">Model</label>
      <Select
        value={thread.model}
        onValueChange={(value) => onUpdate({ model: value, provider: MODEL_PROVIDER_MAP[value] || thread.provider })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4 (20250514)</SelectItem>
          <SelectItem value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet (20250219)</SelectItem>
          <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (20241022)</SelectItem>
          <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
          <SelectItem value="gemini-2.5-flash-lite-preview-06-17">Gemini 2.5 Flash Lite</SelectItem>
          <SelectItem value="gpt-4o">GPT-4o</SelectItem>
          <SelectItem value="moonshotai/kimi-k2-instruct">Kimi-K2 Instruct</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);

export const renderDataThread = (thread: DataThread, onUpdate: (updates: Partial<DataThread>) => void) => (
  <div className="space-y-3">
    <div>
      <Textarea
        value={thread.data}
        onChange={(e) => onUpdate({ data: e.target.value })}
        placeholder="Enter biographer data (JSON format)"
        className="min-h-[100px] font-mono text-sm bg-white"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  </div>
);

export const renderSystemPromptThread = (thread: SystemPromptThread, onUpdate: (updates: Partial<SystemPromptThread>) => void) => (
  <div className="space-y-3">
    <div>
      <Textarea
        value={thread.prompt}
        onChange={(e) => onUpdate({ prompt: e.target.value })}
        placeholder="Enter system prompt"
        className="min-h-[100px] bg-white"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  </div>
);

export const renderInitialMessageThread = (thread: InitialMessageThread, onUpdate: (updates: Partial<InitialMessageThread>) => void) => (
  <div className="space-y-3">
    <div>
      <Textarea
        value={thread.message}
        onChange={(e) => onUpdate({ message: e.target.value })}
        placeholder="Enter initial message"
        className="min-h-[80px] bg-white"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  </div>
);

export const renderUserMessageThread = (thread: UserMessageThread, onUpdate: (updates: Partial<UserMessageThread>) => void) => (
  <div className="space-y-3">
    <div>
      <Textarea
        value={thread.message}
        onChange={(e) => onUpdate({ message: e.target.value })}
        placeholder="Enter user message"
        className="min-h-[80px] bg-white"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  </div>
); 