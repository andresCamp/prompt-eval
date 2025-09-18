'use client';

import { useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trash2, Upload } from 'lucide-react';
import type { ImageUploadProps } from './types';
import Image from 'next/image';

async function fileToBase64(file: File): Promise<string> {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Unexpected file reader result'));
      }
    };
    reader.readAsDataURL(file);
  });
}

export function ImageUpload({ images, maxImages, onImagesChange, disabled, required }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    const remainingSlots = maxImages - images.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    const base64Images = await Promise.all(filesToProcess.map(fileToBase64));
    onImagesChange([...images, ...base64Images]);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleRemove = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onImagesChange(updated);
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || !canAddMore}
        >
          <Upload className="mr-2 h-4 w-4" />
          {canAddMore ? 'Upload Image' : 'Max images reached'}
        </Button>
        {required && images.length === 0 && (
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
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {images.map((image, index) => (
            <Card key={index} className="relative h-32 overflow-hidden">
              <div className="relative h-full w-full">
                <Image
                  src={image}
                  alt={`Uploaded ${index + 1}`}
                  fill
                  sizes="200px"
                  className="object-cover"
                  unoptimized
                />
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
          ))}
        </div>
      )}
    </div>
  );
}
