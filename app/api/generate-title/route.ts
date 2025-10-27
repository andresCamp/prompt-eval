import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';

const GENERATE_SINGLE_TITLE_PROMPT = `You are a title generation expert. Your task is to create concise, descriptive titles that highlight what makes each thread unique.

Rules:
1. Generate titles that are 2-5 words maximum
2. Focus on what makes THIS content unique and different from similar threads
3. When other thread titles are provided, ensure your title is distinctive and doesn't overlap
4. Highlight the key differentiator or variation being tested
5. Use clear, descriptive language that captures the nuance
6. Output ONLY the title, no explanations or quotation marks
7. Do not include prefixes like "Title:" or similar
8. Use title case (capitalize first letter of each major word)

Examples with context:
Existing titles: ["Concise Assistant", "Creative Assistant"]
Input: "You are a helpful assistant that answers questions with detailed explanations"
Output: Detailed Assistant

Existing titles: ["Formal Tone"]
Input: "You are a friendly assistant that uses casual language"
Output: Casual Tone

Existing titles: []
Input: "Analyze this sales data and provide insights"
Output: Sales Data Analysis`;

const GENERATE_BATCH_TITLES_PROMPT = `You are a title generation expert. Your task is to analyze multiple thread contents together and generate distinctive titles for each.

Rules:
1. Each title should be 2-5 words maximum
2. Analyze ALL threads together to identify key differences between them
3. Generate titles that highlight what makes each thread unique relative to the others
4. Focus on the variations being tested (tone, style, approach, parameters, etc.)
5. Ensure no two titles are similar or redundant
6. Use clear, descriptive language
7. Output ONLY the titles as a JSON array, no explanations
8. Use title case (capitalize first letter of each major word)

Example:
Input threads:
1. "You are a helpful assistant. Be concise and brief."
2. "You are a helpful assistant. Provide detailed explanations."
3. "You are a helpful assistant. Be creative and engaging."

Output: ["Concise Responses", "Detailed Explanations", "Creative Engagement"]

Another example:
Input threads:
1. "gpt-4o OpenAI"
2. "claude-sonnet-4 Anthropic"
3. "gemini-2.5-flash Google"

Output: ["GPT-4o", "Claude Sonnet 4", "Gemini Flash"]`;

interface ThreadContent {
  content: string;
  contentType?: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, contentType, siblingTitles, allThreads } = body;

    // Use Gemini 2.0 Flash for title generation
    const model = google('gemini-2.0-flash');

    // Batch mode: generate titles for multiple threads at once
    if (allThreads && Array.isArray(allThreads)) {
      if (allThreads.length === 0) {
        return NextResponse.json(
          { error: 'allThreads array is empty', success: false },
          { status: 400 }
        );
      }

      // Build the prompt with all thread contents
      const threadsText = allThreads
        .map((thread: ThreadContent, index: number) => {
          const typeHint = thread.contentType ? ` (${thread.contentType})` : '';
          return `Thread ${index + 1}${typeHint}:\n${thread.content}`;
        })
        .join('\n\n---\n\n');

      const { text } = await generateText({
        model,
        system: GENERATE_BATCH_TITLES_PROMPT,
        prompt: `Analyze these ${allThreads.length} threads and generate a distinctive title for each:\n\n${threadsText}\n\nRemember: Output ONLY a JSON array of ${allThreads.length} titles, no explanations.`,
        temperature: 0.3,
      });

      // Parse the JSON array response
      let titles: string[];
      try {
        // Try to extract JSON array from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          titles = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: split by newlines and clean up
          titles = text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('[') && !line.startsWith(']'))
            .map(line => line.replace(/^["']|["']$/g, '').replace(/^(Title|Name|Label):\s*/i, '').replace(/^\d+\.\s*/, ''))
            .slice(0, allThreads.length);
        }
      } catch (parseError) {
        console.error('Failed to parse batch titles:', parseError);
        // Fallback to individual generation
        titles = allThreads.map((_, i) => `Thread ${i + 1}`);
      }

      // Ensure we have the right number of titles
      if (titles.length !== allThreads.length) {
        console.warn(`Expected ${allThreads.length} titles, got ${titles.length}`);
        // Pad with generic titles if needed
        while (titles.length < allThreads.length) {
          titles.push(`Thread ${titles.length + 1}`);
        }
      }

      return NextResponse.json({
        titles,
        success: true,
      });
    }

    // Single mode: generate one title with sibling context
    if (!content) {
      return NextResponse.json(
        { error: 'Content is required', success: false },
        { status: 400 }
      );
    }

    const contextHint = contentType ? `\n\nContent type: ${contentType}` : '';
    const siblingsHint = siblingTitles && siblingTitles.length > 0
      ? `\n\nExisting sibling thread titles: ${JSON.stringify(siblingTitles)}\nMake sure your title is distinctive and different from these.`
      : '';

    const { text } = await generateText({
      model,
      system: GENERATE_SINGLE_TITLE_PROMPT,
      prompt: `Generate a concise title for this content:${contextHint}${siblingsHint}\n\n${content}\n\nRemember: Output ONLY the title (2-5 words), no explanations or quotes.`,
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
