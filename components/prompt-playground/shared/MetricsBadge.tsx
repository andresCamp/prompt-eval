/**
 * @fileoverview Metrics display component for showing token count, word count, and duration
 */

import { Clock, Hash, FileText } from 'lucide-react';
import { MetricsProps } from './types';

/**
 * Displays metrics including token count, word count, and duration
 * Used in both config cards and response cards
 */
export function MetricsBadge({ tokenCount, wordCount, duration }: MetricsProps) {
  return (
    <div className="flex items-center gap-3 text-xs text-gray-500">
      {duration !== undefined && (
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{duration.toFixed(1)}s</span>
        </div>
      )}
      {tokenCount !== undefined && (
        <div className="flex items-center gap-1">
          <Hash className="h-3 w-3" />
          <span>{tokenCount} tokens</span>
        </div>
      )}
      {wordCount !== undefined && (
        <div className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          <span>{wordCount} words</span>
        </div>
      )}
    </div>
  );
} 