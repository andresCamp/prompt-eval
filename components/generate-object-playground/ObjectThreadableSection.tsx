/**
 * @fileoverview ObjectThreadableSection - Non-collapsing thread sections for GenerateObject
 * Adapted from ThreadableSection but without collapsing behavior during editing
 */

'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Copy, Trash2, Brain, Code, Cpu, FileJson, Eye, EyeOff } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  GenerateObjectModelThread,
  SchemaThread,
  SystemPromptThread,
  PromptDataThread,
} from './types';
import { PROVIDERS } from '@/lib/llm-providers';

interface BaseThreadSectionProps<T> {
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
}

function ThreadSection<T extends { id: string; name: string; visible: boolean }>({
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
}: BaseThreadSectionProps<T>) {
  void _copiedStates;
  void _onCopy;
  const visibleThreads = threads.filter(t => t.visible);
  const hiddenCount = threads.length - visibleThreads.length;

  return (
    <Card className={`${borderColor} border-2 bg-white dark:bg-slate-900`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-gray-900 dark:text-gray-100">{title} ({threads.length})</CardTitle>
            {hiddenCount > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">({hiddenCount} hidden)</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="text-gray-900 dark:text-gray-100">
        <div className="space-y-4">
          <Button
            onClick={onAddThread}
            variant="outline"
            className="w-full border-dashed dark:bg-slate-900 dark:text-gray-100"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {title} Thread
          </Button>
          
          <div className={`grid gap-4 ${threads.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {threads.map((thread) => (
              <div key={thread.id} className={`border rounded-lg p-4 space-y-3 bg-white dark:bg-slate-900 ${!thread.visible ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <Input
                    value={thread.name}
                    onChange={(e) => onUpdateThread(thread.id, { name: e.target.value } as Partial<T>)}
                    className="font-medium flex-1 dark:bg-slate-900 dark:text-gray-100"
                    placeholder="Thread name"
                  />
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onUpdateThread(thread.id, { visible: !thread.visible } as Partial<T>)}
                      className="h-8 w-8 dark:text-gray-100"
                    >
                      {thread.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDuplicateThread(thread.id)}
                      className="h-8 w-8 dark:text-gray-100"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {threads.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteThread(thread.id)}
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {renderContent(thread, (updates) => onUpdateThread(thread.id, updates))}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Get all models that support object generation
type ModelConfig = { id: string; capabilities?: { objectGeneration?: boolean } };
type ProviderConfig = { name: string; models: ModelConfig[] };

const getObjectGenerationModels = () => {
  const models: { provider: string; model: string; displayName: string }[] = [];

  (PROVIDERS.providers as ProviderConfig[]).forEach(provider => {
    provider.models.forEach(model => {
      if (model.capabilities?.objectGeneration) {
        models.push({
          provider: provider.name,
          model: model.id,
          displayName: `${model.id} (${provider.name})`,
        });
      }
    });
  });

  return models;
};

const OBJECT_GENERATION_MODELS = getObjectGenerationModels();

// Model Thread Section
export function ModelThreadSection({
  threads,
  onAddThread,
  onUpdateThread,
  onDeleteThread,
  onDuplicateThread,
  copiedStates,
  onCopy,
}: {
  threads: GenerateObjectModelThread[];
  onAddThread: () => void;
  onUpdateThread: (id: string, updates: Partial<GenerateObjectModelThread>) => void;
  onDeleteThread: (id: string) => void;
  onDuplicateThread: (id: string) => void;
  copiedStates: Record<string, boolean>;
  onCopy: (text: string, key: string) => void;
}) {
  const modelOptions = OBJECT_GENERATION_MODELS;
  
  return (
    <ThreadSection
      title="Models"
      threads={threads}
      icon={<Brain className="h-5 w-5 text-blue-600" />}
      borderColor="border-blue-200"
      onAddThread={onAddThread}
      onUpdateThread={onUpdateThread}
      onDeleteThread={onDeleteThread}
      onDuplicateThread={onDuplicateThread}
      copiedStates={copiedStates}
      onCopy={onCopy}
      renderContent={(thread, onUpdate) => (
        <div className="space-y-3">
          <Select
            value={thread.model}
            onValueChange={(value) => {
              const selected = modelOptions.find(m => m.model === value);
              const provider = selected?.provider || thread.provider;
              onUpdate({ model: value, provider, name: value });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map(m => (
                <SelectItem key={`${m.provider}:${m.model}`} value={m.model}>{m.displayName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-xs text-gray-500">Provider: {thread.provider}</div>
        </div>
      )}
    />
  );
}

// Schema Thread Section  
export function SchemaThreadSection({
  threads,
  onAddThread,
  onUpdateThread,
  onDeleteThread,
  onDuplicateThread,
  copiedStates,
  onCopy,
}: {
  threads: SchemaThread[];
  onAddThread: () => void;
  onUpdateThread: (id: string, updates: Partial<SchemaThread>) => void;
  onDeleteThread: (id: string) => void;
  onDuplicateThread: (id: string) => void;
  copiedStates: Record<string, boolean>;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <ThreadSection
      title="Schemas"
      threads={threads}
      icon={<Code className="h-5 w-5 text-green-600" />}
      borderColor="border-green-200"
      onAddThread={onAddThread}
      onUpdateThread={onUpdateThread}
      onDeleteThread={onDeleteThread}
      onDuplicateThread={onDuplicateThread}
      copiedStates={copiedStates}
      onCopy={onCopy}
      renderContent={(thread, onUpdate) => (
        <div className="space-y-3">
          <Textarea
            value={thread.schema}
            onChange={(e) => onUpdate({ schema: e.target.value })}
            placeholder="Enter Zod schema..."
            className="font-mono text-xs h-40"
          />
          <Input
            value={thread.schemaDescription || ''}
            onChange={(e) => onUpdate({ schemaDescription: e.target.value })}
            placeholder="Schema description (optional)"
            className="text-sm"
          />
        </div>
      )}
    />
  );
}

// System Prompt Thread Section
export function SystemPromptThreadSection({
  threads,
  onAddThread,
  onUpdateThread,
  onDeleteThread,
  onDuplicateThread,
  copiedStates,
  onCopy,
}: {
  threads: SystemPromptThread[];
  onAddThread: () => void;
  onUpdateThread: (id: string, updates: Partial<SystemPromptThread>) => void;
  onDeleteThread: (id: string) => void;
  onDuplicateThread: (id: string) => void;
  copiedStates: Record<string, boolean>;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <ThreadSection
      title="System Prompts"
      threads={threads}
      icon={<Cpu className="h-5 w-5 text-yellow-600" />}
      borderColor="border-yellow-200"
      onAddThread={onAddThread}
      onUpdateThread={onUpdateThread}
      onDeleteThread={onDeleteThread}
      onDuplicateThread={onDuplicateThread}
      copiedStates={copiedStates}
      onCopy={onCopy}
      renderContent={(thread, onUpdate) => (
        <Textarea
          value={thread.prompt}
          onChange={(e) => onUpdate({ prompt: e.target.value })}
          placeholder="Enter system prompt..."
          className="text-sm h-32"
        />
      )}
    />
  );
}

// Prompt Data Thread Section
export function PromptDataThreadSection({
  threads,
  onAddThread,
  onUpdateThread,
  onDeleteThread,
  onDuplicateThread,
  copiedStates,
  onCopy,
}: {
  threads: PromptDataThread[];
  onAddThread: () => void;
  onUpdateThread: (id: string, updates: Partial<PromptDataThread>) => void;
  onDeleteThread: (id: string) => void;
  onDuplicateThread: (id: string) => void;
  copiedStates: Record<string, boolean>;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <ThreadSection
      title="Prompt Data"
      threads={threads}
      icon={<FileJson className="h-5 w-5 text-orange-600" />}
      borderColor="border-orange-200"
      onAddThread={onAddThread}
      onUpdateThread={onUpdateThread}
      onDeleteThread={onDeleteThread}
      onDuplicateThread={onDuplicateThread}
      copiedStates={copiedStates}
      onCopy={onCopy}
      renderContent={(thread, onUpdate) => (
        <Textarea
          value={thread.prompt}
          onChange={(e) => onUpdate({ prompt: e.target.value })}
          placeholder="Enter prompt or JSON data..."
          className="font-mono text-xs h-40"
        />
      )}
    />
  );
}