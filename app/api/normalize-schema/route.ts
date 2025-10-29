import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';

const NORMALIZE_PROMPT = `You are a TypeScript/Zod schema expert. Your task is to normalize complex Zod schemas into a single, self-contained schema definition.

Rules:
1. Combine all const definitions into a single z.object() schema
2. Inline all referenced schemas - replace variable references with their actual definitions
3. Keep all validations (min, max, default, etc.)
4. Preserve the exact structure and field names
5. Output ONLY the normalized z.object() code, no explanations
6. The output should be valid TypeScript/Zod code that can be directly executed
7. Do not include any imports or exports
8. Start directly with z.object({ ... })
9. For the main/root schema, inline everything

Example input:
const USER = z.object({ name: z.string() })
const POST = z.object({ author: USER, title: z.string() })

Example output:
z.object({
  author: z.object({ name: z.string() }),
  title: z.string()
})

Another example input:
const STORY_SEED_SCHEMA = z.object({
  identifier: z.string().min(3),
  title: z.string()
})
const GAP_INSIGHT_SCHEMA = z.object({
  gapId: z.string(),
  storySeeds: z.array(STORY_SEED_SCHEMA)
})
const TRANSCRIPT_ANALYSIS_SCHEMA = z.object({
  gapInsights: z.array(GAP_INSIGHT_SCHEMA)
})

Example output (notice how everything is inlined):
z.object({
  gapInsights: z.array(z.object({
    gapId: z.string(),
    storySeeds: z.array(z.object({
      identifier: z.string().min(3),
      title: z.string()
    }))
  }))
})`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { schema } = body;

    if (!schema) {
      return NextResponse.json(
        { error: 'Schema is required', success: false },
        { status: 400 }
      );
    }

    // Use Gemini 2.0 Flash for normalization
    const model = google('gemini-2.0-flash');

    const { text } = await generateText({
      model,
      system: NORMALIZE_PROMPT,
      prompt: `Input schema to normalize:\n\n${schema}\n\nRemember: Output ONLY the normalized z.object() code, starting with z.object({`,
      temperature: 0.1, // Low temperature for consistent output
    });

    // Clean up the response - remove any markdown code blocks if present
    let normalizedSchema = text.trim();

    // Remove markdown code blocks if present
    normalizedSchema = normalizedSchema.replace(/^```(?:typescript|ts|javascript|js)?\n?/, '');
    normalizedSchema = normalizedSchema.replace(/\n?```$/, '');
    normalizedSchema = normalizedSchema.trim();

    // Validate that it starts with z.object
    if (!normalizedSchema.startsWith('z.object(')) {
      // Try to extract z.object from the response
      const match = normalizedSchema.match(/z\.object\([^]*?\)(?=\s*$)/);
      if (match) {
        normalizedSchema = match[0];
      } else {
        // As a last resort, try to find any z.object definition
        const lastResortMatch = normalizedSchema.match(/z\.object\s*\(\s*\{[\s\S]*?\}\s*\)/);
        if (lastResortMatch) {
          normalizedSchema = lastResortMatch[0];
        } else {
          return NextResponse.json(
            {
              error: 'Failed to normalize schema. Output does not contain valid z.object definition',
              success: false,
              output: normalizedSchema
            },
            { status: 400 }
          );
        }
      }
    }

    // Final cleanup - ensure no trailing semicolons
    normalizedSchema = normalizedSchema.replace(/;\s*$/, '');

    // Try to validate the schema is compilable (optional validation)
    try {
      // This is just a basic syntax check
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const testFunction = new Function('z', `return ${normalizedSchema}`);
      // We don't actually execute it with real Zod, just check syntax
    } catch (syntaxError) {
      console.warn('Schema may have syntax issues:', syntaxError);
      // We'll still return it but warn in console
    }

    return NextResponse.json({
      normalizedSchema,
      success: true,
    });

  } catch (error) {
    console.error('Schema normalization error:', error);

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