import { openai } from '@ai-sdk/openai';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { anthropic } from '@ai-sdk/anthropic';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports, @typescript-eslint/ban-ts-comment
// @ts-ignore types may be missing for Google provider
import { createGoogleGenerativeAI } from '@ai-sdk/google';

// Create Google provider instance with explicit API key from GEMINI_API_KEY
const google = createGoogleGenerativeAI({
  // Expect variable to be defined in the environment
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  apiKey: process.env.GEMINI_API_KEY!,
});
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';

// Map model slug -> provider key
const MODEL_PROVIDER_MAP: Record<string, string> = {
  // Anthropic
  'claude-sonnet-4-20250514': 'anthropic',
  'claude-3-7-sonnet-20250219': 'anthropic',
  'claude-3-5-sonnet-20241022': 'anthropic',
  // Google
  'gemini-2.5-flash': 'google',
  'gemini-2.5-flash-lite-preview-06-17': 'google',
  // OpenAI
  'gpt-4o': 'openai',
  // Groq
  'moonshotai/kimi-k2-instruct': 'groq',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PROVIDER_FACTORY: Record<string, (model: string) => any> = {
  openai,
  anthropic,
  google,
  groq,
};

export async function POST(req: Request) {
  try {
    const { messages, model = 'gpt-4o' } = await req.json();

    // Determine provider automatically from model slug
    const providerKey = MODEL_PROVIDER_MAP[model] || 'openai';
    const providerFactory = PROVIDER_FACTORY[providerKey];
    if (!providerFactory) {
      return new Response(
        JSON.stringify({ error: `Unsupported provider: ${providerKey}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { text, usage } = await generateText({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: providerFactory(model) as any,
      messages,
      temperature: 0.7,
    });

    // Return both text and usage data
    return new Response(JSON.stringify({
      text,
      usage
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
} 