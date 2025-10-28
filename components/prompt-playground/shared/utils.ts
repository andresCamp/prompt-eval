/**
 * @fileoverview Utility functions for prompt playground components
 */

import type { 
  ModelThread, 
  DataThread, 
  SystemPromptThread, 
  InitialMessageThread, 
  UserMessageThread,
  ExecutionThread,
  PipelineConfig 
} from './types';

/**
 * Utility function to count words in text
 * @param text - Input text to count words from
 * @returns Number of words in the text
 */
export const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

/**
 * Utility function to estimate token count from text
 * @param text - Input text to estimate tokens from
 * @returns Estimated number of tokens (rough estimation: 1 token ≈ 4 characters)
 */
export const estimateTokens = (text: string): number => {
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
};

/**
 * Calculate cost based on model, prompt tokens, and completion tokens
 * Prices are based on current provider pricing (as of 2025)
 */
export const calculateCost = (
  model: string,
  promptTokens: number = 0,
  completionTokens: number = 0
): number => {
  // Pricing per 1M tokens (input/output) in USD
  const modelPricing: Record<string, { input: number; output: number }> = {
    // Anthropic models
    'claude-sonnet-4-20250514': { input: 15.0, output: 75.0 },
    'claude-3-7-sonnet-20250219': { input: 15.0, output: 75.0 },
    'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
    
    // Google models
    'gemini-2.5-flash': { input: 0.075, output: 0.3 },
    'gemini-2.5-flash-lite-preview-06-17': { input: 0.0375, output: 0.15 },
    
    // OpenAI models
    'gpt-4o': { input: 5.0, output: 15.0 },
    
    // Groq models (typically free or very low cost)
    'moonshotai/kimi-k2-instruct': { input: 0.1, output: 0.1 },
  };

  const pricing = modelPricing[model];
  if (!pricing) {
    // Default fallback pricing for unknown models
    return (promptTokens * 0.001 + completionTokens * 0.002) / 1000;
  }

  // Calculate cost: (tokens / 1,000,000) * price_per_1M_tokens
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  
  return inputCost + outputCost;
};

/**
 * Biographer data structure for template replacement
 */
// interface BiographerData {
//   name: string;
//   mbti: string;
//   enneagram: string;
//   bigFive: {
//     openness: number;
//     conscientiousness: number;
//     extraversion: number;
//     agreeableness: number;
//     neuroticism: number;
//   };
//   coreValues: string[];
//   voice_characteristics: {
//     vocabulary: string[];
//     address_terms: string[];
//     sentence_structure: string;
//     rhythm: string;
//   };
//   linguistic_patterns: {
//     question_formation: string;
//     validation_sounds: string;
//     transition_phrases: string;
//     enthusiasm_markers: string;
//   };
//   example_utterances: string[];
// }

/**
 * Replace template variables in a string with values from a biographer object
 */
