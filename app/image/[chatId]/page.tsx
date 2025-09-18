/**
 * @fileoverview Image Playground
 *
 * Custom playground for image generation with Google Gemini 2.5 Flash (image-preview)
 * and the REVE Create/Remix/Edit APIs. Keeps the multi-threaded execution model from
 * the original playground while adapting the UI for multimodal prompts and image outputs.
 */

'use client';

import { useState, useEffect, use } from 'react';
import { useAtom } from 'jotai';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { imageConfigAtomFamily } from '@/lib/atoms/image-playground';
import { PromptThreadSection } from '@/components/image-playground/ThreadSection';
import { ResultsGrid } from '@/components/image-playground/ResultsGrid';
import { runImageExecution } from '@/components/image-playground/client';
import { buildExecutionThreads, updateExecutionThread } from '@/components/image-playground/utils';
import type {
  ImageGenerationConfig,
  ImagePromptThread,
  ImageExecutionThread
} from '@/components/image-playground/types';
import { Image as ImageIcon, Loader2, Play } from 'lucide-react';

interface PageParams {
  chatId: string;
}

type ParamsPromise = Promise<PageParams>;

export default function ImagePlaygroundPage({ params }: { params: ParamsPromise }) {
  const { chatId } = use(params);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __PAGE_NS__?: string }).__PAGE_NS__ = `@image-playground-${chatId}`;
    }
  }, [chatId]);

  const configAtom = imageConfigAtomFamily(chatId);
  const [config, setConfig] = useAtom(configAtom);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !config) return;
    const hasLegacyThreads = config.executionThreads.some(thread => !thread.promptThread);
    if ((config.executionThreads.length === 0 || hasLegacyThreads) && config.promptThreads.length > 0) {
      setConfig(prev => {
        if (!prev) return prev;
        const executionThreads = buildExecutionThreads(prev.promptThreads, prev.executionThreads);
        if (executionThreads.length === 0) return prev;
        return { ...prev, executionThreads };
      });
    }
  }, [config, mounted, setConfig]);

  const updateStructure = (updater: (prev: ImageGenerationConfig) => ImageGenerationConfig) => {
    setConfig(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      const executionThreads = buildExecutionThreads(
        next.promptThreads,
        prev.executionThreads
      );
      return { ...next, executionThreads };
    });
  };

  const updateExecution = (threadId: string, updates: Partial<ImageExecutionThread>) => {
    setConfig(prev => (prev ? updateExecutionThread(prev, threadId, updates) : prev));
  };

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text', error);
    }
  };

  const handlePromptThreadsChange = (threads: ImagePromptThread[]) => {
    updateStructure(prev => ({
      ...prev,
      promptThreads: threads,
    }));
  };

  const handleRunThread = async (threadId: string) => {
    const thread = config.executionThreads.find(t => t.id === threadId);
    if (!thread) return;

    updateExecution(threadId, { isRunning: true, result: undefined });
    try {
      const result = await runImageExecution(thread);
      updateExecution(threadId, { isRunning: false, result });
    } catch (error) {
      console.error('Image execution failed', error);
      updateExecution(threadId, {
        isRunning: false,
        result: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  };

  const handleRunAllThreads = async () => {
    for (const thread of config.executionThreads) {
      if (!thread.visible) continue;
      await handleRunThread(thread.id);
    }
  };

  const handleDownload = (image: string, filename: string) => {
    if (typeof window === 'undefined') return;
    const href = image.startsWith('data:') ? image : `data:image/png;base64,${image}`;
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleCache = (threadId: string, shouldCache: boolean, image?: string) => {
    setConfig(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        executionThreads: prev.executionThreads.map(thread => {
          if (thread.id !== threadId || !thread.result) {
            return thread;
          }
          const nextResult = shouldCache
            ? { ...thread.result, image: image ?? thread.result.image }
            : { ...thread.result, image: undefined };
          return { ...thread, result: nextResult };
        })
      };
    });
  };

  if (!config || !mounted) {
    return (
      <div className="mx-auto max-w-none space-y-6 p-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const visibleThreads = config.executionThreads.filter(thread => thread.visible);
  const anyThreadRunning = visibleThreads.some(thread => thread.isRunning);
  const totalCombinations = visibleThreads.length;
  const promptCount = config.promptThreads.length;
  const providerCount = new Set(config.promptThreads.map(thread => thread.provider)).size;
  const parameterCount = config.promptThreads.filter(thread => thread.provider === 'reve').length;

  return (
    <div className="mx-auto max-w-none space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ImageIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Image Generation Playground</h1>
            <p className="text-sm text-muted-foreground">
              Multimodal image generation • {totalCombinations} {totalCombinations === 1 ? 'combination' : 'combinations'}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="default"
          className="flex items-center gap-2"
          onClick={() => void handleRunAllThreads()}
          disabled={anyThreadRunning || totalCombinations === 0}
        >
          {anyThreadRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running…
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run All ({totalCombinations})
            </>
          )}
        </Button>
      </div>

      <Card className="border-2 border-dashed bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 dark:border-slate-700">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-blue-500" />
              Providers ({providerCount})
            </div>
            <span>→</span>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-green-500" />
              Prompts ({promptCount})
            </div>
            <span>→</span>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-purple-500" />
              REVE Settings ({parameterCount})
            </div>
            <span>→</span>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-500" />
              Results ({totalCombinations})
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <PromptThreadSection
          threads={config.promptThreads}
          onThreadsChange={handlePromptThreadsChange}
          copiedStates={copiedStates}
          onCopy={handleCopy}
        />
      </div>

      <Card className="border-purple-200 border-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-purple-500" />
            <CardTitle>Results ({totalCombinations} {totalCombinations === 1 ? 'combination' : 'combinations'})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ResultsGrid
            threads={config.executionThreads}
            onRunThread={handleRunThread}
            onDownload={handleDownload}
            onRunAll={handleRunAllThreads}
            anyRunning={anyThreadRunning}
            showHeader={false}
            onToggleCache={handleToggleCache}
          />
        </CardContent>
      </Card>
    </div>
  );
}
