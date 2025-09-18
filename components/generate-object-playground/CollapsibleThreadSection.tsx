/**
 * @fileoverview Collapsible thread sections for GenerateObject
 * Maintains state when collapsed but allows collapsing for space management
 */

'use client';

import React, { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Copy, Trash2, Brain, Code, Cpu, FileJson, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  GenerateObjectModelThread,
  SchemaThread,
  SystemPromptThread,
  PromptDataThread,
} from './types';
import { PROVIDERS } from '@/lib/llm-providers';

// Get all models that support object generation
const getObjectGenerationModels = () => {
  const models: { provider: string; model: string; displayName: string }[] = [];
  
  PROVIDERS.providers.forEach(provider => {
    provider.models.forEach(model => {
      if (model.capabilities.objectGeneration) {
        models.push({
          provider: provider.name,
          model: model.id,
          displayName: `${model.id} (${provider.name})`
        });
      }
    });
  });
  
  return models;
};

const OBJECT_GENERATION_MODELS = getObjectGenerationModels();
const PROVIDER_OPTIONS = [...new Set(OBJECT_GENERATION_MODELS.map(m => m.provider))];

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
  defaultOpen?: boolean;
}

type BaseThread = { id: string; name: string; visible: boolean };

function CollapsibleThreadSection<T extends BaseThread>({
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
  defaultOpen = true,
}: BaseThreadSectionProps<T>) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  void _copiedStates;
  void _onCopy;
  const visibleThreads = threads.filter(t => t.visible);
  const hiddenCount = threads.length - visibleThreads.length;
  const applyUpdate = (thread: T, updates: Partial<T>) => {
    onUpdateThread(thread.id, updates);
  };

  return (
    <Card className={`${borderColor} border-2`}>
      <CardHeader 
        className="cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle>{title} ({threads.length})</CardTitle>
            {hiddenCount > 0 && (
              <span className="text-sm text-gray-500">({hiddenCount} hidden)</span>
            )}
          </div>
          <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
              Add {title} Thread
            </Button>
            
            <div className={`grid gap-4 ${threads.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {threads.map((thread) => (
                <div key={thread.id} className={`border rounded-lg p-4 space-y-3 ${!thread.visible ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      value={thread.name}
                      onChange={(e) => applyUpdate(thread, { name: e.target.value } as Partial<T>)}
                      className="font-medium flex-1"
                      placeholder="Thread name"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          applyUpdate(thread, { visible: !thread.visible } as Partial<T>);
                        }}
                        className="h-8 w-8"
                      >
                        {thread.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateThread(thread.id);
                        }}
                        className="h-8 w-8"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteThread(thread.id);
                        }}
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete thread"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {renderContent(thread, (updates) => applyUpdate(thread, updates))}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}


// Model Thread Section with Provider Selection
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
  return (
    <CollapsibleThreadSection
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
      renderContent={(thread, onUpdate) => {
        const providerModels = OBJECT_GENERATION_MODELS.filter(m => m.provider === thread.provider);
        
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600">Provider</label>
              <Select
                value={thread.provider}
                onValueChange={(value) => {
                  const firstModel = OBJECT_GENERATION_MODELS.find(m => m.provider === value);
                  onUpdate({ 
                    provider: value, 
                    model: firstModel?.model || '',
                    name: firstModel?.model || value
                  });
                }}
              >
                <SelectTrigger onClick={(e) => e.stopPropagation()}>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_OPTIONS.map(provider => (
                    <SelectItem key={provider} value={provider}>{provider}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Model</label>
              <Select
                value={thread.model}
                onValueChange={(value) => {
                  onUpdate({ model: value, name: value });
                }}
              >
                <SelectTrigger onClick={(e) => e.stopPropagation()}>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {providerModels.map(model => (
                    <SelectItem key={model.model} value={model.model}>
                      {model.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      }}
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
    <CollapsibleThreadSection
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
            onClick={(e) => e.stopPropagation()}
          />
          <Input
            value={thread.schemaDescription || ''}
            onChange={(e) => onUpdate({ schemaDescription: e.target.value })}
            placeholder="Schema description (optional)"
            className="text-sm"
            onClick={(e) => e.stopPropagation()}
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
    <CollapsibleThreadSection
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
          onClick={(e) => e.stopPropagation()}
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
    <CollapsibleThreadSection
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
          onClick={(e) => e.stopPropagation()}
        />
      )}
    />
  );
}