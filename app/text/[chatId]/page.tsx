/**
 * @fileoverview GenerateText Playground
 * 
 * This page provides a comprehensive testing system for text generation.
 * Each stage of the pipeline (Model → System → Prompt → Output) can
 * have multiple threads, and all combinations are executed as separate threads.
 * 
 * Architecture:
 * - Model threads: Different AI models/providers
 * - System prompt threads: Different system instructions
 * - Prompt data threads: Different input prompts
 * - Execution threads: All combinations of the above
 */

'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useAtom } from 'jotai';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Play, GitBranch, Brain, Cpu, FileJson, LayoutGrid } from 'lucide-react';
import { getGenerateTextThreadKey, buildSnapshotFromThread } from '@/lib/atoms';
import { 
  configAtomFamily
} from '@/lib/atoms/generate-text-chat';
import {
  GenerateTextModelThread,
  SystemPromptThread,
  PromptDataThread,
  GenerateTextExecutionThread,
  GenerateTextConfig,
  GenerateTextResult,
} from '@/components/generate-text-playground/types';
import {
  TextModelThreadSection,
  TextSystemPromptThreadSection,
  TextPromptDataThreadSection,
} from '@/components/generate-text-playground/CollapsibleThreadSection';
import { TextResultsGrid } from '@/components/generate-text-playground/ResultsGrid';
import { generateId } from '@/components/prompt-playground/shared/utils';
import { replaceVariables } from '@/components/generate-object-playground/utils';
import { FloatingNav, useFloatingNav, type NavSection } from '@/components/shared/floating-nav';
// Module hydration uses localStorage directly (no hooks needed here)

// Default values
const DEFAULT_SYSTEM_PROMPT = `You are a helpful and creative writing assistant. Generate clear, engaging, and relevant text based on the user's prompt.`;

const DEFAULT_PROMPT = `Write a short story about a robot who discovers they can dream.`;

