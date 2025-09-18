/**
 * @fileoverview Responses section displaying biographer responses in horizontal scroll
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, Copy, Check } from 'lucide-react';
import { BiographerResponse } from './shared/types';
import { MetricsBadge } from './shared/MetricsBadge';
import { CopyButton } from './shared/CopyButton';


/**
 * Props for ResponsesSection component
 */
interface ResponsesSectionProps {
  responses: BiographerResponse[];
  copiedStates: Record<string, boolean>;
  onCopyResponse: (text: string, buttonId: string) => void;
  onCopyAllResponses: () => void;
}

/**
 * Individual response card component
 */
function ResponseCard({ 
  response, 
  copiedStates, 
  onCopyResponse 
}: { 
  response: BiographerResponse;
  copiedStates: Record<string, boolean>;
  onCopyResponse: (text: string, buttonId: string) => void;
}) {
  return (
    <Card className="w-96 flex-shrink-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">{response.name}</CardTitle>
        <CopyButton
          text={response.response}
          buttonId={`response-${response.name}`}
          copiedStates={copiedStates}
          onCopy={onCopyResponse}
          disabled={response.loading || !!response.error}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Metrics */}
        <MetricsBadge 
          duration={response.duration}
          tokenCount={response.tokenCount}
          wordCount={response.wordCount}
        />
        
        {/* Response Content */}
        <div className="whitespace-pre-wrap">
          {response.loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : response.error ? (
            <div className="text-red-500 text-sm">
              Error: {response.error}
            </div>
          ) : (
            <div className="text-sm leading-relaxed max-h-96 overflow-y-auto">
              {response.response}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Responses section displaying biographer responses in horizontal scroll
 * Shows all response cards with copy functionality and metrics
 */
export function ResponsesSection({
  responses,
  copiedStates,
  onCopyResponse,
  onCopyAllResponses
}: ResponsesSectionProps) {
  if (responses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Biographer Responses</h2>
        <Button 
          onClick={onCopyAllResponses}
          variant="outline"
          className="flex items-center gap-2 cursor-pointer hover:bg-muted hover:scale-105 transition-all"
        >
          {copiedStates['copy-all'] ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          Copy All Responses
        </Button>
      </div>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex space-x-4 pb-4">
          {responses.map((response) => (
            <ResponseCard
              key={response.name}
              response={response}
              copiedStates={copiedStates}
              onCopyResponse={onCopyResponse}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
} 