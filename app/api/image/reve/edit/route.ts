import { NextResponse } from 'next/server';
import type { ReveEditRequest } from '@/components/image-playground/types';

const REVE_ENDPOINT = 'https://api.reve.com/v1/image/edit';

export async function POST(req: Request) {
  const startedAt = Date.now();
  try {
    const body = (await req.json()) as ReveEditRequest;
    if (!body?.edit_instruction) {
      return NextResponse.json({ success: false, error: 'Edit instruction is required' }, { status: 400 });
    }
    if (!body?.reference_image) {
      return NextResponse.json({ success: false, error: 'Reference image is required' }, { status: 400 });
    }

    const apiKey = process.env.REVE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'REVE_API_KEY is not configured' }, { status: 500 });
    }

    const response = await fetch(REVE_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        edit_instruction: body.edit_instruction,
        reference_image: body.reference_image,
        version: body.version
      })
    });

    const data = await response.json();
    if (!response.ok) {
      const message = data?.message || 'REVE edit request failed';
      return NextResponse.json({ success: false, error: message }, { status: response.status });
    }

    const duration = (Date.now() - startedAt) / 1000;
    const imageData = typeof data?.image === 'string' ? data.image : undefined;
    const image = imageData
      ? imageData.startsWith('data:')
        ? imageData
        : `data:image/png;base64,${imageData}`
      : undefined;

    return NextResponse.json({
      success: true,
      image,
      duration,
      version: data?.version,
      contentViolation: data?.content_violation ?? false,
      requestId: data?.request_id,
      creditsUsed: data?.credits_used,
      creditsRemaining: data?.credits_remaining
    });
  } catch (error) {
    console.error('[REVE Edit] error', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
