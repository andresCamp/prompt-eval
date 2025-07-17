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
 * Biographer data structure for template replacement
 */
interface BiographerData {
  name: string;
  mbti: string;
  enneagram: string;
  bigFive: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  coreValues: string[];
  voice_characteristics: {
    vocabulary: string[];
    address_terms: string[];
    sentence_structure: string;
    rhythm: string;
  };
  linguistic_patterns: {
    question_formation: string;
    validation_sounds: string;
    transition_phrases: string;
    enthusiasm_markers: string;
  };
  example_utterances: string[];
}

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
 */
export function generateId(): string {
  return `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate all possible execution thread combinations from pipeline threads
 */
export function generateExecutionThreads(
  modelThreads: ModelThread[],
  dataThreads: DataThread[],
  systemPromptThreads: SystemPromptThread[],
  initialMessageThreads: InitialMessageThread[],
  userMessageThreads: UserMessageThread[]
): ExecutionThread[] {
  const executionThreads: ExecutionThread[] = [];
  
  // Generate all combinations using nested loops
  for (const modelThread of modelThreads) {
    for (const dataThread of dataThreads) {
      for (const systemPromptThread of systemPromptThreads) {
        for (const initialMessageThread of initialMessageThreads) {
          for (const userMessageThread of userMessageThreads) {
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
              copiedStates: {}
            });
          }
        }
      }
    }
  }
  
  return executionThreads;
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
        name: 'GPT-4o Mini',
        provider: 'openai',
        model: 'gpt-4o-mini'
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
        ], null, 2)
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
</primary_objective>`
      }
    ],
    initialMessageThreads: [
      {
        id: generateId(),
        name: 'Default Initial',
        message: `Hello \${userPreferred}, welcome to our first session together! My name is \${name}, your personal biographer.`
      }
    ],
    userMessageThreads: [
      {
        id: generateId(),
        name: 'Default User',
        message: `Let's see, I was born in Philadelphia in 1999. I have a couple memories from my childhood.`
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
    copiedStates: {}
  };
}

/**
 * Update execution threads when pipeline threads change
 */
export function updateExecutionThreads(config: PipelineConfig): PipelineConfig {
  const newExecutionThreads = generateExecutionThreads(
    config.modelThreads,
    config.dataThreads,
    config.systemPromptThreads,
    config.initialMessageThreads,
    config.userMessageThreads
  );
  
  return {
    ...config,
    executionThreads: newExecutionThreads
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