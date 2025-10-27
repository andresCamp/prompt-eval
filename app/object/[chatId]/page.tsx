/**
 * @fileoverview GenerateObject Playground
 * 
 * This page provides a comprehensive testing system for structured object generation.
 * Each stage of the pipeline (Model � Schema � System � Prompt � Output) can
 * have multiple threads, and all combinations are executed as separate threads.
 * 
 * Architecture:
 * - Model threads: Different AI models/providers
 * - Schema threads: Different Zod schemas for output structure
 * - System prompt threads: Different system instructions
 * - Prompt data threads: Different input prompts/JSON data
 * - Execution threads: All combinations of the above
 */

'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useAtom } from 'jotai';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, GitBranch, Brain, Code, Cpu, FileJson, LayoutGrid } from 'lucide-react';
import { getGenerateObjectThreadKey, buildSnapshotFromThread } from '@/lib/atoms';
import { 
  configAtomFamily
} from '@/lib/atoms/generate-object-chat';
import {
  GenerateObjectModelThread,
  SchemaThread,
  SystemPromptThread,
  PromptDataThread,
  GenerateObjectExecutionThread,
  GenerateObjectConfig,
  GenerateObjectResult,
} from '@/components/generate-object-playground/types';
import {
  ModelThreadSection,
  SchemaThreadSection,
  SystemPromptThreadSection,
  PromptDataThreadSection,
} from '@/components/generate-object-playground/CollapsibleThreadSection';
import { ResultsGrid } from '@/components/generate-object-playground/ResultsGrid';
import { generateId } from '@/components/prompt-playground/shared/utils';
import { replaceVariables } from '@/components/generate-object-playground/utils';
import { FloatingNav, useFloatingNav, type NavSection } from '@/components/shared/floating-nav';
// Module hydration uses localStorage directly (no hooks needed here)

// Type definitions
type SectionKey = 'models' | 'schemas' | 'system' | 'prompts' | 'results';

// Default values
const DEFAULT_SCHEMA = `z.object({
  name: z.string(),
  description: z.string(),
  category: z.string(),
  price: z.number(),
  inStock: z.boolean()
})`;

const DEFAULT_SYSTEM_PROMPT = `You are a data transformation assistant. Transform the input data into the specified schema format. Ensure all required fields are populated with appropriate values based on the input.`;

const DEFAULT_PROMPT = `{
  "title": "Wireless Bluetooth Headphones",
  "details": "High-quality wireless headphones with noise cancellation",
  "type": "Electronics",
  "cost": 99.99,
  "available": true
}`;

