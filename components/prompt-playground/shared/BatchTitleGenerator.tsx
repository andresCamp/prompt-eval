/**
 * @fileoverview BatchTitleGenerator - Generate titles for all threads at once
 *
 * This component provides a section-level button that analyzes all threads
 * together and generates distinctive titles for each based on their differences.
 */

'use client';

import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BatchTitleGeneratorProps<T> {
  threads: T[];
  getThreadContent: (thread: T) => string;
  contentType?: string;
  onUpdateThread: (threadId: string, updates: Partial<T>) => void;
  disabled?: boolean;
  className?: string;
}

export function BatchTitleGenerator<T extends { id: string; name: string }>({
  threads,
  getThreadContent,
  contentType,
  onUpdateThread,
  disabled = false,
  className = '',
}: BatchTitleGeneratorProps<T>) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAllTitles = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (threads.length === 0) {
      console.log('No threads to generate titles for');
      return;
    }

    console.log('Starting batch title generation for', threads.length, 'threads');
    setIsGenerating(true);

    try {
      // Prepare all thread contents
      const allThreads = threads.map((thread) => ({
        content: getThreadContent(thread),
        contentType,
      }));

      console.log('Sending request with threads:', allThreads);

      const response = await fetch('/api/generate-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          allThreads,
        }),
      });

      const data = await response.json();
      console.log('API response:', data);

      if (data.success && data.titles && Array.isArray(data.titles)) {
        console.log('Generated titles:', data.titles);
        // Update all thread titles
        data.titles.forEach((title: string, index: number) => {
          if (threads[index]) {
            console.log(`Updating thread ${threads[index].id} with title: "${title}"`);
            onUpdateThread(threads[index].id, { name: title } as Partial<T>);
          }
        });
      } else {
        console.error('Failed to generate batch titles:', data.error);
      }
    } catch (error) {
      console.error('Error generating batch titles:', error);
    } finally {
      setIsGenerating(false);
      console.log('Batch title generation complete');
    }
  };

  const hasContent = threads.some((thread) => {
    const content = getThreadContent(thread);
    return content && content.trim().length > 0;
  });

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={generateAllTitles}
      disabled={isGenerating || disabled || !hasContent || threads.length === 0}
      className={className}
      title="Generate all titles using AI"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 mr-1.5" />
          Generate All Titles
        </>
      )}
    </Button>
  );
}
