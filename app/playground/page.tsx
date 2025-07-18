/**
 * @fileoverview Pipeline Threading Playground
 * 
 * This page provides a comprehensive threading system for prompt engineering testing.
 * Each stage of the pipeline (Model → Data → System → Initial → User → Output) can
 * have multiple threads, and all combinations are executed as separate threads.
 * 
 * Architecture:
 * - Model threads: Different AI models/providers
 * - Data threads: Different biographer data sets
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
import { Loader2, Plus, Play, Copy, Trash2, GitBranch, Clock, FileText, Hash, Check, Brain, Database, Cpu, MessageSquare, User as UserIcon } from 'lucide-react';
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
import { biographers } from '../biographer/bio';
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
  generateExecutionThreads
} from '@/components/prompt-playground';

/**
 * Default templates for pipeline stages
 */
const DEFAULT_SYSTEM_PROMPT = `<core_identity>
You are \${name}, a personal AI biographer created by MyStory. You guide users through sharing their life stories with warmth and genuine curiosity.

MBTI: \${mbti}
Enneagram: \${enneagram}
Big Five:
- Openness: \${bigFive.openness}
- Conscientiousness: \${bigFive.conscientiousness}
- Extraversion: \${bigFive.extraversion}
- Agreeableness: \${bigFive.agreeableness}
- Neuroticism: \${bigFive.neuroticism}
Core Values: \${coreValues}
</core_identity>

<primary_objective>
Guide users to share stories from their life by adapting to their natural storytelling flow. Prioritize horizontal exploration within life periods, validate contributions authentically, and address gaps while maintaining user control.
</primary_objective>

<voice_style>
VOCABULARY: \${voice_characteristics.vocabulary}
ADDRESS TERMS: \${voice_characteristics.address_terms}
SENTENCE STRUCTURE: \${voice_characteristics.sentence_structure}
RHYTHM: \${voice_characteristics.rhythm}
QUESTION FORMATION: \${linguistic_patterns.question_formation}
VALIDATION SOUNDS: \${linguistic_patterns.validation_sounds}
TRANSITION PHRASES: \${linguistic_patterns.transition_phrases}
ENTHUSIASM MARKERS: \${linguistic_patterns.enthusiasm_markers}
EXAMPLE UTTERANCES: \${example_utterances}
</voice_style>

<context>
- Session duration: \${sessionDuration} minutes
- Gap analysis with story seeds: \${gapAnalysis} (story seeds are potential stories embedded as narrative gaps within life periods)
- Session context: \${sessionContext}
- Previous mode: \${previous_mode}
</context>

<mode_router>
Analyze user's message to select mode:
- Broad reflections/memory jogging/needs guidance/confusion: EXPLORATION
- Complete story (beginning/middle/end) or responds to story prompt: STORY  
- Product usage questions: QA
- Check-in triggers (40min/60min) or fatigue cues: WRAPUP
Default to previous mode unless clear shift indicated.
</mode_router>

<conversation_modes>
<exploration>
- Ask open-ended questions about current life period based on gap analysis
- Listen for story seeds; add via tool calls
- Offer 2-3 prioritized suggestions from gaps for user choice
- If complete story emerges, transition to STORY mode next turn
</exploration>

<story>
- Prompt specific stories from seeds or user cues
- Give space during storytelling (minimal encouragement only if long pauses)
- When story complete, use the 4 Magic Moves validation framework:

THE 4 MAGIC MOVES:
1. AFFECTIVE ECHO: Start with emotion-laden adjective mirroring user's feeling
2. SALIENT DETAIL CALL-OUT: Reflect ONE meaningful specific (not trivia)
3. VALUE FRAME: Add why that detail matters (resilience, joy, ingenuity)
4. THREADED FOLLOW-UP: Ask ONE question flowing naturally from the echoed detail

VALIDATION LENGTH RULES:
- User shares ≤25 words: Skip value frame, minimal echo (≤5 words), quick question
- User shares 25-100 words: All 4 moves, total response 25-40 words
- User shares 100-300 words: All 4 moves, total response 40-60 words
- User shares 300+ words: All 4 moves, total response 60-80 words

CRITICAL: Response should NEVER exceed half the length of user's sharing

- After validation, move horizontally to next story in same period
- Use shift_life_period tool if coverage thresholds met
</story>

<qa>
- Answer product questions briefly in character
- Redirect to biographical modes after resolution
</qa>

<wrapup>
- 40min: Gentle check-in about continuing vs break
- 60min: Suggest wrapping up (still user's choice)
- User end button: Generate final summary message before closure
- Summarize progress and confirm user decision
- AI proposes but only user decides continuation/ending
</wrapup>
</conversation_modes>

<tool_calls>
Use for state updates: add_story_seed, shift_life_period, update_session_context
</tool_calls>

<prohibited_behaviors>
- NEVER ask emotional analysis questions ("How did that make you feel?")
- NEVER interrupt stories in progress
- NEVER probe beyond one contextual question
- NEVER use line breaks or dashes
- NEVER give validation longer than half user's message
- NEVER stack multiple questions
- NEVER use generic adjectives (interesting, awesome, great)
- NEVER force continuation - respect user reluctance
</prohibited_behaviors>`;