export default function GenerateObjectPlaygroundPage({
  params
}: {
  params: Promise<{ chatId: string }>
}) {
  // Unwrap the params Promise - MUST be first
  const { chatId } = use(params);

  // All hooks MUST be declared before any conditional logic or returns
  const [mounted, setMounted] = useState(false);

  // Refs for scrolling to sections
  const modelSectionRef = useRef<HTMLDivElement>(null);
  const schemaSectionRef = useRef<HTMLDivElement>(null);
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
    sectionKeys: ['models', 'schemas', 'system', 'prompts', 'results'],
    mounted,
  });

  // Copy management
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  // Chat-specific config atom - unique per chatId
  const configAtom = configAtomFamily(chatId);
  const [config, setConfig] = useAtom(configAtom);

  // Set per-page namespace for storage keys (scoped to object/[chatId])
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __PAGE_NS__?: string }).__PAGE_NS__ = `@object-chat-${chatId}`;
    }
  }, [chatId]);

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
          schemaThreads: [
            {
              id: generateId(),
              name: 'Product Schema',
              schema: DEFAULT_SCHEMA,
              schemaDescription: 'Schema for product information',
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
              name: 'Sample Product',
              prompt: DEFAULT_PROMPT,
              visible: true,
              isExpanded: true
            }
          ],
          executionThreads: [],
          temperature: 0.7,
          outputMode: 'object'
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
      const newExecutionThreads: GenerateObjectExecutionThread[] = [];
      prev?.modelThreads?.filter(t => t.visible).forEach(modelThread => {
        prev?.schemaThreads?.filter(t => t.visible).forEach(schemaThread => {
          prev?.systemPromptThreads?.filter(t => t.visible).forEach(systemThread => {
            prev?.promptDataThreads?.filter(t => t.visible).forEach(promptThread => {
              const name = `${modelThread.name} × ${schemaThread.name} × ${systemThread.name} × ${promptThread.name}`;
              const existingThread = prev?.executionThreads?.find(t => t.name === name);
              newExecutionThreads.push({
                id: existingThread?.id || generateId(),
                name,
                modelThread,
                schemaThread,
                systemPromptThread: systemThread,
                promptDataThread: promptThread,
                visible: true,
                isRunning: existingThread?.isRunning || false,
                result: existingThread?.result
              });
            });
          });
        });
      });
      return prev ? { ...prev, executionThreads: newExecutionThreads } : prev;
    });
  }, [
    config?.modelThreads,
    config?.schemaThreads,
    config?.systemPromptThreads,
    config?.promptDataThreads,
    setConfig
  ]);

  // Navigation observers are now handled by the useFloatingNav hook

  const handleUpdateConfig = (updates: Partial<GenerateObjectConfig>) => {
    console.log('handleUpdateConfig called with updates:', updates);
    setConfig(prev => {
      const newConfig = prev ? ({ ...prev, ...updates }) : prev;
      console.log('New config after update:', newConfig);
      return newConfig;
    });
  };

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

  // Scroll to section
  const scrollToSection = (sectionKey: string) => {
    const sectionRefs: Record<string, React.RefObject<HTMLDivElement>> = {
      models: modelSectionRef,
      schemas: schemaSectionRef,
      system: systemSectionRef,
      prompts: promptSectionRef,
      results: resultsSectionRef,
    };
    sectionRefs[sectionKey]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Utility functions for section styling (kept for inline horizontal nav)
  const getSectionColor = (section: SectionKey) => {
    const colors = {
      models: 'text-blue-600',
      schemas: 'text-green-600',
      system: 'text-yellow-600',
      prompts: 'text-orange-600',
      results: 'text-purple-600'
    };
    return colors[section];
  };

  const getSectionHoverBg = (section: SectionKey) => {
    const backgrounds = {
      models: 'hover:bg-blue-100 dark:hover:bg-blue-900/30',
      schemas: 'hover:bg-green-100 dark:hover:bg-green-900/30',
      system: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30',
      prompts: 'hover:bg-orange-100 dark:hover:bg-orange-900/30',
      results: 'hover:bg-purple-100 dark:hover:bg-purple-900/30'
    };
    return backgrounds[section];
  };

  // Model thread handlers
  const handleAddModelThread = () => {
    const newThread: GenerateObjectModelThread = {
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

  const handleUpdateModelThread = (id: string, updates: Partial<GenerateObjectModelThread>) => {
    console.log('handleUpdateModelThread called:', { id, updates });
    const updatedThreads = config.modelThreads.map(thread =>
      thread.id === id ? { ...thread, ...updates } : thread
    );
    console.log('Updated threads:', updatedThreads);
    handleUpdateConfig({
      modelThreads: updatedThreads
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

  // Schema thread handlers
  const handleAddSchemaThread = () => {
    const newThread: SchemaThread = {
      id: generateId(),
      name: `Schema ${config.schemaThreads.length + 1}`,
      schema: DEFAULT_SCHEMA,
      visible: true,
      isExpanded: true
    };
    handleUpdateConfig({
      schemaThreads: [...config.schemaThreads, newThread]
    });
  };

  const handleUpdateSchemaThread = (id: string, updates: Partial<SchemaThread>) => {
    handleUpdateConfig({
      schemaThreads: config.schemaThreads.map(thread => 
        thread.id === id ? { ...thread, ...updates } : thread
      )
    });
  };

  const handleDeleteSchemaThread = (id: string) => {
    if (config.schemaThreads.length > 1) {
      handleUpdateConfig({
        schemaThreads: config.schemaThreads.filter(thread => thread.id !== id)
      });
    }
  };

  const handleDuplicateSchemaThread = (id: string) => {
    const thread = config.schemaThreads.find(t => t.id === id);
    if (thread) {
      const newThread = { ...thread, id: generateId(), name: `${thread.name} (Copy)`, isExpanded: true };
      handleUpdateConfig({
        schemaThreads: [...config.schemaThreads, newThread]
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
    console.log('handleUpdateSystemPromptThread called:', { id, updates });
    const updatedThreads = config.systemPromptThreads.map(thread =>
      thread.id === id ? { ...thread, ...updates } : thread
    );
    console.log('Updated system prompt threads:', updatedThreads);
    handleUpdateConfig({
      systemPromptThreads: updatedThreads
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
    const colKey = getGenerateObjectThreadKey(thread, ns);
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

      const processedPromptData = replaceVariables(
        thread.promptDataThread.prompt,
        thread.promptDataThread.variables
      );

      // Ensure prompt is a string - stringify if it's JSON
      let promptString = processedPromptData;
      try {
        // Check if prompt is already valid JSON string
        JSON.parse(promptString);
        // It's valid JSON, use as is
      } catch {
        // Not JSON string, check if it needs stringification
        if (typeof promptString === 'object') {
          promptString = JSON.stringify(promptString);
        }
      }

      const response = await fetch('/api/generate-object', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: thread.modelThread.model,
          provider: thread.modelThread.provider,
          schema: thread.schemaThread.schema,
          system: processedSystemPrompt,
          prompt: promptString
        }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        const result: GenerateObjectResult = {
          success: false,
          error: data.error || 'Request failed',
          validationError: data.isValidationError ? data.error : undefined,
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

      const result: GenerateObjectResult = {
        success: data.success,
        object: data.object,
        error: data.error,
        validationError: data.isValidationError ? data.error : undefined,
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
      const key = getGenerateObjectThreadKey(thread, ns);
      const hasSnapNow = (typeof window !== 'undefined') ? !!localStorage.getItem(`snapshot:${ns || 'root'}:go-snap:${key}`) : false;
      if (hasSnapNow) {
        try {
          localStorage.setItem(`snapshot:${ns || 'root'}:go-snap:${key}`, JSON.stringify(buildSnapshotFromThread({ ...thread, result })));
        } catch {}
      }
    } catch (error) {
      console.error('Error running execution thread:', error);
      
      const result: GenerateObjectResult = {
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

  // Calculate total combinations (with null check)
  const totalCombinations = config?.executionThreads?.filter(t => t.visible).length || 0;

  // Define navigation sections
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
      key: 'schemas',
      label: 'Schemas',
      icon: Code,
      count: config?.schemaThreads?.length || 0,
      color: {
        text: 'text-green-600',
        glow: 'rgba(34,197,94,0.5)',
        hoverBg: 'hover:bg-green-100 dark:hover:bg-green-900/30',
      },
      ref: schemaSectionRef,
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
    <div className="mx-auto p-6 space-y-6 max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold">GenerateObject Playground</h1>
            <p className="text-sm text-gray-600">
              Structured JSON generation &quot; {totalCombinations} {totalCombinations === 1 ? 'combination' : 'combinations'}
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


      {/* Horizontal Navigation */}
      <div
        ref={horizontalNavRef}
        className="mx-auto w-fit transition-all duration-300"
      >
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-full shadow-lg backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
            <div className="px-6 py-2">
              <div className="flex items-center justify-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                <button
                  onClick={() => scrollToSection('models')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all cursor-pointer whitespace-nowrap ${getSectionHoverBg(
                    'models'
                  )}`}
                  title="Jump to Models section"
                >
                  <Brain className={`h-4 w-4 ${getSectionColor('models')}`} />
                  <span className="hidden sm:inline">Models ({config.modelThreads.length})</span>
                  <span className="sm:hidden">({config.modelThreads.length})</span>
                </button>
                <div className="text-gray-400">➜</div>
                <button
                  onClick={() => scrollToSection('schemas')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all cursor-pointer whitespace-nowrap ${getSectionHoverBg(
                    'schemas'
                  )}`}
                  title="Jump to Schemas section"
                >
                  <Code className={`h-4 w-4 ${getSectionColor('schemas')}`} />
                  <span className="hidden sm:inline">Schemas ({config.schemaThreads.length})</span>
                  <span className="sm:hidden">({config.schemaThreads.length})</span>
                </button>
                <div className="text-gray-400">➜</div>
                <button
                  onClick={() => scrollToSection('system')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all cursor-pointer whitespace-nowrap ${getSectionHoverBg(
                    'system'
                  )}`}
                  title="Jump to System Prompts section"
                >
                  <Cpu className={`h-4 w-4 ${getSectionColor('system')}`} />
                  <span className="hidden sm:inline">System ({config.systemPromptThreads.length})</span>
                  <span className="sm:hidden">({config.systemPromptThreads.length})</span>
                </button>
                <div className="text-gray-400">➜</div>
                <button
                  onClick={() => scrollToSection('prompts')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all cursor-pointer whitespace-nowrap ${getSectionHoverBg(
                    'prompts'
                  )}`}
                  title="Jump to Prompts section"
                >
                  <FileJson className={`h-4 w-4 ${getSectionColor('prompts')}`} />
                  <span className="hidden sm:inline">Prompts ({config.promptDataThreads.length})</span>
                  <span className="sm:hidden">({config.promptDataThreads.length})</span>
                </button>
                <div className="text-gray-400">➜</div>
                <button
                  onClick={() => scrollToSection('results')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all cursor-pointer whitespace-nowrap ${getSectionHoverBg(
                    'results'
                  )}`}
                  title="Jump to Results section"
                >
                  <LayoutGrid className={`h-4 w-4 ${getSectionColor('results')}`} />
                  <span className="hidden sm:inline">Output ({totalCombinations})</span>
                  <span className="sm:hidden">({totalCombinations})</span>
                </button>
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
      <div className="space-y-6">
        {/* Model Threads */}
        <div ref={modelSectionRef} data-section="models">
          <span className="scroll-sentinel-start" data-section="models" />
          <ModelThreadSection
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

        {/* Schema Threads */}
        <div ref={schemaSectionRef} data-section="schemas">
          <span className="scroll-sentinel-start" data-section="schemas" />
          <SchemaThreadSection
            threads={config.schemaThreads}
            onAddThread={handleAddSchemaThread}
            onUpdateThread={handleUpdateSchemaThread}
            onDeleteThread={handleDeleteSchemaThread}
            onDuplicateThread={handleDuplicateSchemaThread}
            copiedStates={copiedStates}
            onCopy={handleCopy}
          />
          <span className="scroll-sentinel-end" data-section="schemas" />
        </div>

        {/* System Prompt Threads */}
        <div ref={systemSectionRef} data-section="system">
          <span className="scroll-sentinel-start" data-section="system" />
          <SystemPromptThreadSection
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
          <PromptDataThreadSection
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
            <ResultsGrid
              executionThreads={config.executionThreads}
              onRunThread={handleRunExecutionThread}
              onCopy={handleCopy}
              copiedStates={copiedStates}
            />
          </CardContent>
        </Card>
        <span className="scroll-sentinel-end" data-section="results" />
      </div>
    </div>
  );
}