export function replaceTemplate(template: string, biographer: Record<string, unknown>): string {
  return template.replace(/\$\{([^}]+)\}/g, (match, path) => {
    const value = path.split('.').reduce((obj: Record<string, unknown> | undefined, key: string) => obj?.[key] as Record<string, unknown>, biographer);
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Generate a unique ID for threads
 * Uses a counter to ensure uniqueness even when called rapidly
 */
let idCounter = 0;
export function generateId(): string {
  idCounter += 1;
  return `thread-${Date.now()}-${idCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate all possible execution thread combinations from pipeline threads
 * Now supports visibility filtering - only visible threads will be included in combinations
 */
export function generateExecutionThreads(
  modelThreads: ModelThread[],
  dataThreads: DataThread[],
  systemPromptThreads: SystemPromptThread[],
  initialMessageThreads: InitialMessageThread[],
  userMessageThreads: UserMessageThread[]
): ExecutionThread[] {
  const executionThreads: ExecutionThread[] = [];
  
  // Filter only visible threads for combination generation
  const visibleModelThreads = modelThreads.filter(t => t.visible);
  const visibleDataThreads = dataThreads.filter(t => t.visible);
  const visibleSystemPromptThreads = systemPromptThreads.filter(t => t.visible);
  const visibleInitialMessageThreads = initialMessageThreads.filter(t => t.visible);
  const visibleUserMessageThreads = userMessageThreads.filter(t => t.visible);
  
  // Generate all combinations using nested loops
  for (const modelThread of visibleModelThreads) {
    for (const dataThread of visibleDataThreads) {
      for (const systemPromptThread of visibleSystemPromptThreads) {
        for (const initialMessageThread of visibleInitialMessageThreads) {
          for (const userMessageThread of visibleUserMessageThreads) {
            const threadName = [
              modelThread.name,
              dataThread.name,
              systemPromptThread.name,
              initialMessageThread.name,
              userMessageThread.name
            ].join(' → ');
            
            executionThreads.push({
              id: generateId(),
              name: threadName,
              modelThread,
              dataThread,
              systemPromptThread,
              initialMessageThread,
              userMessageThread,
              responses: [],
              isRunning: false,
              copiedStates: {},
              visible: true // New execution threads are visible by default
            });
          }
        }
      }
    }
  }
  
  return executionThreads;
}

/**
 * Generate visible execution threads based on section visibility settings
 * This is used for the flexible combo system
 */
export function generateVisibleExecutionThreads(
  config: PipelineConfig
): ExecutionThread[] {
  // Use default values for hidden sections
  const modelThreads = config.visibility.models ? config.modelThreads.filter(t => t.visible) : [getDefaultModelThread()];
  const dataThreads = config.visibility.data ? config.dataThreads.filter(t => t.visible) : [getDefaultDataThread()];
  const systemPromptThreads = config.visibility.systemPrompts ? config.systemPromptThreads.filter(t => t.visible) : [getDefaultSystemPromptThread()];
  const initialMessageThreads = config.visibility.initialMessages ? config.initialMessageThreads.filter(t => t.visible) : [getDefaultInitialMessageThread()];
  const userMessageThreads = config.visibility.userMessages ? config.userMessageThreads.filter(t => t.visible) : [getDefaultUserMessageThread()];

  return generateExecutionThreads(
    modelThreads,
    dataThreads,
    systemPromptThreads,
    initialMessageThreads,
    userMessageThreads
  );
}

/**
 * Calculate total possible combinations based on visibility
 */
export function calculateCombinationCount(config: PipelineConfig): number {
  const visibleModelThreads = config.visibility.models ? config.modelThreads.filter(t => t.visible).length : 1;
  const visibleDataThreads = config.visibility.data ? config.dataThreads.filter(t => t.visible).length : 1;
  const visibleSystemPromptThreads = config.visibility.systemPrompts ? config.systemPromptThreads.filter(t => t.visible).length : 1;
  const visibleInitialMessageThreads = config.visibility.initialMessages ? config.initialMessageThreads.filter(t => t.visible).length : 1;
  const visibleUserMessageThreads = config.visibility.userMessages ? config.userMessageThreads.filter(t => t.visible).length : 1;

  return visibleModelThreads * visibleDataThreads * visibleSystemPromptThreads * visibleInitialMessageThreads * visibleUserMessageThreads;
}

/**
 * Split execution threads into batches for rate limiting
 */
export function createExecutionBatches(threads: ExecutionThread[], batchSize: number): ExecutionThread[][] {
  const batches: ExecutionThread[][] = [];
  for (let i = 0; i < threads.length; i += batchSize) {
    batches.push(threads.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Default thread factories for hidden sections
 */
function getDefaultModelThread(): ModelThread {
  return {
    id: 'default-model',
    name: 'Default GPT-4o',
    provider: 'openai',
    model: 'gpt-4o',
    visible: false
  };
}

function getDefaultDataThread(): DataThread {
  return {
    id: 'default-data',
    name: 'Default Data',
    data: JSON.stringify([{ name: "Default", mbti: "ENFJ", enneagram: "2w3" }], null, 2),
    visible: false
  };
}

function getDefaultSystemPromptThread(): SystemPromptThread {
  return {
    id: 'default-system',
    name: 'Default System',
    prompt: 'You are a helpful AI assistant.',
    visible: false
  };
}

function getDefaultInitialMessageThread(): InitialMessageThread {
  return {
    id: 'default-initial',
    name: 'Default Initial',
    message: 'Hello! How can I help you today?',
    visible: false
  };
}

function getDefaultUserMessageThread(): UserMessageThread {
  return {
    id: 'default-user',
    name: 'Default User',
    message: 'Hello, I would like to share some stories.',
    visible: false
  };
}

/**
 * Calculate grid columns class based on number of threads
 */
export function getGridCols(threadCount: number): string {
  switch (threadCount) {
    case 1: return 'grid-cols-1';
    case 2: return 'grid-cols-1 lg:grid-cols-2';
    case 3: return 'grid-cols-1 lg:grid-cols-3';
    case 4: return 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-4';
    default: return 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';
  }
}

/**
 * Create default pipeline configuration
 */
export function createDefaultPipelineConfig(): PipelineConfig {
  return {
    modelThreads: [
      {
        id: generateId(),
        name: 'GPT-4o',
        provider: 'openai',
        model: 'gpt-4o',
        visible: true
      }
    ],
    dataThreads: [
      {
        id: generateId(),
        name: 'Default Data',
        data: JSON.stringify([
          {
            name: "Maya",
            mbti: "ENFJ",
            enneagram: "2w3",
            // ... default biographer data
          }
        ], null, 2),
        visible: true
      }
    ],
    systemPromptThreads: [
      {
        id: generateId(),
        name: 'Default System',
        prompt: `<core_identity>
You are \${name}, a personal AI biographer created by MyStory. You guide users through sharing their life stories with warmth and genuine curiosity.

MBTI: \${mbti}
Enneagram: \${enneagram}
</core_identity>

<primary_objective>
Guide users to share stories from their life by adapting to their natural storytelling flow.
</primary_objective>`,
        visible: true
      }
    ],
    initialMessageThreads: [
      {
        id: generateId(),
        name: 'Default Initial',
        message: `Hello \${userPreferred}, welcome to our first session together! My name is \${name}, your personal biographer.`,
        visible: true
      }
    ],
    userMessageThreads: [
      {
        id: generateId(),
        name: 'Default User',
        message: `Let's see, I was born in Philadelphia in 1999. I have a couple memories from my childhood.`,
        visible: true
      }
    ],
    executionThreads: [],
    openSections: {
      models: false,
      data: false,
      systemPrompts: false,
      initialMessages: false,
      userMessages: false,
      results: false
    },
    visibility: {
      models: true,
      data: true,
      systemPrompts: true,
      initialMessages: true,
      userMessages: true
    },
    batchConfig: {
      maxConcurrent: 10,
      batchSize: 5
    },
    copiedStates: {},
    turns: []
  };
}

