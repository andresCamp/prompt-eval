import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { xai } from '@ai-sdk/xai';
import { generateObject } from 'ai';
import { z } from 'zod';
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
      schema: schemaString,
      system,
      prompt,
      output = 'object',
      enumValues,
      maxOutputTokens,
      temperature,
      mode,
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

    // Build the generateObject parameters based on output type
    const generateParams: Record<string, any> = {
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

    // Handle different output modes
    if (output === 'enum') {
      if (!enumValues || !Array.isArray(enumValues)) {
        return NextResponse.json(
          { error: 'Enum values are required for enum output', success: false },
          { status: 400 }
        );
      }
      generateParams.output = 'enum';
      generateParams.enum = enumValues;
    } else if (output === 'no-schema' || (!schemaString && output === 'object')) {
      // If no schema provided, default to no-schema mode
      generateParams.output = 'no-schema';
      // Force JSON mode for no-schema
      generateParams.mode = 'json';
    } else if (output === 'array') {
      generateParams.output = 'array';
      // Parse and compile schema for array items
      if (schemaString) {
        try {
          const schemaFunction = new Function('z', `return ${schemaString}`);
          const compiledSchema = schemaFunction(z);
          generateParams.schema = compiledSchema;
        } catch (error) {
          return NextResponse.json(
            { 
              error: 'Invalid schema for array items', 
              details: error instanceof Error ? error.message : 'Schema compilation failed',
              success: false
            },
            { status: 400 }
          );
        }
      }
    } else {
      // Default to object output with schema
      generateParams.output = 'object';
      // Parse and compile schema for object
      if (schemaString) {
        try {
          const schemaFunction = new Function('z', `return ${schemaString}`);
          const compiledSchema = schemaFunction(z);
          generateParams.schema = compiledSchema;
        } catch (error) {
          return NextResponse.json(
            { 
              error: 'Invalid schema', 
              details: error instanceof Error ? error.message : 'Schema compilation failed',
              success: false
            },
            { status: 400 }
          );
        }
      }
    }

    // Add mode if specified and not already set
    if (mode && !generateParams.mode) {
      generateParams.mode = mode;
    }

    // Generate the object
    const startTime = Date.now();
    let result;
    
    try {
      result = await generateObject(generateParams);
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
      
      if (errorMessage.includes('Type validation failed') || errorMessage.includes('response did not match schema')) {
        return NextResponse.json({
          error: 'Generated response did not match the expected schema. Try adjusting your prompt or schema.',
          errorType: 'schema_validation_failed',
          details: errorMessage,
          success: false,
          provider,
          model: modelName,
        }, { status: 400 });
      }

      // Re-throw for general error handling
      throw error;
    }

    const duration = (Date.now() - startTime) / 1000;

    // Check if object was generated
    if (result.object === undefined || result.object === null) {
      return NextResponse.json({
        error: 'Failed to generate object',
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
      object: result.object,
      finishReason: result.finishReason,
      usage: result.usage,
      duration,
      success: true,
      provider,
      model: modelName,
    });

  } catch (error) {
    console.error('GenerateObject API error:', error);
    
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