'use client';

import { useRef, ChangeEvent, useEffect, useState, DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trash2, Upload, Loader2, Clipboard, GripVertical } from 'lucide-react';
import type { ImageUploadProps } from './types';
import Image from 'next/image';
import { saveReferenceImage, getImage, releaseImage } from '@/lib/image-storage';

async function fileToBase64(file: File): Promise<string> {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        // Remove data URL prefix to get just base64
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      } else {
        reject(new Error('Unexpected file reader result'));
      }
    };
    reader.readAsDataURL(file);
  });
}

export function ImageUpload({ imageIds, maxImages, onImageIdsChange, disabled, required }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [displayImages, setDisplayImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Load images from IndexedDB for display
  useEffect(() => {
    async function loadImages() {
      for (const id of imageIds) {
        if (!displayImages[id] && !loadingImages.has(id)) {
          setLoadingImages(prev => new Set(prev).add(id));
          try {
            const imageData = await getImage(id);
            if (imageData) {
              setDisplayImages(prev => ({ ...prev, [id]: `data:image/png;base64,${imageData}` }));
            }
          } catch (error) {
            console.error('Failed to load reference image:', error);
          } finally {
            setLoadingImages(prev => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }
        }
      }
    }
    void loadImages();
  }, [imageIds]);

  // Clean up display images that are no longer in imageIds
  useEffect(() => {
    const currentIds = new Set(imageIds);
    setDisplayImages(prev => {
      const next = { ...prev };
      for (const id in next) {
        if (!currentIds.has(id)) {
          delete next[id];
        }
      }
      return next;
    });
  }, [imageIds]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      const remainingSlots = maxImages - imageIds.length;
      const filesToProcess = Array.from(files).slice(0, remainingSlots);

      const newImageIds: string[] = [];
      for (const file of filesToProcess) {
        const base64 = await fileToBase64(file);
        // Save to IndexedDB with deduplication
        const imageId = await saveReferenceImage(base64);
        newImageIds.push(imageId);
      }

      onImageIdsChange([...imageIds, ...newImageIds]);
    } catch (error) {
      console.error('Failed to upload images:', error);
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleRemove = async (index: number) => {
    const imageIdToRemove = imageIds[index];
    if (imageIdToRemove) {
      // Release the reference (will delete if no other references)
      try {
        await releaseImage(imageIdToRemove);
      } catch (error) {
        console.error('Failed to release reference image:', error);
      }
    }
    const updated = imageIds.filter((_, i) => i !== index);
    onImageIdsChange(updated);
  };

  const canAddMore = imageIds.length < maxImages;

  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && index !== draggedIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newImageIds = [...imageIds];
    const [draggedItem] = newImageIds.splice(draggedIndex, 1);
    newImageIds.splice(dropIndex, 0, draggedItem);
    onImageIdsChange(newImageIds);

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handlePaste = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      const newImageIds: string[] = [];
      const remainingSlots = maxImages - imageIds.length;
      let processedCount = 0;

      setUploading(true);

      for (const item of clipboardItems) {
        if (processedCount >= remainingSlots) break;

        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          // Convert blob to file-like object for fileToBase64
          const file = new File([blob], 'pasted-image', { type: imageType });
          const base64 = await fileToBase64(file);
          const imageId = await saveReferenceImage(base64);
          newImageIds.push(imageId);
          processedCount++;
        }
      }

      if (newImageIds.length > 0) {
        onImageIdsChange([...imageIds, ...newImageIds]);
      }
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || !canAddMore || uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {canAddMore ? 'Upload Image' : 'Max images reached'}
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handlePaste}
          disabled={disabled || !canAddMore || uploading}
          title="Paste image from clipboard"
        >
          <Clipboard className="mr-2 h-4 w-4" />
          Paste
        </Button>
        {required && imageIds.length === 0 && (
          <span className="text-xs text-red-500 self-center">At least one image is required</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        multiple={maxImages > 1}
        onChange={handleFileChange}
      />
      {imageIds.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {imageIds.map((id, index) => {
            const imageData = displayImages[id];
            const isLoading = loadingImages.has(id);
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index;

            return (
              <Card
                key={id}
                draggable={!disabled && imageIds.length > 1}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative h-32 overflow-hidden transition-all ${
                  isDragging ? 'opacity-50 scale-95' : ''
                } ${isDragOver ? 'ring-2 ring-primary ring-offset-2' : ''} ${
                  imageIds.length > 1 && !disabled ? 'cursor-grab active:cursor-grabbing' : ''
                }`}
              >
                <div className="relative h-full w-full">
                  {isLoading ? (
                    <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : imageData ? (
                    <Image
                      src={imageData}
                      alt={`Uploaded ${index + 1}`}
                      fill
                      sizes="200px"
                      className="object-cover"
                      unoptimized
                      draggable={false}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
                      <span className="text-xs text-muted-foreground">Failed to load</span>
                    </div>
                  )}
                </div>
                {/* Order number badge */}
                <div className="absolute top-2 left-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
                  {imageIds.length > 1 && !disabled && (
                    <GripVertical className="h-3 w-3" />
                  )}
                  {index + 1}
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => handleRemove(index)}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}