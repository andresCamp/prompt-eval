'use client';

import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Copy, Trash2, Eye, EyeOff, ChevronDown, GitBranchPlus, Check } from 'lucide-react';
import {
  ASPECT_RATIOS,
  IMAGE_PROVIDERS,
  ImageProvider,
  ImagePromptThread,
  ReveMode
} from './types';
import { ImageUpload } from './ImageUpload';
import { getRequiredImages } from './types';
import { generateId, detectVariables, getVariableDefaults } from '@/components/prompt-playground/shared/utils';
import { releaseImage } from '@/lib/image-storage';
import { VariableInputs } from '@/components/prompt-playground/shared/VariableInputs';

interface BaseThread {
  id: string;
  name: string;
  visible: boolean;
}

interface CollapsibleProps<T extends BaseThread> {
  title: string;
  threads: T[];
  icon: ReactNode;
  accent: string;
  onAddThread: () => void;
  onUpdateThread: (id: string, updates: Partial<T>) => void;
  onDeleteThread: (id: string) => void;
  onDuplicateThread: (id: string) => void;
  defaultOpen?: boolean;
  children: (thread: T, onUpdate: (updates: Partial<T>) => void) => ReactNode;
  minThreads?: number;
}

function CollapsibleThreadSection<T extends BaseThread>({
  title,
  threads,
  icon,
  accent,
  onAddThread,
  onUpdateThread,
  onDeleteThread,
  onDuplicateThread,
  defaultOpen = true,
  children,
  minThreads = 1,
}: CollapsibleProps<T>) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hiddenCount = threads.filter(t => !t.visible).length;

  const handleUpdate = (thread: T, updates: Partial<T>) => {
    onUpdateThread(thread.id, updates);
  };

  return (
    <Card className={`${accent} border-2`}>
      <CardHeader className="cursor-pointer" onClick={() => setIsOpen(prev => !prev)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle>{title} ({threads.length})</CardTitle>
            {hiddenCount > 0 && (
              <span className="text-sm text-muted-foreground">({hiddenCount} hidden)</span>
            )}
          </div>
          <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent>
          <div className="space-y-4">
            <Button
              type="button"
              onClick={onAddThread}
              variant="outline"
              className="w-full border-dashed"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add {title} Thread
            </Button>
            <div className={`grid gap-4 ${threads.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {threads.map(thread => (
                <div key={thread.id} className={`rounded-lg border p-4 space-y-3 ${thread.visible ? '' : 'opacity-50'}`}>
                  <div className="flex items-center gap-2">
                    <Input
                      value={thread.name}
                      onChange={event => handleUpdate(thread, { name: event.target.value } as Partial<T>)}
                      placeholder="Thread name"
                      className="font-medium"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleUpdate(thread, { visible: !thread.visible } as Partial<T>)}
                      className="h-8 w-8"
                    >
                      {thread.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onDuplicateThread(thread.id)}
                      className="h-8 w-8"
                      title="Duplicate thread"
                    >
                      <GitBranchPlus className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700"
                      onClick={() => {
                        if (threads.length > minThreads) onDeleteThread(thread.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {children(thread, updates => handleUpdate(thread, updates))}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Prompt Threads -----------------------------------

const REVE_MODE_LABELS: Record<ReveMode, string> = {
  create: 'Create',
  remix: 'Remix',
  edit: 'Edit'
};

function PromptModeTabs({
  provider,
  mode,
  onChange
}: {
  provider: ImageProvider;
  mode?: ReveMode;
  onChange: (mode?: ReveMode) => void;
}) {
  if (provider !== 'reve') {
    return null;
  }

  return (
    <Tabs value={mode ?? 'create'} onValueChange={(value) => onChange(value as ReveMode)}>
      <TabsList className="grid grid-cols-3">
        {Object.entries(REVE_MODE_LABELS).map(([key, label]) => (
          <TabsTrigger key={key} value={key}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export function PromptThreadSection({
  threads,
  onThreadsChange,
  copiedStates,
  onCopy,
}: {
  threads: ImagePromptThread[];
  onThreadsChange: (threads: ImagePromptThread[]) => void;
  copiedStates: Record<string, boolean>;
  onCopy: (text: string, key: string) => void;
}) {
  const handleUpdate = (id: string, updates: Partial<ImagePromptThread>) => {
    onThreadsChange(threads.map(thread => (thread.id === id ? { ...thread, ...updates } : thread)));
  };

  const handleAddThread = () => {
    const newThread: ImagePromptThread = {
      id: generateId(),
      name: `Prompt ${threads.length + 1}`,
      provider: 'google',
      prompt: '',
      referenceImageIds: [],
      visible: true
    };
    onThreadsChange([...threads, newThread]);
  };

  const handleDuplicate = (id: string) => {
    const thread = threads.find(t => t.id === id);
    if (!thread) return;
    const copy: ImagePromptThread = {
      ...thread,
      id: generateId(),
      name: `${thread.name} (Copy)`
    };
    onThreadsChange([...threads, copy]);
  };

  const handleDelete = async (id: string) => {
    if (threads.length <= 1) return;
    const threadToDelete = threads.find(t => t.id === id);
    if (threadToDelete?.referenceImageIds) {
      // Release all reference images for this thread
      for (const imageId of threadToDelete.referenceImageIds) {
        try {
          await releaseImage(imageId);
        } catch (error) {
          console.error('Failed to release reference image:', error);
        }
      }
    }
    onThreadsChange(threads.filter(thread => thread.id !== id));
  };

  return (
    <CollapsibleThreadSection
      title="Prompts"
      threads={threads}
      icon={<span className="text-lg">📝</span>}
      accent="border-green-200"
      onAddThread={handleAddThread}
      onUpdateThread={handleUpdate}
      onDeleteThread={handleDelete}
      onDuplicateThread={handleDuplicate}
    >
      {(thread, onUpdate) => {
        const required = getRequiredImages(thread.provider, thread.mode);
        const imageIds = thread.referenceImageIds || [];

        // Detect variables in the prompt (called directly, not memoized due to render prop context)
        const detectedVariables = detectVariables(thread.prompt);

        const handleImageIdsChange = (newImageIds: string[]) => {
          onUpdate({ referenceImageIds: newImageIds });
        };

        const handleProviderChange = (nextProvider: ImageProvider) => {
          if (nextProvider === thread.provider) return;
          const baseUpdates: Partial<ImagePromptThread> = { provider: nextProvider };
          if (nextProvider === 'reve') {
            baseUpdates.mode = thread.mode ?? 'create';
            baseUpdates.aspectRatio = thread.aspectRatio ?? '1:1';
            baseUpdates.version = thread.version ?? 'latest';
          } else {
            baseUpdates.mode = undefined;
            baseUpdates.aspectRatio = undefined;
            baseUpdates.version = undefined;
          }

          if (nextProvider === 'google') {
            baseUpdates.referenceImageIds = imageIds.slice(0, 1);
          }

          onUpdate(baseUpdates);
        };

        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Provider</label>
              <Select value={thread.provider} onValueChange={(value) => handleProviderChange(value as ImageProvider)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_PROVIDERS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <PromptModeTabs
              provider={thread.provider}
              mode={thread.mode}
              onChange={(value) => onUpdate({ mode: value })}
            />
            <div className="relative">
              <Textarea
                value={thread.prompt}
                placeholder="Describe the image you want to generate"
                rows={5}
                onChange={event => {
                  const newPrompt = event.target.value;
                  const newVariables = detectVariables(newPrompt);
                  const updatedVariables = getVariableDefaults(newVariables, thread.variables);
                  onUpdate({ prompt: newPrompt, variables: updatedVariables });
                }}
                className="pr-12"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={() => onCopy(thread.prompt, `prompt-${thread.id}`)}
                disabled={!thread.prompt.trim()}
                title="Copy prompt"
              >
                {copiedStates[`prompt-${thread.id}`] ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <VariableInputs
              variableNames={detectedVariables}
              variables={thread.variables}
              onVariableChange={(variables) => onUpdate({ variables })}
            />
            <ImageUpload
              imageIds={imageIds}
              maxImages={required.max}
              required={required.min > 0}
              onImageIdsChange={handleImageIdsChange}
              disabled={thread.provider === 'reve' && thread.mode === 'create'}
            />
            <p className="text-xs text-muted-foreground">
              {thread.provider === 'google'
                ? 'Optional reference image. Gemini supports zero or one reference image.'
                : thread.mode === 'create'
                  ? 'Create mode uses text only. Upload is disabled.'
                  : thread.mode === 'remix'
                    ? 'Remix mode supports 1 to 4 reference images.'
                    : 'Edit mode requires exactly one reference image.'}
            </p>
            {thread.provider === 'reve' && (
              <div className="rounded-md border bg-muted/40 p-3 space-y-3">
                <div>
                  <label className="text-sm font-medium">Aspect Ratio</label>
                  <Select
                    value={thread.aspectRatio ?? '1:1'}
                    onValueChange={(value) => onUpdate({ aspectRatio: value as typeof thread.aspectRatio })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASPECT_RATIOS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Model Version</label>
                  <Input
                    value={thread.version ?? ''}
                    onChange={(event) => onUpdate({ version: event.target.value })}
                    placeholder="latest"
                  />
                </div>
              </div>
            )}
          </div>
        );
      }}
    </CollapsibleThreadSection>
  );
}
