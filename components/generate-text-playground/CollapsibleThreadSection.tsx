/**
 * @fileoverview Collapsible thread sections for GenerateText
 * Uses shared CollapsibleThreadSection component with text-specific content
 */

'use client';

import React, { useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Cpu, FileJson } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  GenerateTextModelThread,
  SystemPromptThread,
  PromptDataThread,
} from './types';
import { PROVIDERS } from '@/lib/llm-providers';
import { detectVariables, getVariableDefaults } from '@/components/prompt-playground/shared/utils';
import { VariableInputs } from '@/components/prompt-playground/shared/VariableInputs';
import { CollapsibleThreadSection } from '@/components/prompt-playground/shared/CollapsibleThreadSection';

// Get all models that support text generation (assume all language models do)
const getTextGenerationModels = () => {
  const models: { provider: string; model: string; displayName: string }[] = [];

  PROVIDERS.providers.forEach(provider => {
    provider.models.forEach(model => {
      // Text generation is supported by all language models (those with objectGeneration or invoke: "language")
      if (model.capabilities.objectGeneration || model.invoke === "language") {
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

const TEXT_GENERATION_MODELS = getTextGenerationModels();
const PROVIDER_OPTIONS = [...new Set(TEXT_GENERATION_MODELS.map(m => m.provider))];

// Model Thread Section with Provider Selection
export function TextModelThreadSection({
  threads,
  onAddThread,
  onUpdateThread,
  onDeleteThread,
  onDuplicateThread,
  copiedStates,
  onCopy,
}: {
  threads: GenerateTextModelThread[];
  onAddThread: () => void;
  onUpdateThread: (id: string, updates: Partial<GenerateTextModelThread>) => void;
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
        const providerModels = TEXT_GENERATION_MODELS.filter(m => m.provider === thread.provider);

        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600">Provider</label>
              <Select
                value={thread.provider}
                onValueChange={(value) => {
                  const firstModel = TEXT_GENERATION_MODELS.find(m => m.provider === value);
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
      <Textarea
        value={thread.prompt}
        onChange={(e) => {
          const newPrompt = e.target.value;
          const newVariables = detectVariables(newPrompt);
          const updatedVariables = getVariableDefaults(newVariables, thread.variables);
          onUpdate({ prompt: newPrompt, variables: updatedVariables });
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
export function TextSystemPromptThreadSection({
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
      <Textarea
        value={thread.prompt}
        onChange={(e) => {
          const newPrompt = e.target.value;
          const newVariables = detectVariables(newPrompt);
          const updatedVariables = getVariableDefaults(newVariables, thread.variables);
          onUpdate({ prompt: newPrompt, variables: updatedVariables });
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
export function TextPromptDataThreadSection({
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
