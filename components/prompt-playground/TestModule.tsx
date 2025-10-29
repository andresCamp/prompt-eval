/**
 * @fileoverview TestModule - Individual test module component for multi-threaded testing
 * 
 * This component represents a single test module that can be duplicated and run independently.
 * Each module contains its own configuration (prompts, model selection) and generates its own
 * response thread from all biographer personas.
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Copy, Play, Loader2, Plus, Trash2, Check, ChevronDown } from 'lucide-react';
import { TestModuleProps } from './shared/types';
import { ConfigSection } from './ConfigSection';
import { ResponsesSection } from './ResponsesSection';
import { ProviderSelector, ModelSelector } from './shared/ModelSelector';
import { formatAllResponses } from './shared/utils';

export function TestModule({
  module,
  biographerData,
  onUpdateModule,
  onRunTest,
  onDuplicateModule,
  onDeleteModule,
  canDelete
}: TestModuleProps) {
  const copyToClipboard = (text: string, buttonId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      onUpdateModule(module.id, {
        copiedStates: { ...module.copiedStates, [buttonId]: true }
      });
      
      // Hide checkmark after 3 seconds
      setTimeout(() => {
        onUpdateModule(module.id, {
          copiedStates: { ...module.copiedStates, [buttonId]: false }
        });
      }, 3000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const copyTestConfig = () => {
    const configText = `**Module:** ${module.name}\n**Provider:** ${module.selectedProvider}\n**Model:** ${module.selectedModel}\n\n**System Prompt:**\n${module.systemPrompt}\n\n**Initial Message:**\n${module.initialMessage}\n\n**User Message:**\n${module.userMessage}`;
    copyToClipboard(configText, `copy-config-${module.id}`);
  };

  const copyAllResponses = () => {
    const allResponses = formatAllResponses(module.responses);
    copyToClipboard(allResponses, `copy-all-${module.id}`);
  };

  const toggleSection = (section: keyof typeof module.openSections) => {
    onUpdateModule(module.id, {
      openSections: {
        ...module.openSections,
        [section]: !module.openSections[section]
      }
    });
  };

  const toggleMainSection = () => {
    onUpdateModule(module.id, {
      openSections: {
        ...module.openSections,
        main: !module.openSections.main
      }
    });
  };

  const cardCursor = module.openSections.main ? 'cursor-n-resize' : 'cursor-s-resize';

  return (
    <Card
      className={`${cardCursor} hover:bg-muted transition-colors`}
      onClick={toggleMainSection}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">{module.name}</CardTitle>
          <div className="flex items-center gap-2">
            <ProviderSelector 
              value={module.selectedProvider}
              onValueChange={(provider: string) => {
                onUpdateModule(module.id, { selectedProvider: provider });
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <ModelSelector 
              value={module.selectedModel}
              onValueChange={(model: string) => {
                onUpdateModule(module.id, { selectedModel: model });
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              copyTestConfig();
            }}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 cursor-pointer hover:bg-muted hover:scale-105 transition-all"
          >
            {module.copiedStates[`copy-config-${module.id}`] ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            Copy Config
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onRunTest(module.id);
            }}
            disabled={module.isRunning}
            size="sm"
            className="flex items-center gap-2"
          >
            {module.isRunning ? (
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
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateModule(module.id);
            }}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Duplicate
          </Button>
          {canDelete && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteModule(module.id);
              }}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
          <ChevronDown className={`h-4 w-4 transition-transform ${module.openSections.main ? 'rotate-180' : ''}`} />
        </div>
      </CardHeader>
      
      {module.openSections.main && (
        <CardContent className="space-y-4">
          {/* Configuration Section */}
          <ConfigSection
            biographerData={JSON.stringify(biographerData, null, 2)}
            systemPrompt={module.systemPrompt}
            initialMessage={module.initialMessage}
            userMessage={module.userMessage}
            openSections={{
              data: module.openSections.config,
              systemPrompt: module.openSections.systemPrompt,
              initialMessage: module.openSections.initialMessage,
              userMessage: module.openSections.userMessage
            }}
            copiedStates={module.copiedStates}
            onToggleSection={(section) => {
              const mapping = {
                'data': 'config',
                'systemPrompt': 'systemPrompt',
                'initialMessage': 'initialMessage',
                'userMessage': 'userMessage'
              } as const;
              toggleSection(mapping[section]);
            }}
            onSystemPromptChange={(value) => onUpdateModule(module.id, { systemPrompt: value })}
            onInitialMessageChange={(value) => onUpdateModule(module.id, { initialMessage: value })}
            onUserMessageChange={(value) => onUpdateModule(module.id, { userMessage: value })}
            onCopy={copyToClipboard}
          />

          {/* Responses Section */}
          {module.responses.length > 0 && (
            <ResponsesSection
              responses={module.responses}
              copiedStates={module.copiedStates}
              onCopyResponse={copyToClipboard}
              onCopyAllResponses={copyAllResponses}
            />
          )}
        </CardContent>
      )}
    </Card>
  );
} 