const DEFAULT_INITIAL_MESSAGE = `Hello \${userPreferred}, welcome to our first session together! My name is \${name}, your personal biographer. The way MyStory works is simple. You tell me stories from your life while I guide the conversation. All of our sessions are recorded, and after we finish I organize everything you've shared. You can always start a new session when you want to add more, so there's no pressure to tell me everything today. What matters is that the people who love you want to hear your stories in your voice. It's my privilege to help you preserve them. Let's start with whatever feels natural to you. Could be your childhood, could be yesterday. What part of your life do you want to talk about?`;

const DEFAULT_USER_MESSAGE = `Let's see, I was born in Philadelphia in 1999. I have a couple memories from my childhood. I can start with one. I remember... I went to pre-kindergarten or something like that. I was around... 3 years old? 2 or 3 years old? And my sisters were born. I have twin sisters. I remember their little babies. I remember I was off of school and I was sitting in a park bench in Washington Square Park, I believe. Which is right by our house, Pine Street. And I remember my classmates were in the park too. And I was sitting on the bench with my mom. And I grabbed my two little sisters so I could be cool. And my two little sisters were wrapped in a little bundle. A little blanket. They were tiny. And now they're grown women. But I remember that. And I just remember holding them. When they couldn't talk.`;

export default function PipelineThreadingPlaygroundPage() {
  const [config, setConfig] = useState<PipelineConfig>(() => {
    const defaultConfig = createDefaultPipelineConfig();
    // Override with our custom defaults
    return {
      ...defaultConfig,
      dataThreads: [
        {
          id: generateId(),
          name: 'All Biographers',
          data: JSON.stringify(biographers, null, 2)
        }
      ],
      systemPromptThreads: [
        {
          id: generateId(),
          name: 'Default System',
          prompt: DEFAULT_SYSTEM_PROMPT
        }
      ],
      initialMessageThreads: [
        {
          id: generateId(),
          name: 'Default Initial',
          message: DEFAULT_INITIAL_MESSAGE
        }
      ],
      userMessageThreads: [
        {
          id: generateId(),
          name: 'Default User',
          message: DEFAULT_USER_MESSAGE
        }
      ]
    };
  });

  // State for collapsible sections
  const [openSections, setOpenSections] = useState({
    models: true,
    data: true,
    systemPrompts: true,
    initialMessages: true,
    userMessages: true,
    results: true,
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

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleUpdateConfig = (updates: Partial<PipelineConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleToggleSection = (section: keyof typeof config.openSections) => {
    handleUpdateConfig({
      openSections: {
        ...config.openSections,
        [section]: !config.openSections[section]
      }
    });
  };

  const handleCopy = (text: string, buttonId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      handleUpdateConfig({
        copiedStates: { ...config.copiedStates, [buttonId]: true }
      });
      
      setTimeout(() => {
        handleUpdateConfig({
          copiedStates: { ...config.copiedStates, [buttonId]: false }
        });
      }, 3000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  // Model thread handlers
  const handleAddModelThread = () => {
    const newThread: ModelThread = {
      id: generateId(),
      name: `Model ${config.modelThreads.length + 1}`,
      provider: 'openai',
      model: 'gpt-4o'
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
      data: JSON.stringify(biographers, null, 2)
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
      prompt: DEFAULT_SYSTEM_PROMPT
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
      message: DEFAULT_INITIAL_MESSAGE
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
      message: DEFAULT_USER_MESSAGE
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
      // Parse biographer data
      const biographerData = JSON.parse(thread.dataThread.data);
      
      // Initialize responses
      const initialResponses: BiographerResponse[] = biographerData.map((bio: Record<string, unknown>) => ({
        name: String(bio.name),
        response: '',
        loading: true
      }));
      
      // Set thread to running state with initial responses
      handleUpdateExecutionThread(threadId, { 
        isRunning: true,
        responses: initialResponses
      });

      // Process each biographer
      const responsePromises = biographerData.map(async (biographer: Record<string, unknown>, index: number) => {
        const startTime = Date.now();
        
        try {
          // Replace template variables
          const personalizedSystemPrompt = replaceTemplate(thread.systemPromptThread.prompt, biographer);
          const personalizedInitialMessage = replaceTemplate(thread.initialMessageThread.message, biographer);
          const personalizedUserMessage = replaceTemplate(thread.userMessageThread.message, biographer);

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
    const promises = config.executionThreads.map(thread => handleRunExecutionThread(thread.id));
    await Promise.all(promises);
  };

  // Calculate total combinations
  const totalCombinations = config.modelThreads.length * 
    config.dataThreads.length * 
    config.systemPromptThreads.length * 
    config.initialMessageThreads.length * 
    config.userMessageThreads.length;
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
  const uniqueBiographers: string[] = Array.from(allBioNames).sort();

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
    const headers = ['Biographer', ...config.executionThreads.map((t: ExecutionThread) => t.name)];
    const rows = uniqueBiographers.map((bio: string) => {
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
            {config.copiedStates && config.copiedStates[`cell-${thread.id}-${bioName}`] ? (
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

  // Add Turn Handling
  const handleAddTurn = () => {
    const newTurnId = generateId();
    const newUserThread: UserMessageThread = {
      id: generateId(),
      name: `User ${config.turns?.length ? config.turns.length + 2 : 2}` ,
      message: ''
    };
    const newTurnExec = generateExecutionThreads(
      config.modelThreads,
      config.dataThreads,
      config.systemPromptThreads,
      config.initialMessageThreads,
      [newUserThread]
    );
    const newTurn = {
      id: newTurnId,
      name: `Turn ${config.turns?.length ? config.turns.length + 2 : 2}`,
      userMessageThreads: [newUserThread],
      executionThreads: newTurnExec
    };
    setConfig(prev => ({
      ...prev,
      turns: [...(prev.turns || []), newTurn]
    }));
  };

  // Turn-specific handlers
  const handleUpdateTurn = (turnId: string, updates: Partial<ConversationTurn>) => {
    setConfig(prev => ({
      ...prev,
      turns: (prev.turns || []).map(t => t.id === turnId ? { ...t, ...updates } : t)
    }));
  };

  const handleAddUserMessageThreadTurn = (turnId: string) => {
    const newThread: UserMessageThread = {
      id: generateId(),
      name: `User ${(config.turns?.find(t=>t.id===turnId)?.userMessageThreads.length || 0) + 1}`,
      message: ''
    };
    setConfig(prev => ({
      ...prev,
      turns: (prev.turns || []).map(t => {
        if (t.id !== turnId) return t;
        const newExec = generateExecutionThreads(
          prev.modelThreads,
          prev.dataThreads,
          prev.systemPromptThreads,
          prev.initialMessageThreads,
          [...t.userMessageThreads, newThread]
        );
        return { ...t, userMessageThreads: [...t.userMessageThreads, newThread], executionThreads: newExec };
      })
    }));
  };

  const handleUpdateUserMessageThreadTurn = (turnId: string, threadId: string, updates: Partial<UserMessageThread>) => {
    setConfig(prev => ({
      ...prev,
      turns: (prev.turns || []).map(t => {
        if (t.id !== turnId) return t;
        const updatedUserThreads = t.userMessageThreads.map(ut => ut.id === threadId ? { ...ut, ...updates } : ut);
        const newExec = generateExecutionThreads(prev.modelThreads, prev.dataThreads, prev.systemPromptThreads, prev.initialMessageThreads, updatedUserThreads);
        return { ...t, userMessageThreads: updatedUserThreads, executionThreads: newExec };
      })
    }));
  };

  const handleDeleteUserMessageThreadTurn = (turnId: string, threadId: string) => {
    setConfig(prev => ({
      ...prev,
      turns: (prev.turns || []).map(t => {
        if (t.id !== turnId) return t;
        if (t.userMessageThreads.length <= 1) return t;
        const remaining = t.userMessageThreads.filter(ut => ut.id !== threadId);
        const newExec = generateExecutionThreads(prev.modelThreads, prev.dataThreads, prev.systemPromptThreads, prev.initialMessageThreads, remaining);
        return { ...t, userMessageThreads: remaining, executionThreads: newExec };
      })
    }));
  };

  // (Removed infinite-looping effect; handlers already call updateExecutionThreads when modifying turns)

  // Helper to build messages for a single execution thread
  const buildMessagesForThread = (
    thread: ExecutionThread,
    biographer: Record<string, unknown>,
    turnIdx: number
  ) => {
    const systemPrompt = replaceTemplate(thread.systemPromptThread.prompt, biographer);
    const initialMessage = replaceTemplate(thread.initialMessageThread.message, biographer);
    const userMessage = replaceTemplate(thread.userMessageThread.message, biographer);

    const bioName = String(biographer.name);
    const history = getHistoryForBiographer(bioName, turnIdx);

    return [
      { role: 'system', content: systemPrompt },
      { role: 'assistant', content: initialMessage },
      ...history,
      { role: 'user', content: userMessage }
    ];
  };

  // Helper: gather history messages for a given biographer up to current turn
  const getHistoryForBiographer = (
    bioName: string,
    currentTurnIdx: number
  ): { role: 'user' | 'assistant'; content: string }[] => {
    const history: { role: 'user' | 'assistant'; content: string }[] = [];
    // Include baseline conversation (initial user + assistant response from main execution threads)
    const baselineUser = config.userMessageThreads?.[0]?.message;
    if (baselineUser) history.push({ role: 'user', content: baselineUser });
    const baselineAssistantResp = config.executionThreads
      .flatMap(et => et.responses)
      .find(r => r.name === bioName)?.response;
    if (baselineAssistantResp) history.push({ role: 'assistant', content: baselineAssistantResp });

    if (!config.turns) return history;
    for (let i = 0; i < currentTurnIdx; i++) {
      const t = config.turns[i];
      const userMsg = t.userMessageThreads[0]?.message;
      if (userMsg) history.push({ role: 'user', content: userMsg });
      let prevResp: string | undefined;
      for (const e of t.executionThreads) {
        const resp = e.responses?.find(r => r.name === bioName)?.response;
        if (resp) { prevResp = resp; break; }
      }
      if (prevResp) history.push({ role: 'assistant', content: prevResp });
    }
    return history;
  };

  // Turn Execution Handlers
  const handleUpdateExecutionThreadTurn = (turnId: string, execId: string, updates: Partial<ExecutionThread>) => {
    setConfig(prev => ({
      ...prev,
      turns: (prev.turns || []).map(t => t.id === turnId ? {
        ...t,
        executionThreads: t.executionThreads.map(et => et.id === execId ? { ...et, ...updates } : et)
      } : t)
    }));
  };

  const handleRunExecutionThreadTurn = async (turnId: string, execId: string) => {
    const turnIndex = config.turns?.findIndex(t => t.id === turnId) ?? -1;
    const turn = config.turns?.[turnIndex];
    if (!turn) return;
    const thread = turn.executionThreads.find(et => et.id === execId);
    if (!thread) return;

    // parse data
    let biographerData: Array<Record<string, unknown>> = [];
    try {
      biographerData = JSON.parse(thread.dataThread.data);
    } catch {
      return;
    }

    const initialResponses: BiographerResponse[] = biographerData.map(b => ({ name: String(b.name), response: '', loading: true }));

    handleUpdateExecutionThreadTurn(turnId, execId, { isRunning: true, responses: initialResponses });

    const responsePromises = biographerData.map(async (bio, idx) => {
      const startTime = Date.now();
      try {
        const messages = buildMessagesForThread(thread, bio, turnIndex);
        // NOTE: prior-turn context not yet included
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: thread.modelThread.model, messages })
        });
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
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
        const wordCount = result.trim().split(/\s+/).filter(Boolean).length;
        const tokenCount = Math.ceil(result.length / 4);
        setConfig(prev => ({
          ...prev,
          turns: (prev.turns || []).map(t => t.id === turnId ? {
            ...t,
            executionThreads: t.executionThreads.map(et => et.id === execId ? {
              ...et,
              responses: et.responses.map((r, i) => i === idx ? { ...r, response: result, loading: false, duration, wordCount, tokenCount } : r)
            } : et)
          } : t)
        }));
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : 'Unknown error';
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        setConfig(prev => ({
          ...prev,
          turns: (prev.turns || []).map(t => t.id === turnId ? {
            ...t,
            executionThreads: t.executionThreads.map(et => et.id === execId ? {
              ...et,
              responses: et.responses.map((r, i) => i === idx ? { ...r, error: errMsg, loading: false, duration } : r)
            } : et)
          } : t)
        }));
      }
    });

    await Promise.all(responsePromises);
    handleUpdateExecutionThreadTurn(turnId, execId, { isRunning: false });
  };

  const handleRunAllExecutionThreadsTurn = async (turnId: string) => {
    const turn = config.turns?.find(t => t.id === turnId);
    if (!turn) return;
    await Promise.all(turn.executionThreads.map(et => handleRunExecutionThreadTurn(turnId, et.id)));
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
              Thread at any stage • {totalCombinations} total {totalCombinations === 1 ? 'combination' : 'combinations'}
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
                    copied={!!(config.copiedStates && config.copiedStates[`model-${thread.id}`])}
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
                          copied={!!(config.copiedStates && config.copiedStates[`model-${thread.id}`])}
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
                    copied={!!(config.copiedStates && config.copiedStates[`data-${thread.id}`])}
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
                          copied={!!(config.copiedStates && config.copiedStates[`data-${thread.id}`])}
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
                    copied={!!(config.copiedStates && config.copiedStates[`system-${thread.id}`])}
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
                          copied={!!(config.copiedStates && config.copiedStates[`system-${thread.id}`])}
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
                    copied={!!(config.copiedStates && config.copiedStates[`initial-${thread.id}`])}
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
                          copied={!!(config.copiedStates && config.copiedStates[`initial-${thread.id}`])}
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
                    copied={!!(config.copiedStates && config.copiedStates[`user-${thread.id}`])}
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
                          copied={!!(config.copiedStates && config.copiedStates[`user-${thread.id}`])}
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
            {/* <ChevronDown className={`h-4 w-4 transition-transform ${openSections.results ? 'rotate-180' : ''}`} /> */}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleRunAllExecutionThreads();
              }}
              disabled={anyThreadRunning || totalCombinations === 0}
              variant="default"
            >
              {config.executionThreads.some(t => t.isRunning) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run All
                </>
              )}
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                copyAll();
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              {config.copiedStates && config.copiedStates['copy-all'] ? (
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
                            {config.copiedStates && config.copiedStates[`thread-${thread.id}`] ? (
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
                {uniqueBiographers.map((bioName) => (
                  <tr key={bioName}>
                    <td className="sticky left-0 bg-white whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-900" style={{width: BIO_COL_WIDTH, minWidth: BIO_COL_WIDTH}}>{bioName}</td>
                    {config.executionThreads.map((thread) => (
                      <td
                        key={thread.id}
                        style={{
                          width: THREAD_COL_WIDTH,
                          minWidth: THREAD_COL_WIDTH,
                        }}
                        className="whitespace-normal px-4 py-2 text-sm text-gray-500 align-top border-l border-gray-200"
                      >
                        {getCellContent(thread, bioName)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
      </div>

      {/* Add Turn (first) */}
      {!config.turns?.length && (
        <div className="flex justify-center mt-4">
          <Button onClick={handleAddTurn} variant="secondary" className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Turn
          </Button>
        </div>
      )}

      {config.turns && config.turns.map((turn, turnIndex) => (
        <div key={turn.id} className="mt-10 space-y-6">
          <h2 className="text-xl font-bold">{turn.name}</h2>
          {/* User Message Threads for this turn */}
          <div className="space-y-3">
            <div className="grid gap-4 items-start" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
              {turn.userMessageThreads.length < 3 ? (
                <div className={`grid gap-4 ${turn.userMessageThreads.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {turn.userMessageThreads.map(tm => (
                    <CollapsibleCard
                      key={tm.id}
                      id={tm.id}
                      name={tm.name}
                      onNameChange={(name) => handleUpdateUserMessageThreadTurn(turn.id, tm.id, { name })}
                      onDuplicate={() => handleAddUserMessageThreadTurn(turn.id)}
                      onDelete={() => handleDeleteUserMessageThreadTurn(turn.id, tm.id)}
                      canDelete={turn.userMessageThreads.length > 1}
                      borderColor="border-red-200"
                      subtitle={`Message: ${tm.name}`}
                      icon={<UserIcon className="h-4 w-4 text-red-600" />}
                      onCopy={() => copyUserMessageThread(tm)}
                      copied={!!(config.copiedStates && config.copiedStates[`user-${tm.id}`])}
                    >
                      {renderUserMessageThread(tm, (updates) => handleUpdateUserMessageThreadTurn(turn.id, tm.id, updates))}
                    </CollapsibleCard>
                  ))}
                </div>
              ) : (
                <div className="max-w-full overflow-x-auto">
                  <ScrollArea className="w-full">
                    <div className="flex gap-4 pb-4">
                      {turn.userMessageThreads.map(tm => (
                        <div key={tm.id} className="w-[450px] shrink-0">
                          <CollapsibleCard
                            id={tm.id}
                            name={tm.name}
                            onNameChange={(name) => handleUpdateUserMessageThreadTurn(turn.id, tm.id, { name })}
                            onDuplicate={() => handleAddUserMessageThreadTurn(turn.id)}
                            onDelete={() => handleDeleteUserMessageThreadTurn(turn.id, tm.id)}
                            canDelete={turn.userMessageThreads.length > 1}
                            borderColor="border-red-200"
                            subtitle={`Message: ${tm.name}`}
                            icon={<UserIcon className="h-4 w-4 text-red-600" />}
                            onCopy={() => copyUserMessageThread(tm)}
                            copied={!!(config.copiedStates && config.copiedStates[`user-${tm.id}`])}
                          >
                            {renderUserMessageThread(tm, (updates) => handleUpdateUserMessageThreadTurn(turn.id, tm.id, updates))}
                          </CollapsibleCard>
                        </div>
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>

          {/* Results Grid for this turn */}
          {(() => {
            const turnBiographerSet = new Set<string>();
            turn.executionThreads.forEach(et => {
              let bios: Array<Record<string, unknown>>;
              try { bios = JSON.parse(et.dataThread.data); } catch { bios = []; }
              bios.forEach(b => turnBiographerSet.add(String(b.name)));
            });
            const biosArray = Array.from(turnBiographerSet).sort();
            const turnCombinations = turn.executionThreads.length;
            const turnAnyRunning = turn.executionThreads.some(et => et.isRunning);
            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between hover:bg-muted transition-colors rounded p-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <h3 className="text-lg font-semibold">{turn.name} Results ({turnCombinations})</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => handleRunAllExecutionThreadsTurn(turn.id)} disabled={turnAnyRunning || turnCombinations===0} variant="default" className="flex items-center gap-2">
                      {turnAnyRunning ? (<><Loader2 className="h-4 w-4 animate-spin" /> Running...</>) : (<><Play className="h-4 w-4"/> Run All</>)}
                    </Button>
                  </div>
                </div>
                <ScrollArea className="w-full border rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="sticky left-0 bg-gray-50 px-4 py-2 text-left text-sm font-medium text-gray-900" style={{width: BIO_COL_WIDTH, minWidth: BIO_COL_WIDTH}}>Biographer</th>
                        {turn.executionThreads.map(et => (
                          <th key={et.id} style={{width: THREAD_COL_WIDTH, minWidth: THREAD_COL_WIDTH}} className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-l border-gray-200">
                            <div className="flex items-center justify-between">
                              <span className="truncate max-w-[200px]">{et.name}</span>
                              <div className="flex items-center gap-1">
                                <Button size="icon" variant="ghost" onClick={() => handleRunExecutionThreadTurn(turn.id, et.id)} disabled={et.isRunning}>{et.isRunning ? <Loader2 className="h-4 w-4 animate-spin"/>:<Play className="h-4 w-4"/>}</Button>
                                <Button size="icon" variant="ghost" className="hover:bg-muted" onClick={() => copyThread(et)}>{config.copiedStates && config.copiedStates[`thread-${et.id}`]?<Check className="h-4 w-4 text-green-600"/>:<Copy className="h-4 w-4"/>}</Button>
                              </div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {biosArray.map(bioName => (
                        <tr key={bioName}>
                          <td className="sticky left-0 bg-white whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-900" style={{width: BIO_COL_WIDTH, minWidth: BIO_COL_WIDTH}}>{bioName}</td>
                          {turn.executionThreads.map(et => (
                            <td key={et.id} style={{width: THREAD_COL_WIDTH, minWidth: THREAD_COL_WIDTH}} className="whitespace-normal px-4 py-2 text-sm text-gray-500 align-top border-l border-gray-200">
                              {getCellContent(et, bioName)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            );
          })()}

          {/* Add Turn Button */}
          <div className="flex justify-center">
            <Button onClick={handleAddTurn} variant="secondary" className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Turn
            </Button>
          </div>

          {/* End of turn section */}
        </div>
      ))}
    </div>
  );
}