/**
 * Update execution threads when pipeline threads change
 */
export function updateExecutionThreads(config: PipelineConfig): PipelineConfig {
  // Base (turn 0)
  const newExecutionThreads = generateExecutionThreads(
    config.modelThreads,
    config.dataThreads,
    config.systemPromptThreads,
    config.initialMessageThreads,
    config.userMessageThreads
  );

  // Update additional turns if present
  let newTurns = config.turns;
  if (config.turns && Array.isArray(config.turns)) {
    newTurns = config.turns.map(turn => ({
      ...turn,
      executionThreads: generateExecutionThreads(
        config.modelThreads,
        config.dataThreads,
        config.systemPromptThreads,
        config.initialMessageThreads,
        turn.userMessageThreads
      )
    }));
  }
  
  return {
    ...config,
    executionThreads: newExecutionThreads,
    turns: newTurns
  };
}

/**
 * Formats all responses into a single copyable string
 * @param responses - Array of biographer responses
 * @returns Formatted string with all responses
 */
export const formatAllResponses = (responses: Array<{
  name: string;
  response: string;
  duration?: number;
  tokenCount?: number;
  wordCount?: number;
}>): string => {
  return responses
    .map(r => `**${r.name}:** (${r.duration?.toFixed(1)}s, ${r.tokenCount} tokens, ${r.wordCount} words)\n${r.response}`)
    .join('\n\n---\n\n');
};

/**
 * Formats test configuration into a copyable string
 * @param provider - Selected provider
 * @param model - Selected model
 * @param systemPrompt - System prompt content
 * @param initialMessage - Initial message content
 * @param userMessage - User message content
 * @returns Formatted configuration string
 */
export const formatTestConfig = (
  provider: string,
  model: string,
  systemPrompt: string,
  initialMessage: string,
  userMessage: string
): string => {
  return `**Provider:** ${provider}\n**Model:** ${model}\n\n**System Prompt:**\n${systemPrompt}\n\n**Initial Message:**\n${initialMessage}\n\n**User Message:**\n${userMessage}`;
};

/**
 * Detect variables in the format {variableName} or ${variableName} from a text string
 * @param text - The text to search for variables
 * @returns Array of unique variable names found
 */
export function detectVariables(text: string): string[] {
  // Pattern matches both {variable} and ${variable}
  const variablePattern = /\$?\{([^}]+)\}/g;
  const matches = text.matchAll(variablePattern);
  const variables = new Set<string>();

  for (const match of matches) {
    variables.add(match[1].trim());
  }

  return Array.from(variables);
}

/**
 * Replace variables in text with their corresponding values
 * Supports both {variable} and ${variable} syntax
 * @param text - The text containing {variable} or ${variable} placeholders
 * @param variables - Object mapping variable names to their values
 * @returns Text with variables replaced by their values
 */
export function replaceVariables(text: string, variables?: Record<string, string>): string {
  if (!variables) return text;

  // Replace both {variable} and ${variable} patterns
  return text.replace(/\$?\{([^}]+)\}/g, (match, varName) => {
    const trimmedName = varName.trim();
    return variables[trimmedName] ?? match;
  });
}

/**
 * Get default values for variables, preserving existing values
 * @param variableNames - Array of variable names detected in text
 * @param existingVariables - Existing variable values to preserve
 * @returns Record of variable names to values
 */
export function getVariableDefaults(
  variableNames: string[],
  existingVariables?: Record<string, string>
): Record<string, string> {
  const defaults: Record<string, string> = {};

  for (const name of variableNames) {
    // Preserve existing value if available, otherwise empty string
    defaults[name] = existingVariables?.[name] ?? '';
  }

  return defaults;
} 