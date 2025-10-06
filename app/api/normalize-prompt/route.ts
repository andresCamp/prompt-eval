import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';

const NORMALIZE_PROMPT = `You are a prompt engineering expert. Your task is to improve and normalize system prompts for better clarity and effectiveness.

Rules:
1. Keep the core intent and instructions intact
2. Improve clarity and remove ambiguity
3. Use clear, direct language
4. Break down complex instructions into numbered or bulleted lists when appropriate
5. Remove redundancy while preserving important details
6. Ensure instructions are specific and actionable
7. Maintain professional tone
8. Output ONLY the improved prompt, no explanations or meta-commentary

Example input:
You are a helpful assistant that helps with data stuff. Make sure to transform the data correctly and put it in the right format. Be accurate.

Example output:
You are a data transformation assistant. Follow these guidelines:

1. Transform input data according to the specified schema
2. Ensure all required fields are populated with accurate values
3. Maintain data integrity and type correctness
4. Provide clear, structured output`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required', success: false },
        { status: 400 }
      );
    }

    // Use Gemini 2.0 Flash for normalization
    const model = google('gemini-2.0-flash');

    const { text } = await generateText({
      model,
      system: NORMALIZE_PROMPT,
      prompt: `Input prompt to improve:\n\n${prompt}\n\nRemember: Output ONLY the improved prompt, no explanations.`,
      temperature: 0.3, // Slightly higher than schema normalization for creativity
    });

    // Clean up the response
    let normalizedPrompt = text.trim();

    // Remove any meta-commentary that might have slipped through
    // Remove markdown formatting if present
    normalizedPrompt = normalizedPrompt.replace(/^```(?:text|markdown)?\n?/, '');
    normalizedPrompt = normalizedPrompt.replace(/\n?```$/, '');
    normalizedPrompt = normalizedPrompt.trim();

    return NextResponse.json({
      normalizedPrompt,
      success: true,
    });

  } catch (error) {
    console.error('Prompt normalization error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        error: errorMessage,
        success: false,
      },
      { status: 500 }
    );
  }
}
