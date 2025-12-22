import { NextResponse } from 'next/server';
import type { GoogleImageRequest } from '@/components/image-playground/types';

const DEFAULT_GEMINI_MODEL = 'models/gemini-2.5-flash-image-preview';
const GOOGLE_ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Gemini 3 Pro Image pricing (as of 2025)
// Source: https://ai.google.dev/gemini-api/docs/pricing
const GEMINI_PRICING = {
  inputTokensPer1M: 1.25,   // $1.25 per 1M input tokens
  outputTokensPer1M: 5.0,   // $5.00 per 1M output tokens
  // Image output tokens: 1120 tokens for 1K-2K, 2000 tokens for 4K
  // At $120/1M output tokens for images = $0.134 per 1K-2K image, $0.24 per 4K image
  imageOutputPer1M: 120.0   // $120 per 1M image output tokens
};

export async function POST(req: Request) {
  const startedAt = Date.now();
  try {
    const body = (await req.json()) as GoogleImageRequest;
    if (!body?.prompt) {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
    }

    const parts: Array<Record<string, unknown>> = [{ text: body.prompt }];

    // Add all reference images as separate parts
    if (body.referenceImages?.length) {
      for (const img of body.referenceImages) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data
          }
        });
      }
    }

    const model = body.version || DEFAULT_GEMINI_MODEL;
    const endpoint = `${GOOGLE_ENDPOINT_BASE}/${model}:generateContent`;

    // Build request body
    const requestBody: Record<string, unknown> = {
      contents: [
        {
          role: 'user',
          parts
        }
      ]
    };

    // Add imageConfig for Gemini 3 Pro if aspect ratio or image size is specified
    if (body.aspectRatio || body.imageSize) {
      const imageConfig: Record<string, string> = {};
      if (body.aspectRatio) {
        imageConfig.aspectRatio = body.aspectRatio;
      }
      if (body.imageSize) {
        imageConfig.imageSize = body.imageSize;
      }
      requestBody.generationConfig = { imageConfig };
    }

    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    if (!response.ok) {
      const message = data?.error?.message || 'Gemini image generation failed';
      return NextResponse.json({ success: false, error: message }, { status: response.status });
    }

    const candidate = data?.candidates?.[0];
    const inlinePart = candidate?.content?.parts?.find((part: Record<string, unknown>) => part.inlineData);
    const inlineData = inlinePart?.inlineData as { data?: string; mimeType?: string } | undefined;

    if (!inlineData?.data) {
      return NextResponse.json({ success: false, error: 'No image data returned from Gemini' }, { status: 502 });
    }

    const duration = (Date.now() - startedAt) / 1000;
    const mimeType = inlineData.mimeType ?? 'image/png';

    // Extract token usage from response
    const usageMetadata = data?.usageMetadata as {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    } | undefined;

    const inputTokens = usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = usageMetadata?.candidatesTokenCount ?? 0;
    const totalTokens = usageMetadata?.totalTokenCount ?? (inputTokens + outputTokens);

    // Calculate estimated cost
    // Input tokens at standard rate, output tokens at image rate
    const inputCost = (inputTokens / 1_000_000) * GEMINI_PRICING.inputTokensPer1M;
    const outputCost = (outputTokens / 1_000_000) * GEMINI_PRICING.imageOutputPer1M;
    const estimatedCost = inputCost + outputCost;

    return NextResponse.json({
      success: true,
      image: `data:${mimeType};base64,${inlineData.data}`,
      duration,
      version: model,
      requestId: data?.responseMetaData?.requestId ?? undefined,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCost: Math.round(estimatedCost * 10000) / 10000 // Round to 4 decimal places
      }
    });
  } catch (error) {
    console.error('[Google Image API] error', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