export default function GenerateTextPlaygroundPage({ 
  params 
}: { 
  params: Promise<{ chatId: string }> 
}) {
  // Unwrap the params Promise
  const { chatId } = use(params);
  
  // Set per-page namespace for storage keys (scoped to text/[chatId])
  if (typeof window !== 'undefined') {
    (window as unknown as { __PAGE_NS__?: string }).__PAGE_NS__ = `@text-chat-${chatId}`;
  }
  
  const [mounted, setMounted] = useState(false);

  // Refs for scrolling to sections
  const modelSectionRef = useRef<HTMLDivElement>(null);
  const systemSectionRef = useRef<HTMLDivElement>(null);
  const promptSectionRef = useRef<HTMLDivElement>(null);
  const resultsSectionRef = useRef<HTMLDivElement>(null);
  const horizontalNavRef = useRef<HTMLDivElement>(null);

  // Navigation state (using custom hook)
  const {
    navMode,
    showFloatingNav,
    isExiting,
    isToggling,
    activeSection,
    setActiveSection,
    handleToggleNav,
  } = useFloatingNav({
    horizontalNavRef,
    sectionKeys: ['models', 'system', 'prompts', 'results'],
    mounted,
  });

  // Chat-specific config atom - unique per chatId
  const configAtom = configAtomFamily(chatId);
  const [config, setConfig] = useAtom(configAtom);
  
  // Wait for client mount to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Set defaults if config is empty
  useEffect(() => {
    if (!mounted) return;
    
    if (config.modelThreads.length === 0) {
      console.log('🏗️ Setting default config');
      setConfig({
          modelThreads: [
            {
              id: generateId(),
              name: 'gpt-4o',
              provider: 'openai',
              model: 'gpt-4o',
              visible: true,
              isExpanded: true
            }
          ],
          systemPromptThreads: [
            {
              id: generateId(),
              name: 'Default System',
              prompt: DEFAULT_SYSTEM_PROMPT,
              visible: true,
              isExpanded: true
            }
          ],
          promptDataThreads: [
            {
              id: generateId(),
              name: 'Robot Dreams Story',
              prompt: DEFAULT_PROMPT,
              visible: true,
              isExpanded: true
            }
          ],
          executionThreads: [],
          temperature: 0.7
        });
      }
  }, [mounted, config.modelThreads.length, setConfig]);

  // OLD HYDRATION CODE - REMOVED (using Jotai persistence now)
  /*
  useEffect(() => {
    try {
      const readLockedSnapshots = (
        section: 'model' | 'schema' | 'system' | 'prompt'
      ): Array<{ key: string; data: Record<string, unknown> }> => {
        const out: Array<{ key: string; data: Record<string, unknown> }> = [];
        const ns = (typeof window !== 'undefined' ? (window as unknown as { __PAGE_NS__?: string }).__PAGE_NS__ : undefined) || 'root';
        const prefix = `snapshot:${ns}:go-mod-snap:${section}|#|`;
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k) continue;
          if (!k.startsWith(prefix)) continue;
          const nameKey = k.replace(`snapshot:${ns}:go-mod-snap:`, '');
          const snapRaw = localStorage.getItem(`snapshot:${ns}:go-mod-snap:${nameKey}`);
          if (!snapRaw) continue;
          try {
            const snap = JSON.parse(snapRaw);
            if (snap?.data) out.push({ key: nameKey, data: snap.data });
          } catch {}
        }
        return out;
      };

      const applySnapIfLocked = <T extends { id: string; name: string; provider?: string; model?: string; schema?: string; schemaDescription?: string; prompt?: string; visible?: boolean }>(
        section: 'model' | 'schema' | 'system' | 'prompt',
        items: T[],
        pickFields: (snap: Record<string, unknown>) => Partial<T>
      ): T[] => {
        const ns = (typeof window !== 'undefined' ? (window as unknown as { __PAGE_NS__?: string }).__PAGE_NS__ : undefined) || 'root';
        return items.map((item) => {
          const key = `${section}|#|${item.name}`;
          const raw = localStorage.getItem(`snapshot:${ns}:go-mod-snap:${key}`);
          if (!raw) return item;
          const snap = JSON.parse(raw) as { data?: Record<string, unknown> } | null;
          if (!snap?.data) return item;
          const fields = pickFields(snap.data);
          return { ...item, ...fields };
        });
      };

      setConfig(prev => {
        // Add missing threads from locked snapshots first
        const modelSnaps = readLockedSnapshots('model');
        const schemaSnaps = readLockedSnapshots('schema');
        const systemSnaps = readLockedSnapshots('system');
        const promptSnaps = readLockedSnapshots('prompt');

        const existingModelNames = new Set(prev.modelThreads.map(t => t.name));
        const existingSchemaNames = new Set(prev.schemaThreads.map(t => t.name));
        const existingSystemNames = new Set(prev.systemPromptThreads.map(t => t.name));
        const existingPromptNames = new Set(prev.promptDataThreads.map(t => t.name));

        const addedModelThreads = modelSnaps
          .filter(s => typeof s.data.name === 'string' && !existingModelNames.has(s.data.name as string))
          .map(s => ({
            id: generateId(),
            name: s.data.name as string,
            provider: (s.data.provider as string) || 'openai',
            model: (s.data.model as string) || 'gpt-4o',
            visible: (s.data.visible as boolean) ?? true,
          } as GenerateObjectModelThread));

        const addedSchemaThreads = schemaSnaps
          .filter(s => typeof s.data.name === 'string' && !existingSchemaNames.has(s.data.name as string))
          .map(s => ({
            id: generateId(),
            name: s.data.name as string,
            schema: (s.data.schema as string) || '',
            schemaDescription: (s.data.schemaDescription as string) || undefined,
            visible: (s.data.visible as boolean) ?? true,
          } as SchemaThread));

        const addedSystemThreads = systemSnaps
          .filter(s => typeof s.data.name === 'string' && !existingSystemNames.has(s.data.name as string))
          .map(s => ({
            id: generateId(),
            name: s.data.name as string,
            prompt: (s.data.prompt as string) || '',
            visible: (s.data.visible as boolean) ?? true,
          } as SystemPromptThread));

        const addedPromptThreads = promptSnaps
          .filter(s => typeof s.data.name === 'string' && !existingPromptNames.has(s.data.name as string))
          .map(s => ({
            id: generateId(),
            name: s.data.name as string,
            prompt: (s.data.prompt as string) || '',
            visible: (s.data.visible as boolean) ?? true,
          } as PromptDataThread));

        const mergedModels = [...prev.modelThreads, ...addedModelThreads];
        const mergedSchemas = [...prev.schemaThreads, ...addedSchemaThreads];
        const mergedSystems = [...prev.systemPromptThreads, ...addedSystemThreads];
        const mergedPrompts = [...prev.promptDataThreads, ...addedPromptThreads];

        return {
          ...prev,
          modelThreads: applySnapIfLocked('model', mergedModels, (d) => ({ 
            name: d.name as string, 
            provider: d.provider as string, 
            model: d.model as string, 
            visible: d.visible as boolean 
          })),
          schemaThreads: applySnapIfLocked('schema', mergedSchemas, (d) => ({ 
            name: d.name as string, 
            schema: d.schema as string, 
            schemaDescription: d.schemaDescription as string | undefined, 
            visible: d.visible as boolean 
          })),
          systemPromptThreads: applySnapIfLocked('system', mergedSystems, (d) => ({ 
            name: d.name as string, 
            prompt: d.prompt as string, 
            visible: d.visible as boolean 
          })),
          promptDataThreads: applySnapIfLocked('prompt', mergedPrompts, (d) => ({ 
            name: d.name as string, 
            prompt: d.prompt as string, 
            visible: d.visible as boolean 
          })),
        };
      });
    } catch {}
    // run only once on mount
  }, []);
  */

  // Update execution threads whenever pipeline threads change
  useEffect(() => {
    setConfig(prev => {
      const newExecutionThreads: GenerateTextExecutionThread[] = [];
      prev?.modelThreads?.filter(t => t.visible).forEach(modelThread => {
        prev?.systemPromptThreads?.filter(t => t.visible).forEach(systemThread => {
          prev?.promptDataThreads?.filter(t => t.visible).forEach(promptThread => {
            const name = `${modelThread.name} × ${systemThread.name} × ${promptThread.name}`;
            const existingThread = prev?.executionThreads?.find(t => t.name === name);
            newExecutionThreads.push({
              id: existingThread?.id || generateId(),
              name,
              modelThread,
              systemPromptThread: systemThread,
              promptDataThread: promptThread,
              visible: true,
              isRunning: existingThread?.isRunning || false,
              result: existingThread?.result
            });
          });
        });
      });
      return prev ? { ...prev, executionThreads: newExecutionThreads } : prev;
    });
  }, [
    config?.modelThreads,
    config?.systemPromptThreads,
    config?.promptDataThreads,
    setConfig
  ]);

  const handleUpdateConfig = (updates: Partial<GenerateTextConfig>) => {
    setConfig(prev => prev ? ({ ...prev, ...updates }) : prev);
  };

  // Copy management
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

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

  // Model thread handlers
  const handleAddModelThread = () => {
    const newThread: GenerateTextModelThread = {
      id: generateId(),
      name: `Model ${config.modelThreads.length + 1}`,
      provider: 'openai',
      model: 'gpt-4o',
      visible: true,
      isExpanded: true
    };
    handleUpdateConfig({
      modelThreads: [...config.modelThreads, newThread]
    });
  };

  const handleUpdateModelThread = (id: string, updates: Partial<GenerateTextModelThread>) => {
    handleUpdateConfig({
      modelThreads: config.modelThreads.map(thread => 
        thread.id === id ? { ...thread, ...updates } : thread
      )
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
      const newThread = { ...thread, id: generateId(), name: `${thread.name} (Copy)`, isExpanded: true };
      handleUpdateConfig({
        modelThreads: [...config.modelThreads, newThread]
      });
    }
  };


  // System prompt thread handlers
  const handleAddSystemPromptThread = () => {
    const newThread: SystemPromptThread = {
      id: generateId(),
      name: `System ${config.systemPromptThreads.length + 1}`,
      prompt: DEFAULT_SYSTEM_PROMPT,
      visible: true,
      isExpanded: true
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
      const newThread = { ...thread, id: generateId(), name: `${thread.name} (Copy)`, isExpanded: true };
      handleUpdateConfig({
        systemPromptThreads: [...config.systemPromptThreads, newThread]
      });
    }
  };

  // Prompt data thread handlers
  const handleAddPromptDataThread = () => {
    const newThread: PromptDataThread = {
      id: generateId(),
      name: `Prompt ${config.promptDataThreads.length + 1}`,
      prompt: DEFAULT_PROMPT,
      visible: true,
      isExpanded: true
    };
    handleUpdateConfig({
      promptDataThreads: [...config.promptDataThreads, newThread]
    });
  };

  const handleUpdatePromptDataThread = (id: string, updates: Partial<PromptDataThread>) => {
    handleUpdateConfig({
      promptDataThreads: config.promptDataThreads.map(thread => 
        thread.id === id ? { ...thread, ...updates } : thread
      )
    });
  };

  const handleDeletePromptDataThread = (id: string) => {
    if (config.promptDataThreads.length > 1) {
      handleUpdateConfig({
        promptDataThreads: config.promptDataThreads.filter(thread => thread.id !== id)
      });
    }
  };

  const handleDuplicatePromptDataThread = (id: string) => {
    const thread = config.promptDataThreads.find(t => t.id === id);
    if (thread) {
      const newThread = { ...thread, id: generateId(), name: `${thread.name} (Copy)`, isExpanded: true };
      handleUpdateConfig({
        promptDataThreads: [...config.promptDataThreads, newThread]
      });
    }
  };

  // Execution handlers
  const handleRunExecutionThread = async (threadId: string) => {
    const thread = config.executionThreads.find(t => t.id === threadId);
    if (!thread) return;

    // Skip if locked
    const ns = (typeof window !== 'undefined' ? (window as unknown as { __PAGE_NS__?: string }).__PAGE_NS__ : undefined);
    const colKey = getGenerateTextThreadKey(thread, ns);
    const hasSnap = (typeof window !== 'undefined') ? !!localStorage.getItem(`snapshot:${ns || 'root'}:go-snap:${colKey}`) : false;
    if (hasSnap) return;

    // Set thread to running state
    setConfig(prev => ({
      ...prev,
      executionThreads: prev.executionThreads.map(t =>
        t.id === threadId ? { ...t, isRunning: true, result: undefined } : t
      )
    }));

    try {
      // Replace variables in system prompt and prompt data
      const processedSystemPrompt = replaceVariables(
        thread.systemPromptThread.prompt,
        thread.systemPromptThread.variables
      );

      const processedPrompt = replaceVariables(
        thread.promptDataThread.prompt,
        thread.promptDataThread.variables
      );

      const response = await fetch('/api/generate-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: thread.modelThread.model,
          provider: thread.modelThread.provider,
          system: processedSystemPrompt,
          prompt: processedPrompt,
          temperature: config.temperature,
          maxOutputTokens: config.maxOutputTokens
        }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        const result: GenerateTextResult = {
          success: false,
          error: data.error || 'Request failed',
          duration: data.duration || 0,
          finishReason: data.finishReason,
          usage: data.usage
        };
        
        // Update thread with error result
        setConfig(prev => ({
          ...prev,
          executionThreads: prev.executionThreads.map(t =>
            t.id === threadId ? { ...t, isRunning: false, result } : t
          )
        }));
        return;
      }

      const result: GenerateTextResult = {
        success: data.success,
        text: data.text,
        error: data.error,
        duration: data.duration,
        finishReason: data.finishReason,
        usage: data.usage
      };

      // Update thread with result
      setConfig(prev => ({
        ...prev,
        executionThreads: prev.executionThreads.map(t =>
          t.id === threadId ? { ...t, isRunning: false, result } : t
        )
      }));

      // If this column is locked at the moment of completion, snapshot it (covers manual lock before run edge-cases)
      const key = getGenerateTextThreadKey(thread, ns);
      const hasSnapNow = (typeof window !== 'undefined') ? !!localStorage.getItem(`snapshot:${ns || 'root'}:go-snap:${key}`) : false;
      if (hasSnapNow) {
        try {
          localStorage.setItem(`snapshot:${ns || 'root'}:go-snap:${key}`, JSON.stringify(buildSnapshotFromThread({ ...thread, result })));
        } catch {}
      }
    } catch (error) {
      console.error('Error running execution thread:', error);
      
      const result: GenerateTextResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: 0
      };

      setConfig(prev => ({
        ...prev,
        executionThreads: prev.executionThreads.map(t =>
          t.id === threadId ? { ...t, isRunning: false, result } : t
        )
      }));
    }
  };

  const handleRunAllExecutionThreads = async () => {
    // Run all visible execution threads
    const visibleThreads = config.executionThreads.filter(thread => thread.visible);
    
    // Run in batches to prevent rate limiting
    const batchSize = 3;
    for (let i = 0; i < visibleThreads.length; i += batchSize) {
      const batch = visibleThreads.slice(i, i + batchSize);
      await Promise.all(batch.map(thread => handleRunExecutionThread(thread.id)));
    }
  };

  // Calculate total combinations (with null check)
  const totalCombinations = config?.executionThreads?.filter(t => t.visible).length || 0;
  const anyThreadRunning = config?.executionThreads?.some(thread => thread.isRunning) || false;

  // Scroll to section
  const scrollToSection = (sectionKey: string) => {
    const sectionRefs: Record<string, React.RefObject<HTMLDivElement>> = {
      models: modelSectionRef,
      system: systemSectionRef,
      prompts: promptSectionRef,
      results: resultsSectionRef,
    };
    sectionRefs[sectionKey]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Define navigation sections (after totalCombinations is calculated)
  const navSections: NavSection[] = [
    {
      key: 'models',
      label: 'Models',
      icon: Brain,
      count: config?.modelThreads?.length || 0,
      color: {
        text: 'text-blue-600',
        glow: 'rgba(59,130,246,0.5)',
        hoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-900/30',
      },
      ref: modelSectionRef,
    },
    {
      key: 'system',
      label: 'System',
      icon: Cpu,
      count: config?.systemPromptThreads?.length || 0,
      color: {
        text: 'text-yellow-600',
        glow: 'rgba(234,179,8,0.5)',
        hoverBg: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30',
      },
      ref: systemSectionRef,
    },
    {
      key: 'prompts',
      label: 'Prompts',
      icon: FileJson,
      count: config?.promptDataThreads?.length || 0,
      color: {
        text: 'text-orange-600',
        glow: 'rgba(249,115,22,0.5)',
        hoverBg: 'hover:bg-orange-100 dark:hover:bg-orange-900/30',
      },
      ref: promptSectionRef,
    },
    {
      key: 'results',
      label: 'Output',
      icon: LayoutGrid,
      count: totalCombinations,
      color: {
        text: 'text-purple-600',
        glow: 'rgba(168,85,247,0.5)',
        hoverBg: 'hover:bg-purple-100 dark:hover:bg-purple-900/30',
      },
      ref: resultsSectionRef,
    },
  ];

  // Show loading until mounted to prevent hydration issues
  if (!mounted || !config) {
    return (
      <div className="mx-auto p-6 space-y-6 max-w-none">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto p-6 space-y-6 ">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold">GenerateText Playground</h1>
            <p className="text-sm text-gray-600">
              AI text generation • {totalCombinations} {totalCombinations === 1 ? 'combination' : 'combinations'}
            </p>
          </div>
        </div>
        {/* <div className="flex items-center gap-2">
          <Button 
            onClick={handleRunAllExecutionThreads}
            disabled={anyThreadRunning || totalCombinations === 0}
            variant="default"
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Run All ({totalCombinations})
          </Button>
        </div> */}
      </div>


      {/* Pipeline Flow Visualization */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:bg-gradient-to-r dark:from-slate-800 dark:to-slate-900 border-2 border-dashed dark:border-slate-700">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-4 text-sm font-medium text-gray-700 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              Models ({config.modelThreads.length})
            </div>
            <div>→</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              System ({config.systemPromptThreads.length})
            </div>
            <div>�</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              Prompts ({config.promptDataThreads.length})
            </div>
            <div>�</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              Output ({totalCombinations})
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Horizontal Navigation */}
      <div
        ref={horizontalNavRef}
        className="mx-auto w-fit transition-all duration-300"
      >
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-full shadow-lg backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
            <div className="px-6 py-2">
              <div className="flex items-center justify-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {navSections.map((section, index) => {
                  const Icon = section.icon;
                  const isLast = index === navSections.length - 1;

                  return (
                    <div key={section.key} className="flex items-center gap-1">
                      <button
                        onClick={() => scrollToSection(section.key)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all cursor-pointer whitespace-nowrap ${section.color.hoverBg}`}
                        title={`Jump to ${section.label} section`}
                      >
                        <Icon className={`h-4 w-4 ${section.color.text}`} />
                        <span className="hidden sm:inline">{section.label} ({section.count})</span>
                        <span className="sm:hidden">({section.count})</span>
                      </button>
                      {!isLast && <div className="text-gray-400">➜</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <FloatingNav
        sections={navSections}
        showFloatingNav={showFloatingNav}
        navMode={navMode}
        isExiting={isExiting}
        isToggling={isToggling}
        activeSection={activeSection}
        onToggleNav={handleToggleNav}
        onScrollToSection={scrollToSection}
      />

      {/* Pipeline Threading */}
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Model Threads */}
        <div ref={modelSectionRef} data-section="models">
          <span className="scroll-sentinel-start" data-section="models" />
          <TextModelThreadSection
            threads={config.modelThreads}
            onAddThread={handleAddModelThread}
            onUpdateThread={handleUpdateModelThread}
            onDeleteThread={handleDeleteModelThread}
            onDuplicateThread={handleDuplicateModelThread}
            copiedStates={copiedStates}
            onCopy={handleCopy}
          />
          <span className="scroll-sentinel-end" data-section="models" />
        </div>

        {/* System Prompt Threads */}
        <div ref={systemSectionRef} data-section="system">
          <span className="scroll-sentinel-start" data-section="system" />
          <TextSystemPromptThreadSection
            threads={config.systemPromptThreads}
            onAddThread={handleAddSystemPromptThread}
            onUpdateThread={handleUpdateSystemPromptThread}
            onDeleteThread={handleDeleteSystemPromptThread}
            onDuplicateThread={handleDuplicateSystemPromptThread}
            copiedStates={copiedStates}
            onCopy={handleCopy}
          />
          <span className="scroll-sentinel-end" data-section="system" />
        </div>

        {/* Prompt Data Threads */}
        <div ref={promptSectionRef} data-section="prompts">
          <span className="scroll-sentinel-start" data-section="prompts" />
          <TextPromptDataThreadSection
          threads={config.promptDataThreads}
          onAddThread={handleAddPromptDataThread}
          onUpdateThread={handleUpdatePromptDataThread}
          onDeleteThread={handleDeletePromptDataThread}
          onDuplicateThread={handleDuplicatePromptDataThread}
          copiedStates={copiedStates}
          onCopy={handleCopy}
        />
          <span className="scroll-sentinel-end" data-section="prompts" />
        </div>
      </div>

      {/* Results Grid */}
      <div ref={resultsSectionRef} data-section="results">
        <span className="scroll-sentinel-start" data-section="results" />
        <Card className="border-purple-200 border-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <CardTitle>Results ({totalCombinations} combinations)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <TextResultsGrid
              executionThreads={config.executionThreads}
              onRunThread={handleRunExecutionThread}
              onCopy={handleCopy}
              copiedStates={copiedStates}
            />
          </CardContent>
        </Card>
        <span className="scroll-sentinel-end" data-section="results" />
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