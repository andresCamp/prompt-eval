/**
 * @fileoverview Collapsible thread sections for GenerateObject
 * Maintains state when collapsed but allows collapsing for space management
 */

'use client';

import React, { ReactNode, useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Copy, Trash2, Brain, Code, Cpu, FileJson, Eye, EyeOff, ChevronDown, Sparkles, Loader2, Undo2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  GenerateObjectModelThread,
  SchemaThread,
  SystemPromptThread,
  PromptDataThread,
} from './types';
import { PROVIDERS } from '@/lib/llm-providers';
import { detectVariables, getVariableDefaults } from './utils';
import { VariableInputs } from './VariableInputs';

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

// Schema content component - separate to handle hooks properly
function SchemaContent({
  thread,
  onUpdate
}: {
  thread: SchemaThread;
  onUpdate: (updates: Partial<SchemaThread>) => void
}) {
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [originalSchema, setOriginalSchema] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Test schema validity when it changes
  useEffect(() => {
    if (!thread.schema.trim()) {
      setValidationError(null);
      return;
    }

    try {
      const testFunction = new Function('z', `return ${thread.schema}`);
      // Syntax is valid
      setValidationError(null);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Invalid schema syntax';
      setValidationError(errorMsg);
    }
  }, [thread.schema]);

  // Auto-normalize on validation error (debounced)
  useEffect(() => {
    if (!validationError || isNormalizing || originalSchema) return;

    const timer = setTimeout(() => {
      handleNormalize(true);
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validationError, isNormalizing, originalSchema]);

  const handleNormalize = async (isAutomatic = false) => {
    if (!thread.schema.trim()) return;

    // Store original schema for undo
    if (!originalSchema && !isAutomatic) {
      setOriginalSchema(thread.schema);
    } else if (!originalSchema && isAutomatic) {
      setOriginalSchema(thread.schema);
    }

    setIsNormalizing(true);
    try {
      const response = await fetch('/api/normalize-schema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schema: thread.schema }),
      });

      const data = await response.json();
      if (data.success && data.normalizedSchema) {
        onUpdate({ schema: data.normalizedSchema });
        if (!isAutomatic) {
          setOriginalSchema(thread.schema);
        }
      } else {
        console.error('Normalization failed:', data.error);
        // Clear original on failure
        setOriginalSchema(null);
      }
    } catch (error) {
      console.error('Error normalizing schema:', error);
      setOriginalSchema(null);
    } finally {
      setIsNormalizing(false);
    }
  };

  const handleUndo = () => {
    if (originalSchema) {
      onUpdate({ schema: originalSchema });
      setOriginalSchema(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Textarea
          value={thread.schema}
          onChange={(e) => {
            onUpdate({ schema: e.target.value });
            // Clear original when user manually edits after normalization
            if (originalSchema) {
              setOriginalSchema(null);
            }
          }}
          placeholder="Enter Zod schema..."
          className="font-mono text-xs h-40 pr-20"
          onClick={(e) => e.stopPropagation()}
        />
        <Button
          size="sm"
          variant="outline"
          className="absolute top-2 right-2"
          onClick={(e) => {
            e.stopPropagation();
            if (originalSchema) {
              handleUndo();
            } else {
              handleNormalize();
            }
          }}
          disabled={isNormalizing || !thread.schema.trim()}
          title={originalSchema ? "Undo normalization" : "Normalize schema using AI"}
        >
          {isNormalizing ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Normalizing
            </>
          ) : originalSchema ? (
            <>
              <Undo2 className="h-3 w-3 mr-1" />
              Undo
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3 mr-1" />
              Normalize
            </>
          )}
        </Button>
      </div>
      <Input
        value={thread.schemaDescription || ''}
        onChange={(e) => onUpdate({ schemaDescription: e.target.value })}
        placeholder="Schema description (optional)"
        className="text-sm"
        onClick={(e) => e.stopPropagation()}
      />
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
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [originalPrompt, setOriginalPrompt] = useState<string | null>(null);

  const detectedVariables = useMemo(
    () => detectVariables(thread.prompt),
    [thread.prompt]
  );

  const handleNormalize = async () => {
    if (!thread.prompt.trim()) return;

    // Store original prompt for undo
    setOriginalPrompt(thread.prompt);

    setIsNormalizing(true);
    try {
      const response = await fetch('/api/normalize-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: thread.prompt }),
      });

      const data = await response.json();
      if (data.success && data.normalizedPrompt) {
        const newVariables = detectVariables(data.normalizedPrompt);
        const updatedVariables = getVariableDefaults(newVariables, thread.variables);
        onUpdate({ prompt: data.normalizedPrompt, variables: updatedVariables });
      } else {
        console.error('Normalization failed:', data.error);
        setOriginalPrompt(null);
      }
    } catch (error) {
      console.error('Error normalizing prompt:', error);
      setOriginalPrompt(null);
    } finally {
      setIsNormalizing(false);
    }
  };

  const handleUndo = () => {
    if (originalPrompt) {
      const newVariables = detectVariables(originalPrompt);
      const updatedVariables = getVariableDefaults(newVariables, thread.variables);
      onUpdate({ prompt: originalPrompt, variables: updatedVariables });
      setOriginalPrompt(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Textarea
          value={thread.prompt}
          onChange={(e) => {
            const newPrompt = e.target.value;
            const newVariables = detectVariables(newPrompt);
            const updatedVariables = getVariableDefaults(newVariables, thread.variables);
            onUpdate({ prompt: newPrompt, variables: updatedVariables });
            // Clear original when user manually edits after normalization
            if (originalPrompt) {
              setOriginalPrompt(null);
            }
          }}
          placeholder="Enter system prompt..."
          className="text-sm h-32 pr-20"
          onClick={(e) => e.stopPropagation()}
        />
        <Button
          size="sm"
          variant="outline"
          className="absolute top-2 right-2"
          onClick={(e) => {
            e.stopPropagation();
            if (originalPrompt) {
              handleUndo();
            } else {
              handleNormalize();
            }
          }}
          disabled={isNormalizing || !thread.prompt.trim()}
          title={originalPrompt ? "Undo normalization" : "Improve prompt using AI"}
        >
          {isNormalizing ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Improving
            </>
          ) : originalPrompt ? (
            <>
              <Undo2 className="h-3 w-3 mr-1" />
              Undo
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3 mr-1" />
              Improve
            </>
          )}
        </Button>
      </div>
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
        placeholder="Enter prompt or JSON data..."
        className="font-mono text-xs h-40"
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
        <PromptDataContent thread={thread} onUpdate={onUpdate} />
      )}
    />
  );
}