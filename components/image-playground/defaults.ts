import { generateId } from '@/components/prompt-playground/shared/utils';
import {
  AspectRatio,
  ImageGenerationConfig,
  ImagePromptThread,
  ImageProvider,
  ReveMode
} from './types';

const DEFAULT_REVE_MODE: ReveMode = 'create';
const DEFAULT_GOOGLE_PROMPT = 'A surreal cityscape at sunset, painted in vibrant neon colors';
const DEFAULT_REVE_PROMPT = 'A cinematic portrait of a cyberpunk explorer wearing luminous goggles';
const DEFAULT_REVE_VERSION = 'latest';
const DEFAULT_ASPECT_RATIO: AspectRatio = '1:1';

function createPromptThread(options: {
  name: string;
  provider: ImageProvider;
  prompt: string;
  mode?: ReveMode;
  referenceImages?: string[];
  aspectRatio?: AspectRatio;
  version?: string;
}): ImagePromptThread {
  return {
    id: generateId(),
    name: options.name,
    provider: options.provider,
    prompt: options.prompt,
    mode: options.mode,
    referenceImages: options.referenceImages,
    aspectRatio: options.aspectRatio,
    version: options.version,
    visible: true
  };
}

export function createDefaultConfig(): ImageGenerationConfig {
  const promptThreads: ImagePromptThread[] = [
    createPromptThread({ name: 'Gemini Prompt', provider: 'google', prompt: DEFAULT_GOOGLE_PROMPT }),
    createPromptThread({
      name: 'REVE Prompt',
      provider: 'reve',
      prompt: DEFAULT_REVE_PROMPT,
      mode: DEFAULT_REVE_MODE,
      aspectRatio: DEFAULT_ASPECT_RATIO,
      version: DEFAULT_REVE_VERSION
    })
  ];

  return {
    promptThreads,
    executionThreads: [],
    openSections: {
      prompts: true,
      results: true
    }
  };
}

export const DEFAULTS = {
  ASPECT_RATIO: DEFAULT_ASPECT_RATIO,
  REVE_VERSION: DEFAULT_REVE_VERSION,
  GOOGLE_PROMPT: DEFAULT_GOOGLE_PROMPT,
  REVE_PROMPT: DEFAULT_REVE_PROMPT,
  REVE_MODE: DEFAULT_REVE_MODE
};
