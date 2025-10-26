import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';

const GENERATE_TITLE_PROMPT = `You are a title generation expert. Your task is to create concise, descriptive titles for thread content.

Rules:
1. Generate titles that are 2-5 words maximum
2. Capture the core purpose or intent of the content
3. Use clear, descriptive language
4. Be specific but concise
5. Output ONLY the title, no explanations or quotation marks
6. Do not include prefixes like "Title:" or similar
7. Use title case (capitalize first letter of each major word)

Examples:
Input: "You are a helpful assistant that answers questions about Python programming"
Output: Python Programming Assistant

Input: "Write a poem about the ocean"
Output: Ocean Poetry Request

Input: "Analyze this sales data and provide insights"
Output: Sales Data Analysis`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, contentType } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required', success: false },
        { status: 400 }
      );
    }

    // Use Gemini 2.0 Flash for title generation
    const model = google('gemini-2.0-flash');

    const contextHint = contentType ? `\n\nContent type: ${contentType}` : '';

    const { text } = await generateText({
      model,
      system: GENERATE_TITLE_PROMPT,
      prompt: `Generate a concise title for this content:${contextHint}\n\n${content}\n\nRemember: Output ONLY the title (2-5 words), no explanations or quotes.`,
      temperature: 0.3,
    });

    // Clean up the response
    let title = text.trim();

    // Remove any quotation marks that might have been added
    title = title.replace(/^["']|["']$/g, '');

    // Remove any prefixes like "Title:", "Name:", etc.
    title = title.replace(/^(Title|Name|Label):\s*/i, '');

    // Ensure it's not too long (max 50 characters as safety)
    if (title.length > 50) {
      title = title.substring(0, 50);
    }

    return NextResponse.json({
      title,
      success: true,
    });

  } catch (error) {
    console.error('Title generation error:', error);

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
