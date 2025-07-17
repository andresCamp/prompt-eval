/**
 * @fileoverview Biographer Response Tester - A testing interface for evaluating AI biographer personas
 * 
 * This component provides a comprehensive testing environment for biographer AI personas,
 * allowing users to configure prompts, select AI models, and compare responses across
 * multiple biographer personalities simultaneously.
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Copy, Play, Loader2, ChevronDown, Clock, Hash, FileText, Check, Database, Settings, MessageSquare, User, ChevronsUpDown } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { biographers } from './bio';

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

const AVAILABLE_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'mistral', label: 'Mistral' },
];

const AVAILABLE_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
];

interface BiographerResponse {
  name: string;
  response: string;
  loading: boolean;
  error?: string;
  duration?: number; // in seconds
  tokenCount?: number;
  wordCount?: number;
}

// Provider Combobox Component
function ProviderCombobox({ value, onValueChange }: { value: string; onValueChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-32 justify-between"
        >
          {value
            ? AVAILABLE_PROVIDERS.find((provider) => provider.value === value)?.label
            : "Select provider..."}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-32 p-0">
        <Command>
          <CommandInput placeholder="Search provider..." className="h-9" />
          <CommandList>
            <CommandEmpty>No provider found.</CommandEmpty>
            <CommandGroup>
              {AVAILABLE_PROVIDERS.map((provider) => (
                <CommandItem
                  key={provider.value}
                  value={provider.value}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  {provider.label}
                  <Check
                    className={cn(
                      "ml-auto",
                      value === provider.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Model Combobox Component
function ModelCombobox({ value, onValueChange }: { value: string; onValueChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-48 justify-between"
        >
          {value
            ? AVAILABLE_MODELS.find((model) => model.value === value)?.label
            : "Select model..."}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0">
        <Command>
          <CommandInput placeholder="Search model..." className="h-9" />
          <CommandList>
            <CommandEmpty>No model found.</CommandEmpty>
            <CommandGroup>
              {AVAILABLE_MODELS.map((model) => (
                <CommandItem
                  key={model.value}
                  value={model.value}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  {model.label}
                  <Check
                    className={cn(
                      "ml-auto",
                      value === model.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Utility functions for metrics
const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

const estimateTokens = (text: string): number => {
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
};

export default function BiographerTestPage() {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [initialMessage, setInitialMessage] = useState(DEFAULT_INITIAL_MESSAGE);
  const [userMessage, setUserMessage] = useState(DEFAULT_USER_MESSAGE);
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [responses, setResponses] = useState<BiographerResponse[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  // State for accordion sections
  const [openSections, setOpenSections] = useState({
    data: false,
    systemPrompt: false,
    initialMessage: false,
    userMessage: false,
  });

  // State for copy feedback
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const copyToClipboard = async (text: string, buttonId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      
      // Show checkmark feedback
      setCopiedStates(prev => ({ ...prev, [buttonId]: true }));
      
      // Hide checkmark after 3 seconds
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [buttonId]: false }));
      }, 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyAllResponses = async () => {
    const allResponses = responses
      .map(r => `**${r.name}:** (${r.duration?.toFixed(1)}s, ${r.tokenCount} tokens, ${r.wordCount} words)\n${r.response}`)
      .join('\n\n---\n\n');
    await copyToClipboard(allResponses, 'copy-all');
  };

  // Template replacement function
  const replaceTemplate = (template: string, biographer: typeof biographers[0]): string => {
    try {
      // Create a function that returns the template with variables replaced
      const templateFunction = new Function(
        'name', 'mbti', 'enneagram', 'bigFive', 'coreValues', 'voice_characteristics', 
        'linguistic_patterns', 'example_utterances', 'sessionDuration', 'gapAnalysis', 
        'sessionContext', 'previous_mode', 'userPreferred',
        `return \`${template}\`;`
      );
      
      return templateFunction(
        biographer.name,
        biographer.mbti,
        biographer.enneagram,
        biographer.bigFive,
        biographer.coreValues.join(', '),
        biographer.voice_characteristics,
        biographer.linguistic_patterns,
        biographer.example_utterances.join(', '),
        '60', // sessionDuration
        'Story seeds from childhood, career transitions, relationships', // gapAnalysis
        'First session, getting to know the user', // sessionContext
        'EXPLORATION', // previous_mode
        'friend' // userPreferred
      );
    } catch (error) {
      console.error('Template replacement error:', error);
      return template; // Return original template if replacement fails
    }
  };

  const runTest = async () => {
    setIsRunning(true);
    
    // Initialize responses with loading state
    const initialResponses = biographers.map(bio => ({
      name: bio.name,
      response: '',
      loading: true
    }));
    setResponses(initialResponses);

    // Process each biographer
    const responsePromises = biographers.map(async (biographer, index) => {
      const startTime = Date.now();
      
      try {
        // Replace template variables for this specific biographer
        const personalizedSystemPrompt = replaceTemplate(systemPrompt, biographer);
        const personalizedInitialMessage = replaceTemplate(initialMessage, biographer);

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              { role: 'system', content: personalizedSystemPrompt },
              { role: 'assistant', content: personalizedInitialMessage },
              { role: 'user', content: userMessage }
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
        const duration = (endTime - startTime) / 1000; // Convert to seconds
        const wordCount = countWords(result);
        const tokenCount = estimateTokens(result);

        setResponses(prev => prev.map((r, i) => 
          i === index ? { 
            ...r, 
            response: result, 
            loading: false, 
            duration,
            wordCount,
            tokenCount
          } : r
        ));
        
        return { 
          name: biographer.name, 
          response: result, 
          loading: false, 
          duration,
          wordCount,
          tokenCount
        };
      } catch (error) {
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        setResponses(prev => prev.map((r, i) => 
          i === index ? { ...r, error: errorMessage, loading: false, duration } : r
        ));
        
        return { 
          name: biographer.name, 
          response: '', 
          loading: false, 
          error: errorMessage,
          duration
        };
      }
    });

    await Promise.all(responsePromises);
    setIsRunning(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Biographer Response Tester</h1>
        <div className="flex gap-2">
          <ProviderCombobox 
            value={selectedProvider} 
            onValueChange={setSelectedProvider}
          />
          <ModelCombobox 
            value={selectedModel} 
            onValueChange={setSelectedModel}
          />
          <Button
            onClick={() => copyToClipboard(
              `**Provider:** ${selectedProvider}\n**Model:** ${selectedModel}\n\n**System Prompt:**\n${systemPrompt}\n\n**Initial Message:**\n${initialMessage}\n\n**User Message:**\n${userMessage}`,
              'copy-test-config'
            )}
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
            onClick={runTest} 
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

      {/* Data Accordion */}
      <Card 
        className="cursor-pointer hover:bg-muted transition-colors"
        onClick={() => toggleSection('data')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-gray-400" />
            <CardTitle className="text-base">Data</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {JSON.stringify(biographers, null, 2).substring(0, 60)}...
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                <span>{estimateTokens(JSON.stringify(biographers, null, 2))}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span>{countWords(JSON.stringify(biographers, null, 2))}</span>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${openSections.data ? 'rotate-180' : ''}`} />
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(JSON.stringify(biographers, null, 2), 'data');
              }}
              className="h-8 w-8 p-0 cursor-pointer hover:bg-muted hover:scale-105 transition-all"
            >
              {copiedStates['data'] ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {openSections.data && (
          <CardContent>
            <Textarea
              value={JSON.stringify(biographers, null, 2)}
              onChange={(e) => {
                // Note: This is for display/editing only - not functional yet
                // In the future, this could parse and update the biographers array
              }}
              onClick={(e) => e.stopPropagation()}
              className="min-h-[400px] font-mono text-sm bg-background"
              placeholder="Biographer data will appear here..."
              readOnly
            />
            <div className="mt-2 text-xs text-gray-500">
              Raw biographer data from @bio.ts (read-only for now)
            </div>
          </CardContent>
        )}
      </Card>

      {/* System Prompt Accordion */}
      <Card 
        className="cursor-pointer hover:bg-muted transition-colors"
        onClick={() => toggleSection('systemPrompt')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-gray-400" />
            <CardTitle className="text-base">System Prompt</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {systemPrompt.substring(0, 60)}...
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                <span>{estimateTokens(systemPrompt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span>{countWords(systemPrompt)}</span>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${openSections.systemPrompt ? 'rotate-180' : ''}`} />
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(systemPrompt, 'system-prompt');
              }}
              className="h-8 w-8 p-0 cursor-pointer hover:bg-muted hover:scale-105 transition-all"
            >
              {copiedStates['system-prompt'] ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {openSections.systemPrompt && (
          <CardContent>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="min-h-[200px] font-mono text-sm bg-background"
              placeholder="Enter system prompt..."
            />

          </CardContent>
        )}
      </Card>

      {/* Initial Message Accordion */}
      <Card 
        className="cursor-pointer hover:bg-muted transition-colors"
        onClick={() => toggleSection('initialMessage')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-gray-400" />
            <CardTitle className="text-base">Initial Message</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {initialMessage.substring(0, 60)}...
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                <span>{estimateTokens(initialMessage)}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span>{countWords(initialMessage)}</span>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${openSections.initialMessage ? 'rotate-180' : ''}`} />
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(initialMessage, 'initial-message');
              }}
              className="h-8 w-8 p-0 cursor-pointer hover:bg-muted hover:scale-105 transition-all"
            >
              {copiedStates['initial-message'] ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {openSections.initialMessage && (
          <CardContent>
            <Textarea
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="min-h-[100px] bg-background"
              placeholder="Enter initial message..."
            />

          </CardContent>
        )}
      </Card>

      {/* User Message Accordion */}
      <Card 
        className="cursor-pointer hover:bg-muted transition-colors"
        onClick={() => toggleSection('userMessage')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <CardTitle className="text-base">User Message</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {userMessage.substring(0, 60)}...
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                <span>{estimateTokens(userMessage)}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span>{countWords(userMessage)}</span>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${openSections.userMessage ? 'rotate-180' : ''}`} />
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(userMessage, 'user-message');
              }}
              className="h-8 w-8 p-0 cursor-pointer hover:bg-muted hover:scale-105 transition-all"
            >
              {copiedStates['user-message'] ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {openSections.userMessage && (
          <CardContent>
            <Textarea
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="min-h-[120px] bg-background"
              placeholder="Enter user message..."
            />

          </CardContent>
        )}
      </Card>

      {/* Responses Horizontal Scroll */}
      {responses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Biographer Responses</h2>
            <Button 
              onClick={copyAllResponses}
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
                <Card key={response.name} className="w-96 flex-shrink-0">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg">{response.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(response.response, `response-${response.name}`)}
                      className="h-8 w-8 p-0 cursor-pointer hover:bg-muted hover:scale-105 transition-all disabled:hover:scale-100 disabled:hover:bg-transparent"
                      disabled={response.loading || !!response.error}
                    >
                      {copiedStates[`response-${response.name}`] ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Metrics */}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{response.duration?.toFixed(1) || '0.0'}s</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        <span>{response.tokenCount || 0} tokens</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span>{response.wordCount || 0} words</span>
                      </div>
                    </div>
                    
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
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}
    </div>
  );
}