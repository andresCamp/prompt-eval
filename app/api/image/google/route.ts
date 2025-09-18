import { NextResponse } from 'next/server';
import type { GoogleImageRequest } from '@/components/image-playground/types';

const GEMINI_MODEL = 'models/gemini-2.5-flash-image-preview';
const GOOGLE_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent`;

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
    if (body.referenceImage) {
      parts.push({
        inlineData: {
          mimeType: body.referenceImageMimeType ?? 'image/png',
          data: body.referenceImage
        }
      });
    }

    const response = await fetch(`${GOOGLE_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts
          }
        ]
      })
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

    return NextResponse.json({
      success: true,
      image: `data:${mimeType};base64,${inlineData.data}`,
      duration,
      version: GEMINI_MODEL,
      requestId: data?.responseMetaData?.requestId ?? undefined
    });
  } catch (error) {
    console.error('[Google Image API] error', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
