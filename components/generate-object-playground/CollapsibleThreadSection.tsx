/**
 * @fileoverview Collapsible thread sections for GenerateObject
 * Uses shared CollapsibleThreadSection component with object-specific content
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Brain, Code, Cpu, FileJson, Sparkles, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  GenerateObjectModelThread,
  SchemaThread,
  SystemPromptThread,
  PromptDataThread,
} from './types';
import { PROVIDERS } from '@/lib/llm-providers';
import { detectVariables, getVariableDefaults } from '@/components/prompt-playground/shared/utils';
import { VariableInputs } from '@/components/prompt-playground/shared/VariableInputs';
import { CollapsibleThreadSection } from '@/components/prompt-playground/shared/CollapsibleThreadSection';
import { CopyableTextarea } from '@/components/prompt-playground/shared/CopyableInput';

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
      getThreadContent={(thread) => `${thread.provider} ${thread.model}`}
      contentType="model"
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

// Schema content component - separate to handle hooks properly
function SchemaContent({
  thread,
  onUpdate
}: {
  thread: SchemaThread;
  onUpdate: (updates: Partial<SchemaThread>) => void
}) {
  const [isGeneratingSchema, setIsGeneratingSchema] = useState(false);

  const handleGenerateSchema = async () => {
    setIsGeneratingSchema(true);
    try {
      const response = await fetch('/api/generate-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: thread.schemaDescription })
      });
      const data = await response.json();
      if (data.success && data.schema) {
        onUpdate({ schema: data.schema });
      }
    } catch (error) {
      console.error('Failed to generate schema:', error);
    } finally {
      setIsGeneratingSchema(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-gray-600">Schema Description</label>
        <CopyableTextarea
          value={thread.schemaDescription || ''}
          onChange={(e) => onUpdate({ schemaDescription: e.target.value })}
          onClear={() => onUpdate({ schemaDescription: '' })}
          placeholder="Describe what the schema should represent..."
          className="text-sm h-20"
          onClick={(e) => e.stopPropagation()}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateSchema}
          disabled={isGeneratingSchema || !thread.schemaDescription}
          className="mt-2 w-full"
        >
          {isGeneratingSchema ? (
            <>
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3 mr-2" />
              Generate Schema
            </>
          )}
        </Button>
      </div>
      <div>
        <label className="text-xs text-gray-600">JSON Schema</label>
        <CopyableTextarea
          value={thread.schema}
          onChange={(e) => onUpdate({ schema: e.target.value })}
          onClear={() => onUpdate({ schema: '' })}
          placeholder='{"type": "object", "properties": {...}}'
          className="text-sm font-mono h-40"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
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
      getThreadContent={(thread) => thread.schema}
      contentType="schema"
      renderContent={(thread, onUpdate) => (
        <SchemaContent thread={thread} onUpdate={onUpdate} />
      )}
    />
  );
}

// System Prompt content component - separate to handle hooks properly
function SystemPromptContent({
  thread,
  onUpdate
}: {
  thread: SystemPromptThread;
  onUpdate: (updates: Partial<SystemPromptThread>) => void
}) {
  const detectedVariables = useMemo(
    () => detectVariables(thread.prompt),
    [thread.prompt]
  );

  return (
    <div className="space-y-3">
      <CopyableTextarea
        value={thread.prompt}
        onChange={(e) => {
          const newPrompt = e.target.value;
          const newVariables = detectVariables(newPrompt);
          const updatedVariables = getVariableDefaults(newVariables, thread.variables);
          onUpdate({ prompt: newPrompt, variables: updatedVariables });
        }}
        onClear={() => {
          onUpdate({ prompt: '', variables: {} });
        }}
        placeholder="Enter system prompt..."
        className="text-sm h-32"
        onClick={(e) => e.stopPropagation()}
      />
      <VariableInputs
        variableNames={detectedVariables}
        variables={thread.variables}
        onVariableChange={(variables) => onUpdate({ variables })}
      />
    </div>
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
      getThreadContent={(thread) => thread.prompt}
      contentType="system-prompt"
      renderContent={(thread, onUpdate) => (
        <SystemPromptContent thread={thread} onUpdate={onUpdate} />
      )}
    />
  );
}

// Prompt Data content component - separate to handle hooks properly
function PromptDataContent({
  thread,
  onUpdate
}: {
  thread: PromptDataThread;
  onUpdate: (updates: Partial<PromptDataThread>) => void
}) {
  const detectedVariables = useMemo(
    () => detectVariables(thread.prompt),
    [thread.prompt]
  );

  return (
    <div className="space-y-3">
      <CopyableTextarea
        value={thread.prompt}
        onChange={(e) => {
          const newPrompt = e.target.value;
          const newVariables = detectVariables(newPrompt);
          const updatedVariables = getVariableDefaults(newVariables, thread.variables);
          onUpdate({ prompt: newPrompt, variables: updatedVariables });
        }}
        onClear={() => {
          onUpdate({ prompt: '', variables: {} });
        }}
        placeholder="Enter user prompt..."
        className="text-sm h-32"
        onClick={(e) => e.stopPropagation()}
      />
      <VariableInputs
        variableNames={detectedVariables}
        variables={thread.variables}
        onVariableChange={(variables) => onUpdate({ variables })}
      />
    </div>
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
      title="Prompts"
      threads={threads}
      icon={<FileJson className="h-5 w-5 text-orange-600" />}
      borderColor="border-orange-200"
      onAddThread={onAddThread}
      onUpdateThread={onUpdateThread}
      onDeleteThread={onDeleteThread}
      onDuplicateThread={onDuplicateThread}
      copiedStates={copiedStates}
      onCopy={onCopy}
      getThreadContent={(thread) => thread.prompt}
      contentType="prompt"
      renderContent={(thread, onUpdate) => (
        <PromptDataContent thread={thread} onUpdate={onUpdate} />
      )}
    />
  );
}
