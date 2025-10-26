/**
 * @fileoverview TitleInputWithAI - Input field with AI-powered title generation
 *
 * This component provides an input field with an integrated Sparkles button
 * that uses AI to generate concise, descriptive titles based on content.
 */

'use client';

import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';

interface TitleInputWithAIProps {
  value: string;
  onChange: (value: string) => void;
  content: string;
  contentType?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function TitleInputWithAI({
  value,
  onChange,
  content,
  contentType,
  placeholder = 'Thread name',
  className = '',
  disabled = false,
}: TitleInputWithAIProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateTitle = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!content || !content.trim()) {
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/generate-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          contentType,
        }),
      });

      const data = await response.json();

      if (data.success && data.title) {
        onChange(data.title);
      } else {
        console.error('Failed to generate title:', data.error);
      }
    } catch (error) {
      console.error('Error generating title:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <InputGroup className={className}>
      <InputGroupInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        onClick={(e) => e.stopPropagation()}
        className="font-medium"
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          onClick={generateTitle}
          disabled={isGenerating || !content?.trim() || disabled}
          size="icon-xs"
          title="Generate title using AI"
          aria-label="Generate title using AI"
        >
          {isGenerating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
