'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Download, Lock, Unlock, X } from 'lucide-react';
import { getImage } from '@/lib/image-storage';
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
  onToggleCache: (threadId: string, shouldCache: boolean, imageData?: string) => void;
}

function ImagePreview({ image, onClick, isGenerating }: { image?: string; onClick?: () => void; isGenerating?: boolean }) {
  if (!image) {
    if (isGenerating) {
      return (
        <div className="flex h-60 w-full items-center justify-center rounded-md border border-dashed">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Generating...</span>
          </div>
        </div>
      );
    }
    return (
      <div className="flex h-60 w-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No image generated yet
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-md bg-gray-50 dark:bg-gray-900 cursor-pointer"
      onClick={onClick}
    >
      <div className="relative w-full" style={{ maxHeight: '500px' }}>
        <Image
          src={image}
          alt="Generated"
          width={512}
          height={512}
          sizes="(max-width: 768px) 100vw, 512px"
          className={`w-full h-auto object-contain transition-all duration-300 ${
            isGenerating ? 'blur-sm opacity-50' : ''
          }`}
          unoptimized
        />
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="bg-white/90 dark:bg-gray-800/90 rounded-lg px-4 py-2 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Generating...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ResultsGrid({ threads, onRunThread, onDownload, onRunAll, anyRunning, showHeader = true, onToggleCache }: ImageGridProps) {
  const visibleThreads = useMemo(() => threads.filter(thread => thread.visible), [threads]);
  const [displayImages, setDisplayImages] = useState<Record<string, string>>({});
  const [lockedState, setLockedState] = useState<Record<string, boolean>>({});
  const [previewImage, setPreviewImage] = useState<{ image: string; title: string } | null>(null);
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadImages() {
      for (const thread of threads) {
        if (thread.result?.image) {
          // If we have the actual image data, use it (not cached)
          setDisplayImages(prev => ({ ...prev, [thread.id]: thread.result!.image! }));
        } else if (thread.result?.imageId && !displayImages[thread.id] && !loadingImages.has(thread.id)) {
          // If we only have an imageId, load it from IndexedDB (cached)
          setLoadingImages(prev => new Set(prev).add(thread.id));
          try {
            const imageData = await getImage(thread.result.imageId);
            if (imageData) {
              setDisplayImages(prev => ({ ...prev, [thread.id]: imageData }));
            }
          } catch (error) {
            console.error('Failed to load image from IndexedDB:', error);
          } finally {
            setLoadingImages(prev => {
              const next = new Set(prev);
              next.delete(thread.id);
              return next;
            });
          }
        } else if (!thread.result?.image && !thread.result?.imageId) {
          // No image data and no imageId - clear display
          setDisplayImages(prev => {
            const next = { ...prev };
            delete next[thread.id];
            return next;
          });
        }
      }
    }
    void loadImages();
  }, [threads]);

  useEffect(() => {
    setLockedState(() => {
      const next: Record<string, boolean> = {};
      threads.forEach(thread => {
        // Only show as locked if it has an imageId (cached in IndexedDB)
        if (thread.result?.imageId) {
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
      // Turning cache OFF
      setLockedState(prev => ({ ...prev, [thread.id]: false }));
      onToggleCache(thread.id, false);
      return;
    }

    // Turning cache ON - need to pass the current image data
    const imageData = displayImages[thread.id];
    if (!imageData) return;

    setLockedState(prev => ({ ...prev, [thread.id]: true }));
    onToggleCache(thread.id, true, imageData);
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
          const effectiveImage = displayImages[thread.id];
          const isLocked = lockedState[thread.id] ?? false;
          const isLoadingImage = loadingImages.has(thread.id);

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
                {isLoadingImage ? (
                  <div className="flex h-60 w-full items-center justify-center rounded-md border border-dashed">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ImagePreview
                    image={effectiveImage}
                    isGenerating={thread.isRunning}
                    onClick={() => {
                      if (effectiveImage && !thread.isRunning) {
                        setPreviewImage({ image: effectiveImage, title: thread.name });
                      }
                    }}
                  />
                )}
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
                  disabled={!effectiveImage}
                  onClick={() => {
                    if (effectiveImage) {
                      onDownload(effectiveImage, `${thread.name.replace(/\s+/g, '-')}.png`);
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

      {/* Minimalist Full Screen Image Preview */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setPreviewImage(null)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewImage(null);
            }}
          >
            <X className="h-6 w-6" />
          </button>

          {/* Full Screen Image */}
          <Image
            src={previewImage.image}
            alt={previewImage.title}
            width={2048}
            height={2048}
            className="max-w-full max-h-full w-auto h-auto object-contain"
            unoptimized
          />
        </div>
      )}
    </div>
  );
}
