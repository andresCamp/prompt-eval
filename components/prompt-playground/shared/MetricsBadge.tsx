/**
 * @fileoverview Metrics display component for showing token count, word count, duration, and cost
 */

import { Clock, Hash, FileText, DollarSign } from 'lucide-react';
import { MetricsProps } from './types';

/**
 * Displays metrics including token count, word count, duration, and cost
 * Used in both config cards and response cards
 */
export function MetricsBadge({ tokenCount, wordCount, duration, cost }: MetricsProps) {
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
      {cost !== undefined && (
        <div className="flex items-center gap-1">
          <DollarSign className="h-3 w-3" />
          <span>${cost.toFixed(4)}</span>
        </div>
      )}
    </div>
  );
} 