'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Download, Lock, Unlock } from 'lucide-react';
import type { ImageExecutionThread } from './types';
import Image from 'next/image';
import { IMAGE_PROVIDERS } from './types';
import { useEffect, useMemo, useState } from 'react';

interface ImageGridProps {
  threads: ImageExecutionThread[];
  onRunThread: (threadId: string) => Promise<void> | void;
  onDownload: (image: string, filename: string) => void;
  onRunAll: () => Promise<void> | void;
  anyRunning: boolean;
  showHeader?: boolean;
  onToggleCache: (threadId: string, shouldCache: boolean, image?: string) => void;
}

function ImagePreview({ image }: { image?: string }) {
  if (!image) {
    return (
      <div className="flex h-60 w-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No image generated yet
      </div>
    );
  }

  return (
    <div className="relative h-60 w-full overflow-hidden rounded-md">
      <Image src={image} alt="Generated" fill sizes="(max-width: 768px) 100vw, 320px" className="object-cover" unoptimized />
    </div>
  );
}

export function ResultsGrid({ threads, onRunThread, onDownload, onRunAll, anyRunning, showHeader = true, onToggleCache }: ImageGridProps) {
  const visibleThreads = useMemo(() => threads.filter(thread => thread.visible), [threads]);
  const [displayImages, setDisplayImages] = useState<Record<string, string>>({});
  const [lockedState, setLockedState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setDisplayImages(prev => {
      const next = { ...prev };
      threads.forEach(thread => {
        if (thread.result?.image) {
          next[thread.id] = thread.result.image;
        }
      });
      return next;
    });
  }, [threads]);

  useEffect(() => {
    setLockedState(() => {
      const next: Record<string, boolean> = {};
      threads.forEach(thread => {
        if (thread.result?.image) {
          next[thread.id] = true;
        }
      });
      return next;
    });
  }, [threads]);

  if (threads.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        Configure provider, prompts, and parameters to generate execution threads.
      </div>
    );
  }

  const handleCacheToggle = (thread: ImageExecutionThread, isLocked: boolean) => {
    if (isLocked) {
      setLockedState(prev => ({ ...prev, [thread.id]: false }));
      onToggleCache(thread.id, false);
      return;
    }

    const image = displayImages[thread.id] ?? thread.result?.image;
    if (!image) return;

    setLockedState(prev => ({ ...prev, [thread.id]: true }));
    onToggleCache(thread.id, true, image);
  };

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Generation Results ({visibleThreads.length})</h3>
          <Button type="button" onClick={onRunAll} disabled={anyRunning || visibleThreads.length === 0}>
            {anyRunning ? (
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Running…</span>
            ) : (
              <span className="flex items-center gap-2"><Play className="h-4 w-4" /> Run visible threads</span>
            )}
          </Button>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleThreads.map(thread => {
          const result = thread.result;
          const providerLabel = IMAGE_PROVIDERS.find(p => p.value === thread.promptThread.provider)?.label ?? thread.promptThread.provider;
          const effectiveImage = displayImages[thread.id] ?? result?.image;
          const isLocked = lockedState[thread.id] ?? false;

          return (
            <Card key={thread.id} className="flex flex-col">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{thread.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Provider: {providerLabel}
                    </p>
                  </div>
                  <Badge variant="outline">{thread.promptThread.provider}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onRunThread(thread.id)}
                    disabled={thread.isRunning}
                    className="w-fit"
                  >
                    {thread.isRunning ? (
                      <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Generating</span>
                    ) : (
                      <span className="flex items-center gap-2"><Play className="h-4 w-4" /> Run thread</span>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={isLocked ? 'secondary' : 'outline'}
                    onClick={() => handleCacheToggle(thread, isLocked)}
                    disabled={!isLocked && !effectiveImage}
                    className="w-fit"
                  >
                    {isLocked ? (
                      <span className="flex items-center gap-2">
                        <Lock className="h-4 w-4" /> Cached
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Unlock className="h-4 w-4" /> Cache image
                      </span>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <ImagePreview image={effectiveImage}
                />
                {result && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Status: {result.success ? 'Success' : 'Failed'}</p>
                    {result.error && <p className="text-red-500">{result.error}</p>}
                    {result.duration !== undefined && <p>Duration: {result.duration.toFixed(2)}s</p>}
                    {result.requestId && <p>Request ID: {result.requestId}</p>}
                    {result.version && <p>Version: {result.version}</p>}
                    {result.creditsUsed !== undefined && (
                      <p>Credits used: {result.creditsUsed} · Remaining: {result.creditsRemaining ?? '--'}</p>
                    )}
                    {result.contentViolation && <p className="text-yellow-600">Content violation flagged</p>}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!result?.image}
                  onClick={() => {
                    if (result?.image) {
                      onDownload(result.image, `${thread.name.replace(/\s+/g, '-')}.png`);
                    }
                  }}
                >
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
