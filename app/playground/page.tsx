/**
 * @fileoverview Pipeline Threading Playground
 * 
 * This page provides a comprehensive threading system for prompt engineering testing.
 * Each stage of the pipeline (Model → Data → System → Initial → User → Output) can
 * have multiple threads, and all combinations are executed as separate threads.
 * 
 * Architecture:
 * - Model threads: Different AI models/providers
 * - Data threads: Different data sets
 * - System prompt threads: Different system instructions
 * - Initial message threads: Different starting messages
 * - User message threads: Different user inputs
 * - Execution threads: All combinations of the above
 * 
 * @author AI Assistant
 * @version 3.0.0
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Play, Copy, Trash2, GitBranch, Clock, FileText, Hash, Check, Brain, Database, Cpu, MessageSquare, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  ModelThread,
  DataThread,
  SystemPromptThread,
  InitialMessageThread,
  UserMessageThread,
  ExecutionThread,
  PipelineConfig,
  BiographerResponse,
  MODEL_PROVIDER_MAP,
  ConversationTurn,
} from '@/components/prompt-playground/shared/types';
import { CollapsibleCard } from '@/components/prompt-playground/shared/CollapsibleCard';
import { 
  biographers,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_INITIAL_MESSAGE,
  DEFAULT_USER_MESSAGE
} from './defaults';

import { 
  ThreadableSection,
  ExecutionResults,
  renderModelThread,
  renderDataThread,
  renderSystemPromptThread,
  renderInitialMessageThread,
  renderUserMessageThread,
  createDefaultPipelineConfig,
  updateExecutionThreads,
  replaceTemplate,
  generateId,
  generateExecutionThreads,
  createExecutionBatches,
  calculateCombinationCount
} from '@/components/prompt-playground';



export default function PipelineThreadingPlaygroundPage() {
  const [config, setConfig] = useState<PipelineConfig>(() => {
    const defaultConfig = createDefaultPipelineConfig();
    // Override with our custom defaults
    return {
      ...defaultConfig,
      dataThreads: [
        {
          id: generateId(),
          name: 'All Data',
          data: JSON.stringify(biographers, null, 2),
          visible: true
        }
      ],
      systemPromptThreads: [
        {
          id: generateId(),
          name: 'Default System',
          prompt: DEFAULT_SYSTEM_PROMPT,
          visible: true
        }
      ],
      initialMessageThreads: [
        {
          id: generateId(),
          name: 'Default Initial',
          message: DEFAULT_INITIAL_MESSAGE,
          visible: true
        }
      ],
      userMessageThreads: [
        {
          id: generateId(),
          name: 'Default User',
          message: DEFAULT_USER_MESSAGE,
          visible: true
        }
      ]
    };
  });

  // Update execution threads whenever pipeline threads change
  useEffect(() => {
    setConfig(prev => updateExecutionThreads(prev));
  }, [
    config.modelThreads,
    config.dataThreads,
    config.systemPromptThreads,
    config.initialMessageThreads,
    config.userMessageThreads
  ]);

  const handleUpdateConfig = (updates: Partial<PipelineConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  // Copy management
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    models: true,
    data: true,
    system: true,
    initial: true,
    user: true,
    results: true
  });

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Model thread handlers
  const handleAddModelThread = () => {
    const newThread: ModelThread = {
      id: generateId(),
      name: `Model ${config.modelThreads.length + 1}`,
      provider: 'openai',
      model: 'gpt-4o',
      visible: true
    };
    handleUpdateConfig({
      modelThreads: [...config.modelThreads, newThread]
    });
  };

  const handleUpdateModelThread = (id: string, updates: Partial<ModelThread>) => {
    handleUpdateConfig({
      modelThreads: config.modelThreads.map(thread => {
        if (thread.id !== id) return thread;
        let merged = { ...thread, ...updates } as ModelThread;
        if (updates.model) {
          // Auto-update provider and name when model changes
          const provider = MODEL_PROVIDER_MAP[updates.model] || merged.provider;
          merged = { ...merged, name: updates.model, provider };
        }
        return merged;
      })
    });
  };

  const handleDeleteModelThread = (id: string) => {
    if (config.modelThreads.length > 1) {
      handleUpdateConfig({
        modelThreads: config.modelThreads.filter(thread => thread.id !== id)
      });
    }
  };

  const handleDuplicateModelThread = (id: string) => {
    const thread = config.modelThreads.find(t => t.id === id);
    if (thread) {
      const newThread = { ...thread, id: generateId(), name: `${thread.name} (Copy)` };
      handleUpdateConfig({
        modelThreads: [...config.modelThreads, newThread]
      });
    }
  };

  // Data thread handlers
  const handleAddDataThread = () => {
    const newThread: DataThread = {
      id: generateId(),
      name: `Data ${config.dataThreads.length + 1}`,
      data: JSON.stringify(biographers, null, 2),
      visible: true
    };
    handleUpdateConfig({
      dataThreads: [...config.dataThreads, newThread]
    });
  };

  const handleUpdateDataThread = (id: string, updates: Partial<DataThread>) => {
    handleUpdateConfig({
      dataThreads: config.dataThreads.map(thread => 
        thread.id === id ? { ...thread, ...updates } : thread
      )
    });
  };

  const handleDeleteDataThread = (id: string) => {
    if (config.dataThreads.length > 1) {
      handleUpdateConfig({
        dataThreads: config.dataThreads.filter(thread => thread.id !== id)
      });
    }
  };

  const handleDuplicateDataThread = (id: string) => {
    const thread = config.dataThreads.find(t => t.id === id);
    if (thread) {
      const newThread = { ...thread, id: generateId(), name: `${thread.name} (Copy)` };
      handleUpdateConfig({
        dataThreads: [...config.dataThreads, newThread]
      });
    }
  };

  // System prompt thread handlers
  const handleAddSystemPromptThread = () => {
    const newThread: SystemPromptThread = {
      id: generateId(),
      name: `System ${config.systemPromptThreads.length + 1}`,
      prompt: DEFAULT_SYSTEM_PROMPT,
      visible: true
    };
    handleUpdateConfig({
      systemPromptThreads: [...config.systemPromptThreads, newThread]
    });
  };

  const handleUpdateSystemPromptThread = (id: string, updates: Partial<SystemPromptThread>) => {
    handleUpdateConfig({
      systemPromptThreads: config.systemPromptThreads.map(thread => 
        thread.id === id ? { ...thread, ...updates } : thread
      )
    });
  };

  const handleDeleteSystemPromptThread = (id: string) => {
    if (config.systemPromptThreads.length > 1) {
      handleUpdateConfig({
        systemPromptThreads: config.systemPromptThreads.filter(thread => thread.id !== id)
      });
    }
  };

  const handleDuplicateSystemPromptThread = (id: string) => {
    const thread = config.systemPromptThreads.find(t => t.id === id);
    if (thread) {
      const newThread = { ...thread, id: generateId(), name: `${thread.name} (Copy)` };
      handleUpdateConfig({
        systemPromptThreads: [...config.systemPromptThreads, newThread]
      });
    }
  };

  // Initial message thread handlers
  const handleAddInitialMessageThread = () => {
    const newThread: InitialMessageThread = {
      id: generateId(),
      name: `Initial ${config.initialMessageThreads.length + 1}`,
      message: DEFAULT_INITIAL_MESSAGE,
      visible: true
    };
    handleUpdateConfig({
      initialMessageThreads: [...config.initialMessageThreads, newThread]
    });
  };

  const handleUpdateInitialMessageThread = (id: string, updates: Partial<InitialMessageThread>) => {
    handleUpdateConfig({
      initialMessageThreads: config.initialMessageThreads.map(thread => 
        thread.id === id ? { ...thread, ...updates } : thread
      )
    });
  };

  const handleDeleteInitialMessageThread = (id: string) => {
    if (config.initialMessageThreads.length > 1) {
      handleUpdateConfig({
        initialMessageThreads: config.initialMessageThreads.filter(thread => thread.id !== id)
      });
    }
  };

  const handleDuplicateInitialMessageThread = (id: string) => {
    const thread = config.initialMessageThreads.find(t => t.id === id);
    if (thread) {
      const newThread = { ...thread, id: generateId(), name: `${thread.name} (Copy)` };
      handleUpdateConfig({
        initialMessageThreads: [...config.initialMessageThreads, newThread]
      });
    }
  };

  // User message thread handlers
  const handleAddUserMessageThread = () => {
    const newThread: UserMessageThread = {
      id: generateId(),
      name: `User ${config.userMessageThreads.length + 1}`,
      message: DEFAULT_USER_MESSAGE,
      visible: true
    };
    handleUpdateConfig({
      userMessageThreads: [...config.userMessageThreads, newThread]
    });
  };

  const handleUpdateUserMessageThread = (id: string, updates: Partial<UserMessageThread>) => {
    handleUpdateConfig({
      userMessageThreads: config.userMessageThreads.map(thread => 
        thread.id === id ? { ...thread, ...updates } : thread
      )
    });
  };

  const handleDeleteUserMessageThread = (id: string) => {
    if (config.userMessageThreads.length > 1) {
      handleUpdateConfig({
        userMessageThreads: config.userMessageThreads.filter(thread => thread.id !== id)
      });
    }
  };

  const handleDuplicateUserMessageThread = (id: string) => {
    const thread = config.userMessageThreads.find(t => t.id === id);
    if (thread) {
      const newThread = { ...thread, id: generateId(), name: `${thread.name} (Copy)` };
      handleUpdateConfig({
        userMessageThreads: [...config.userMessageThreads, newThread]
      });
    }
  };

  // Execution thread handlers
  const handleUpdateExecutionThread = (id: string, updates: Partial<ExecutionThread>) => {
    setConfig(prev => ({
      ...prev,
      executionThreads: prev.executionThreads.map(thread =>
        thread.id === id ? { ...thread, ...updates } : thread
      )
    }));
  };

  const handleRunExecutionThread = async (threadId: string) => {
    const thread = config.executionThreads.find(t => t.id === threadId);
    if (!thread) return;

    try {
      // Parse data
      const dataEntries = JSON.parse(thread.dataThread.data);
      
      // Initialize responses
      const initialResponses: BiographerResponse[] = dataEntries.map((bio: Record<string, unknown>) => ({
        name: String(bio.name),
        response: '',
        loading: true
      }));
      
      // Set thread to running state with initial responses
      handleUpdateExecutionThread(threadId, { 
        isRunning: true,
        responses: initialResponses
      });

      // Process each data entry
      const responsePromises = dataEntries.map(async (dataEntry: Record<string, unknown>, index: number) => {
        const startTime = Date.now();
        
        try {
          // Replace template variables
          const personalizedSystemPrompt = replaceTemplate(thread.systemPromptThread.prompt, dataEntry);
          const personalizedInitialMessage = replaceTemplate(thread.initialMessageThread.message, dataEntry);
          const personalizedUserMessage = replaceTemplate(thread.userMessageThread.message, dataEntry);

          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: thread.modelThread.model,
              messages: [
                { role: 'system', content: personalizedSystemPrompt },
                { role: 'assistant', content: personalizedInitialMessage },
                { role: 'user', content: personalizedUserMessage }
              ],
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let result = '';

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              result += decoder.decode(value, { stream: true });
            }
          }

          const endTime = Date.now();
          const duration = (endTime - startTime) / 1000;
          const wordCount = result.trim().split(/\s+/).filter(word => word.length > 0).length;
          const tokenCount = Math.ceil(result.length / 4);

          // Update this specific response
          setConfig(prev => ({
            ...prev,
            executionThreads: prev.executionThreads.map(t => 
              t.id === threadId ? {
                ...t,
                responses: t.responses.map((r: BiographerResponse, i: number) => 
                  i === index ? { 
                    ...r, 
                    response: result, 
                    loading: false, 
                    duration,
                    wordCount,
                    tokenCount
                  } : r
                )
              } : t
            )
          }));
          
          return { success: true };
        } catch (error) {
          const endTime = Date.now();
          const duration = (endTime - startTime) / 1000;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // Update this specific response with error
          setConfig(prev => ({
            ...prev,
            executionThreads: prev.executionThreads.map(t => 
              t.id === threadId ? {
                ...t,
                responses: t.responses.map((r: BiographerResponse, i: number) => 
                  i === index ? { ...r, error: errorMessage, loading: false, duration } : r
                )
              } : t
            )
          }));
          
          return { success: false, error: errorMessage };
        }
      });

      await Promise.all(responsePromises);
    } catch (error) {
      console.error('Error running execution thread:', error);
    } finally {
      // Set thread to finished state
      handleUpdateExecutionThread(threadId, { isRunning: false });
    }
  };

  const handleRunAllExecutionThreads = async () => {
    // Only run visible execution threads
    const visibleThreads = config.executionThreads.filter(thread => thread.visible);
    
    // Implement batching to prevent API rate limiting
    const batchSize = 3;
    const maxConcurrent = 2;
    
    // Split into batches
    const batches = createExecutionBatches(visibleThreads, Math.min(batchSize, maxConcurrent));
    
    // Run batches sequentially, but threads within each batch in parallel
    for (const batch of batches) {
      const promises = batch.map((thread: ExecutionThread) => handleRunExecutionThread(thread.id));
      await Promise.all(promises);
    }
  };

  // Calculate total combinations using visibility-aware function
  const totalCombinations = calculateCombinationCount(config);
  const anyThreadRunning = config.executionThreads.some(thread => thread.isRunning);

  // Replace the allBioNames section with typed version
  const allBioNames = new Set<string>();
  config.executionThreads.forEach((thread: ExecutionThread) => {
    let bios: Array<Record<string, unknown>>;
    try {
      bios = JSON.parse(thread.dataThread.data);
    } catch {
      return;
    }
    bios.forEach((b: Record<string, unknown>) => allBioNames.add(String(b.name)));
  });
  const uniqueDataNames: string[] = Array.from(allBioNames).sort();

  // Update copy functions with types
  const countWords = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

  /** Format text for copy including word count */
  const formatCopyText = (content: string) => {
    const words = countWords(content);
    return `${content}\n\n(${words} words)`;
  };

  const copyCell = (thread: ExecutionThread, bioName: string) => {
    const resp = thread.responses?.find((r: BiographerResponse) => r.name === bioName);
    const textToCopy = resp ? formatCopyText(resp.response) : '';
    handleCopy(textToCopy, `cell-${thread.id}-${bioName}`);
  };

  const copyThread = (thread: ExecutionThread) => {
    const text = (thread.responses || [])
      .map((r: BiographerResponse) => `${r.name}:\n${formatCopyText(r.response || '')}`)
      .join('\n\n');
    handleCopy(text, `thread-${thread.id}`);
  };

  const copyAll = () => {
    const headers = ['Data', ...config.executionThreads.map((t: ExecutionThread) => t.name)];
    const rows = uniqueDataNames.map((bio: string) => {
      const row = [bio];
      config.executionThreads.forEach((t: ExecutionThread) => {
        const resp = (t.responses || [])?.find((r: BiographerResponse) => r.name === bio)?.response || '';
        row.push(resp.replace(/"/g, '""'));
      });
      return `"${row.join('","')}"`;
    });
    const csv = [headers.join(','), ...rows].join('\n');
    handleCopy(csv, 'copy-all');
  };

  // Add constant near other constants (just after uniqueBiographers maybe)
  const BIO_COL_WIDTH = 150; // px fixed for first column
  const THREAD_COL_WIDTH = 320; // px fixed width for each thread column (all equal)

  // Module-level copy helpers
  const copyModelThread = (thread: ModelThread) => {
    const text = `Model Thread: ${thread.name}\nProvider: ${thread.provider}\nModel: ${thread.model}`;
    handleCopy(text, `model-${thread.id}`);
  };

  const copyDataThread = (thread: DataThread) => {
    const text = `Data Thread: ${thread.name}\n${thread.data}`;
    handleCopy(text, `data-${thread.id}`);
  };

  const copySystemPromptThread = (thread: SystemPromptThread) => {
    const text = `System Prompt Thread: ${thread.name}\n${thread.prompt}`;
    handleCopy(text, `system-${thread.id}`);
  };

  const copyInitialMessageThread = (thread: InitialMessageThread) => {
    const text = `Initial Message Thread: ${thread.name}\n${thread.message}`;
    handleCopy(text, `initial-${thread.id}`);
  };

  const copyUserMessageThread = (thread: UserMessageThread) => {
    const text = `User Message Thread: ${thread.name}\n${thread.message}`;
    handleCopy(text, `user-${thread.id}`);
  };

  // Modify getCellContent
  const getCellContent = (thread: ExecutionThread, bioName: string) => {
    const resp = (thread.responses || []).find((r: BiographerResponse) => r.name === bioName);
    if (!resp) return <div className="text-gray-500">Not available</div>;
    if (resp.loading) {
      return (
        <div className="flex items-center gap-2 text-gray-500 text-xs">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading...
        </div>
      );
    }
    if (resp.error) return <div className="text-red-600 text-xs">Error: {resp.error}</div>;

    const durationText = resp.duration !== undefined ? `${resp.duration.toFixed(1)}s` : '--';

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] text-gray-500 whitespace-nowrap">
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{durationText}</span>
            <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{resp.wordCount ?? 0}</span>
            <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{resp.tokenCount ?? 0}</span>
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="hover:bg-muted"
            onClick={() => copyCell(thread, bioName)}
          >
            {copiedStates && copiedStates[`cell-${thread.id}-${bioName}`] ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
        <div className="max-h-32 overflow-y-auto text-sm whitespace-pre-wrap break-words">
          {resp.response}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto p-6 space-y-6 max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold">Pipeline Threading Playground</h1>
            <p className="text-sm text-gray-600">
              Thread at any stage • {totalCombinations} {totalCombinations === 1 ? 'combination' : 'combinations'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleRunAllExecutionThreads}
            disabled={anyThreadRunning || totalCombinations === 0}
            variant="default"
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Run All ({totalCombinations})
          </Button>
        </div>
      </div>

      {/* Pipeline Flow Visualization */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-4 text-sm font-medium text-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              Models ({config.modelThreads.length})
            </div>
            <div>→</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              Data ({config.dataThreads.length})
            </div>
            <div>→</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              System ({config.systemPromptThreads.length})
            </div>
            <div>→</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              Initial ({config.initialMessageThreads.length})
            </div>
            <div>→</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              User ({config.userMessageThreads.length})
            </div>
            <div>→</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              Output ({totalCombinations})
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Threading - Each Thread as Separate Module */}
      <div className="space-y-6">
        {/* Model Threads */}
        <div className="space-y-3">
          <div className="grid gap-4 items-start" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
            {config.modelThreads.length < 3 ? (
              <div className={`grid gap-4 ${config.modelThreads.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {config.modelThreads.map((thread) => (
                  <CollapsibleCard
                    key={thread.id}
                    id={thread.id}
                    name={thread.name}
                    onNameChange={(name) => handleUpdateModelThread(thread.id, { name })}
                    onDuplicate={() => handleDuplicateModelThread(thread.id)}
                    onDelete={() => handleDeleteModelThread(thread.id)}
                    canDelete={config.modelThreads.length > 1}
                    borderColor="border-blue-200"
                    subtitle={`Model: ${thread.name}`}
                    icon={<Brain className="h-4 w-4 text-blue-600" />}
                    onCopy={() => copyModelThread(thread)}
                    copied={!!(copiedStates && copiedStates[`model-${thread.id}`])}
                    visible={thread.visible}
                    onVisibilityToggle={() => handleUpdateModelThread(thread.id, { visible: !thread.visible })}
                  >
                    {renderModelThread(thread, (updates) => handleUpdateModelThread(thread.id, updates))}
                  </CollapsibleCard>
                ))}
              </div>
            ) : (
              <div className="max-w-full overflow-x-auto">
                <ScrollArea className="w-full">
                  <div className="flex gap-4 pb-4">
                    {config.modelThreads.map((thread) => (
                      <div key={thread.id} className="w-[450px] shrink-0">
                        <CollapsibleCard
                          id={thread.id}
                          name={thread.name}
                          onNameChange={(name) => handleUpdateModelThread(thread.id, { name })}
                          onDuplicate={() => handleDuplicateModelThread(thread.id)}
                          onDelete={() => handleDeleteModelThread(thread.id)}
                          canDelete={config.modelThreads.length > 1}
                          borderColor="border-blue-200"
                          subtitle={`Model: ${thread.name}`}
                          icon={<Brain className="h-4 w-4 text-blue-600" />}
                          onCopy={() => copyModelThread(thread)}
                          copied={!!(copiedStates && copiedStates[`model-${thread.id}`])}
                          visible={thread.visible}
                          onVisibilityToggle={() => handleUpdateModelThread(thread.id, { visible: !thread.visible })}
                        >
                          {renderModelThread(thread, (updates) => handleUpdateModelThread(thread.id, updates))}
                        </CollapsibleCard>
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}
            <div
              className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg w-12 h-12 cursor-pointer hover:bg-muted transition-colors self-start"
              onClick={handleAddModelThread}
            >
              <Plus className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Data Threads */}
        <div className="space-y-3">
           <div className="grid gap-4 items-start" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
            {config.dataThreads.length < 3 ? (
              <div className={`grid gap-4 ${config.dataThreads.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {config.dataThreads.map((thread) => (
                  <CollapsibleCard
                    key={thread.id}
                    id={thread.id}
                    name={thread.name}
                    onNameChange={(name) => handleUpdateDataThread(thread.id, { name })}
                    onDuplicate={() => handleDuplicateDataThread(thread.id)}
                    onDelete={() => handleDeleteDataThread(thread.id)}
                    canDelete={config.dataThreads.length > 1}
                    borderColor="border-green-200"
                    subtitle={`Data: ${thread.name}`}
                    icon={<Database className="h-4 w-4 text-green-600" />}
                    onCopy={() => copyDataThread(thread)}
                    copied={!!(copiedStates && copiedStates[`data-${thread.id}`])}
                    visible={thread.visible}
                    onVisibilityToggle={() => handleUpdateDataThread(thread.id, { visible: !thread.visible })}
                  >
                    {renderDataThread(thread, (updates) => handleUpdateDataThread(thread.id, updates))}
                  </CollapsibleCard>
                ))}
              </div>
            ) : (
              <div className="max-w-full overflow-x-auto">
                <ScrollArea className="w-full">
                  <div className="flex gap-4 pb-4">
                    {config.dataThreads.map((thread) => (
                      <div key={thread.id} className="w-[450px] shrink-0">
                        <CollapsibleCard
                          id={thread.id}
                          name={thread.name}
                          onNameChange={(name) => handleUpdateDataThread(thread.id, { name })}
                          onDuplicate={() => handleDuplicateDataThread(thread.id)}
                          onDelete={() => handleDeleteDataThread(thread.id)}
                          canDelete={config.dataThreads.length > 1}
                          borderColor="border-green-200"
                          subtitle={`Data: ${thread.name}`}
                          icon={<Database className="h-4 w-4 text-green-600" />}
                          onCopy={() => copyDataThread(thread)}
                          copied={!!(copiedStates && copiedStates[`data-${thread.id}`])}
                          visible={thread.visible}
                          onVisibilityToggle={() => handleUpdateDataThread(thread.id, { visible: !thread.visible })}
                        >
                          {renderDataThread(thread, (updates) => handleUpdateDataThread(thread.id, updates))}
                        </CollapsibleCard>
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}
            <div
              className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg w-12 h-12 cursor-pointer hover:bg-muted transition-colors self-start"
              onClick={handleAddDataThread}
            >
              <Plus className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* System Prompt Threads */}
        <div className="space-y-3">
          <div className="grid gap-4 items-start" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
            {config.systemPromptThreads.length < 3 ? (
              <div className={`grid gap-4 ${config.systemPromptThreads.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {config.systemPromptThreads.map((thread) => (
                  <CollapsibleCard
                    key={thread.id}
                    id={thread.id}
                    name={thread.name}
                    onNameChange={(name) => handleUpdateSystemPromptThread(thread.id, { name })}
                    onDuplicate={() => handleDuplicateSystemPromptThread(thread.id)}
                    onDelete={() => handleDeleteSystemPromptThread(thread.id)}
                    canDelete={config.systemPromptThreads.length > 1}
                    borderColor="border-yellow-200"
                    subtitle={`Prompt: ${thread.name}`}
                    icon={<Cpu className="h-4 w-4 text-yellow-600" />}
                    onCopy={() => copySystemPromptThread(thread)}
                    copied={!!(copiedStates && copiedStates[`system-${thread.id}`])}
                    visible={thread.visible}
                    onVisibilityToggle={() => handleUpdateSystemPromptThread(thread.id, { visible: !thread.visible })}
                  >
                    {renderSystemPromptThread(thread, (updates) => handleUpdateSystemPromptThread(thread.id, updates))}
                  </CollapsibleCard>
                ))}
              </div>
            ) : (
              <div className="max-w-full overflow-x-auto">
                <ScrollArea className="w-full">
                  <div className="flex gap-4 pb-4">
                    {config.systemPromptThreads.map((thread) => (
                      <div key={thread.id} className="w-[450px] shrink-0">
                        <CollapsibleCard
                          id={thread.id}
                          name={thread.name}
                          onNameChange={(name) => handleUpdateSystemPromptThread(thread.id, { name })}
                          onDuplicate={() => handleDuplicateSystemPromptThread(thread.id)}
                          onDelete={() => handleDeleteSystemPromptThread(thread.id)}
                          canDelete={config.systemPromptThreads.length > 1}
                          borderColor="border-yellow-200"
                          subtitle={`Prompt: ${thread.name}`}
                          icon={<Cpu className="h-4 w-4 text-yellow-600" />}
                          onCopy={() => copySystemPromptThread(thread)}
                          copied={!!(copiedStates && copiedStates[`system-${thread.id}`])}
                          visible={thread.visible}
                          onVisibilityToggle={() => handleUpdateSystemPromptThread(thread.id, { visible: !thread.visible })}
                        >
                          {renderSystemPromptThread(thread, (updates) => handleUpdateSystemPromptThread(thread.id, updates))}
                        </CollapsibleCard>
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}
            <div
              className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg w-12 h-12 cursor-pointer hover:bg-muted transition-colors self-start"
              onClick={handleAddSystemPromptThread}
            >
              <Plus className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Initial Message Threads */}
        <div className="space-y-3">
          <div className="grid gap-4 items-start" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
            {config.initialMessageThreads.length < 3 ? (
              <div className={`grid gap-4 ${config.initialMessageThreads.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {config.initialMessageThreads.map((thread) => (
                  <CollapsibleCard
                    key={thread.id}
                    id={thread.id}
                    name={thread.name}
                    onNameChange={(name) => handleUpdateInitialMessageThread(thread.id, { name })}
                    onDuplicate={() => handleDuplicateInitialMessageThread(thread.id)}
                    onDelete={() => handleDeleteInitialMessageThread(thread.id)}
                    canDelete={config.initialMessageThreads.length > 1}
                    borderColor="border-orange-200"
                    subtitle={`Message: ${thread.name}`}
                    icon={<MessageSquare className="h-4 w-4 text-orange-600" />}
                    onCopy={() => copyInitialMessageThread(thread)}
                    copied={!!(copiedStates && copiedStates[`initial-${thread.id}`])}
                    visible={thread.visible}
                    onVisibilityToggle={() => handleUpdateInitialMessageThread(thread.id, { visible: !thread.visible })}
                  >
                    {renderInitialMessageThread(thread, (updates) => handleUpdateInitialMessageThread(thread.id, updates))}
                  </CollapsibleCard>
                ))}
              </div>
            ) : (
              <div className="max-w-full overflow-x-auto">
                <ScrollArea className="w-full">
                  <div className="flex gap-4 pb-4">
                    {config.initialMessageThreads.map((thread) => (
                      <div key={thread.id} className="w-[450px] shrink-0">
                        <CollapsibleCard
                          id={thread.id}
                          name={thread.name}
                          onNameChange={(name) => handleUpdateInitialMessageThread(thread.id, { name })}
                          onDuplicate={() => handleDuplicateInitialMessageThread(thread.id)}
                          onDelete={() => handleDeleteInitialMessageThread(thread.id)}
                          canDelete={config.initialMessageThreads.length > 1}
                          borderColor="border-orange-200"
                          subtitle={`Message: ${thread.name}`}
                          icon={<MessageSquare className="h-4 w-4 text-orange-600" />}
                          onCopy={() => copyInitialMessageThread(thread)}
                          copied={!!(copiedStates && copiedStates[`initial-${thread.id}`])}
                          visible={thread.visible}
                          onVisibilityToggle={() => handleUpdateInitialMessageThread(thread.id, { visible: !thread.visible })}
                        >
                          {renderInitialMessageThread(thread, (updates) => handleUpdateInitialMessageThread(thread.id, updates))}
                        </CollapsibleCard>
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}
            <div
              className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg w-12 h-12 cursor-pointer hover:bg-muted transition-colors self-start"
              onClick={handleAddInitialMessageThread}
            >
              <Plus className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* User Message Threads */}
        <div className="space-y-3">
          <div className="grid gap-4 items-start" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
            {config.userMessageThreads.length < 3 ? (
              <div className={`grid gap-4 ${config.userMessageThreads.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {config.userMessageThreads.map((thread) => (
                  <CollapsibleCard
                    key={thread.id}
                    id={thread.id}
                    name={thread.name}
                    onNameChange={(name) => handleUpdateUserMessageThread(thread.id, { name })}
                    onDuplicate={() => handleDuplicateUserMessageThread(thread.id)}
                    onDelete={() => handleDeleteUserMessageThread(thread.id)}
                    canDelete={config.userMessageThreads.length > 1}
                    borderColor="border-red-200"
                    subtitle={`Message: ${thread.name}`}
                    icon={<UserIcon className="h-4 w-4 text-red-600" />}
                    onCopy={() => copyUserMessageThread(thread)}
                    copied={!!(copiedStates && copiedStates[`user-${thread.id}`])}
                    visible={thread.visible}
                    onVisibilityToggle={() => handleUpdateUserMessageThread(thread.id, { visible: !thread.visible })}
                  >
                    {renderUserMessageThread(thread, (updates) => handleUpdateUserMessageThread(thread.id, updates))}
                  </CollapsibleCard>
                ))}
              </div>
            ) : (
              <div className="max-w-full overflow-x-auto">
                <ScrollArea className="w-full">
                  <div className="flex gap-4 pb-4">
                    {config.userMessageThreads.map((thread) => (
                      <div key={thread.id} className="w-[450px] shrink-0">
                        <CollapsibleCard
                          id={thread.id}
                          name={thread.name}
                          onNameChange={(name) => handleUpdateUserMessageThread(thread.id, { name })}
                          onDuplicate={() => handleDuplicateUserMessageThread(thread.id)}
                          onDelete={() => handleDeleteUserMessageThread(thread.id)}
                          canDelete={config.userMessageThreads.length > 1}
                          borderColor="border-red-200"
                          subtitle={`Message: ${thread.name}`}
                          icon={<UserIcon className="h-4 w-4 text-red-600" />}
                          onCopy={() => copyUserMessageThread(thread)}
                          copied={!!(copiedStates && copiedStates[`user-${thread.id}`])}
                          visible={thread.visible}
                          onVisibilityToggle={() => handleUpdateUserMessageThread(thread.id, { visible: !thread.visible })}
                        >
                          {renderUserMessageThread(thread, (updates) => handleUpdateUserMessageThread(thread.id, updates))}
                        </CollapsibleCard>
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}
            <div
              className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg w-12 h-12 cursor-pointer hover:bg-muted transition-colors self-start"
              onClick={handleAddUserMessageThread}
            >
              <Plus className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      <div className="space-y-3">
        <div 
          className="flex items-center justify-between hover:bg-muted transition-colors rounded p-2"
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <h3 className="text-lg font-semibold">Results Grid ({totalCombinations} combinations)</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                copyAll();
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              {copiedStates && copiedStates['copy-all'] ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copy All
            </Button>
          </div>
        </div>
        <ScrollArea className="w-full border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="sticky left-0 bg-gray-50 px-4 py-2 text-left text-sm font-medium text-gray-900" style={{width: BIO_COL_WIDTH, minWidth: BIO_COL_WIDTH}}>Biographer</th>
            {config.executionThreads.map((thread) => (
                    <th
                      key={thread.id}
                      style={{
                        width: THREAD_COL_WIDTH,
                        minWidth: THREAD_COL_WIDTH,
                      }}
                      className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-l border-gray-200"
                    >
                  <div className="flex items-center justify-between">
                        <span className="truncate max-w-[200px]">{thread.name}</span>
                        <div className="flex items-center gap-1">
                    <Button
                            size="icon"
                            variant="ghost"
                      onClick={() => handleRunExecutionThread(thread.id)}
                      disabled={thread.isRunning}
                    >
                            {thread.isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    </Button>
                          <Button size="icon" variant="ghost" className="hover:bg-muted" onClick={() => copyThread(thread)}>
                            {copiedStates && copiedStates[`thread-${thread.id}`] ? (
                              <Check className="h-4 w-4 text-green-600" />
                        ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                      </div>
                  </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {uniqueDataNames.map((dataName: string) => (
                  <tr key={dataName}>
                    <td className="sticky left-0 bg-white whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-900" style={{width: BIO_COL_WIDTH, minWidth: BIO_COL_WIDTH}}>{dataName}</td>
                    {config.executionThreads.map((thread) => (
                      <td
                        key={thread.id}
                        style={{
                          width: THREAD_COL_WIDTH,
                          minWidth: THREAD_COL_WIDTH,
                        }}
                        className="whitespace-normal px-4 py-2 text-sm text-gray-500 align-top border-l border-gray-200"
                      >
                        {getCellContent(thread, dataName)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
      </div>

      {/* Floating Run Button */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <Button
          onClick={handleRunAllExecutionThreads}
          disabled={anyThreadRunning || totalCombinations === 0}
          size="lg"
          className="shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 text-base font-semibold rounded-full"
        >
          {anyThreadRunning ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-5 w-5 mr-2" />
              Run All ({totalCombinations})
            </>
          )}
        </Button>
      </div>
    </div>
  );
}