import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { xai } from '@ai-sdk/xai';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';

// Provider functions that return model instances
const providers = {
  openai,
  anthropic,
  google,
  groq,
  xai,
} as const;

type Provider = keyof typeof providers;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      model: modelName,
      provider,
      system,
      prompt,
      maxOutputTokens,
      temperature,
    } = body;

    // Validate required fields
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required', success: false },
        { status: 400 }
      );
    }

    if (!modelName || !provider) {
      return NextResponse.json(
        { error: 'Model and provider are required', success: false },
        { status: 400 }
      );
    }

    // Check if provider exists
    if (!(provider in providers)) {
      return NextResponse.json(
        { error: `Unsupported provider: ${provider}. Supported: ${Object.keys(providers).join(', ')}`, success: false },
        { status: 400 }
      );
    }

    // Get the provider function
    const providerFn = providers[provider as Provider];
    const model = providerFn(modelName);

    // Build the generateText parameters
    const generateParams: Parameters<typeof generateText>[0] = {
      model,
      prompt,
    };

    // Add optional system prompt
    if (system) {
      generateParams.system = system;
    }

    // Add optional parameters
    if (maxOutputTokens) {
      generateParams.maxOutputTokens = maxOutputTokens;
    }
    if (temperature !== undefined) {
      generateParams.temperature = temperature;
    }

    // Generate the text
    const startTime = Date.now();
    let result;
    
    try {
      result = await generateText(generateParams);
    } catch (error) {
      // Handle specific API errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('context_length_exceeded') || errorMessage.includes('reduce the length')) {
        return NextResponse.json({
          error: 'Input too long for this model. Try reducing the prompt length or using a different model.',
          errorType: 'context_length_exceeded',
          success: false,
          provider,
          model: modelName,
        }, { status: 400 });
      }
      
      // Re-throw for general error handling
      throw error;
    }

    const duration = (Date.now() - startTime) / 1000;

    // Check if text was generated
    if (!result.text) {
      return NextResponse.json({
        error: 'Failed to generate text',
        finishReason: result.finishReason,
        usage: result.usage,
        duration,
        success: false,
        provider,
        model: modelName,
      }, { status: 400 });
    }

    // Return successful result
    return NextResponse.json({
      text: result.text,
      finishReason: result.finishReason,
      usage: result.usage,
      duration,
      success: true,
      provider,
      model: modelName,
    });

  } catch (error) {
    console.error('GenerateText API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        success: false,
        errorType: 'internal_error'
      },
      { status: 500 }
    );
  }
}