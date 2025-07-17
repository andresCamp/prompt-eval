/**
 * @fileoverview Test header component with title, model selection, and control buttons
 */

import { Button } from '@/components/ui/button';
import { Play, Loader2, Copy, Check } from 'lucide-react';
import { ProviderSelector, ModelSelector } from './shared/ModelSelector';
import { CopyButton } from './shared/CopyButton';
import { formatTestConfig } from './shared/utils';

/**
 * Props for TestHeader component
 */
interface TestHeaderProps {
  selectedProvider: string;
  selectedModel: string;
  systemPrompt: string;
  initialMessage: string;
  userMessage: string;
  isRunning: boolean;
  copiedStates: Record<string, boolean>;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  onCopyConfig: (text: string, buttonId: string) => void;
  onRunTest: () => void;
}

/**
 * Header component containing title, model selection, and control buttons
 * Includes provider/model dropdowns, copy config button, and run test button
 */
export function TestHeader({
  selectedProvider,
  selectedModel,
  systemPrompt,
  initialMessage,
  userMessage,
  isRunning,
  copiedStates,
  onProviderChange,
  onModelChange,
  onCopyConfig,
  onRunTest
}: TestHeaderProps) {
  const configText = formatTestConfig(
    selectedProvider,
    selectedModel,
    systemPrompt,
    initialMessage,
    userMessage
  );

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold">Biographer Response Tester</h1>
      <div className="flex gap-2">
        <ProviderSelector 
          value={selectedProvider} 
          onValueChange={onProviderChange}
        />
        <ModelSelector 
          value={selectedModel} 
          onValueChange={onModelChange}
        />
        <Button
          onClick={() => onCopyConfig(configText, 'copy-test-config')}
          variant="outline"
          className="flex items-center gap-2 cursor-pointer hover:bg-muted hover:scale-105 transition-all"
        >
          {copiedStates['copy-test-config'] ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          Copy Test Config
        </Button>
        <Button 
          onClick={onRunTest} 
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run Test
            </>
          )}
        </Button>
      </div>
    </div>
  );
} 