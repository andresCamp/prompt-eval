import {
  ImageExecutionThread,
  ImageGenerationResult,
  GoogleImageRequest,
  ReveCreateRequest,
  ReveEditRequest,
  ReveRemixRequest,
  VariableRow,
  getRequiredImages
} from './types';
import { getImage } from '@/lib/image-storage';
import { replaceVariables } from '@/components/prompt-playground/shared/utils';

function extractDataUrl(image?: string): { data?: string; mimeType?: string } {
  if (!image) {
    return { data: undefined, mimeType: undefined };
  }
  if (!image.startsWith('data:')) {
    return { data: image, mimeType: undefined };
  }
  const match = image.match(/^data:(.*?);base64,(.*)$/);
  if (!match) {
    return { data: image, mimeType: undefined };
  }
  return {
    mimeType: match[1],
    data: match[2]
  };
}

async function buildGooglePayload(thread: ImageExecutionThread, rowValues?: Record<string, string>): Promise<GoogleImageRequest> {
  const { promptThread } = thread;
  const referenceImages: Array<{ data: string; mimeType: string }> = [];

  // Load all reference images
  if (promptThread.referenceImageIds?.length) {
    for (const imageId of promptThread.referenceImageIds) {
      const imageData = await getImage(imageId);
      if (imageData) {
        // Extract mime type and base64 data from data URL
        const extracted = extractDataUrl(imageData);
        if (extracted.data) {
          referenceImages.push({
            data: extracted.data,
            mimeType: extracted.mimeType || 'image/png'
          });
        }
      }
    }
  }

  // Replace variables in prompt (use row values if available, fallback to thread variables for backward compat)
  const processedPrompt = replaceVariables(promptThread.prompt, rowValues ?? promptThread.variables);

  // Build the request payload
  const payload: GoogleImageRequest = {
    prompt: processedPrompt,
    referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
    version: promptThread.version
  };

  // Add Gemini 3 Pro image config if not 'auto'
  if (promptThread.geminiAspectRatio && promptThread.geminiAspectRatio !== 'auto') {
    payload.aspectRatio = promptThread.geminiAspectRatio;
  }
  if (promptThread.geminiImageSize && promptThread.geminiImageSize !== 'auto') {
    payload.imageSize = promptThread.geminiImageSize;
  }

  return payload;
}

async function buildRevePayload(thread: ImageExecutionThread, rowValues?: Record<string, string>) {
  const { promptThread } = thread;
  const payloadBase = {
    aspect_ratio: promptThread.aspectRatio,
    version: promptThread.version
  };

  // Replace variables in prompt (use row values if available, fallback to thread variables for backward compat)
  const processedPrompt = replaceVariables(promptThread.prompt, rowValues ?? promptThread.variables);

  switch (promptThread.mode) {
    case 'remix': {
      const referenceImages: string[] = [];
      if (promptThread.referenceImageIds) {
        for (const imageId of promptThread.referenceImageIds) {
          const imageData = await getImage(imageId);
          if (imageData) {
            referenceImages.push(imageData);
          }
        }
      }

      const body: ReveRemixRequest = {
        prompt: processedPrompt,
        reference_images: referenceImages,
        aspect_ratio: payloadBase.aspect_ratio,
        version: payloadBase.version
      };
      return { endpoint: '/api/image/reve/remix', body };
    }
    case 'edit': {
      let referenceImage = '';
      if (promptThread.referenceImageIds?.[0]) {
        const imageData = await getImage(promptThread.referenceImageIds[0]);
        referenceImage = imageData || '';
      }

      const body: ReveEditRequest = {
        edit_instruction: processedPrompt,
        reference_image: referenceImage,
        version: payloadBase.version
      };
      return { endpoint: '/api/image/reve/edit', body };
    }
    case 'create':
    default: {
      const body: ReveCreateRequest = {
        prompt: processedPrompt,
        aspect_ratio: payloadBase.aspect_ratio,
        version: payloadBase.version
      };
      return { endpoint: '/api/image/reve/create', body };
    }
  }
}

export async function runImageExecution(
  thread: ImageExecutionThread,
  rows: VariableRow[] = []
): Promise<ImageGenerationResult> {
  const provider = thread.promptThread.provider;
  let endpoint: string;
  let body: unknown;

  const requiredImages = getRequiredImages(provider, thread.promptThread.mode, thread.promptThread.version);
  const providedImages = thread.promptThread.referenceImageIds?.filter(Boolean) ?? [];
  if (providedImages.length < requiredImages.min || providedImages.length > requiredImages.max) {
    return {
      success: false,
      error: `This prompt requires between ${requiredImages.min} and ${requiredImages.max} image${requiredImages.max === 1 ? '' : 's'}.`
    };
  }

  // Get row values if this thread is linked to a row
  const rowValues = thread.rowId
    ? rows.find(r => r.id === thread.rowId)?.values
    : undefined;

  if (provider === 'google') {
    endpoint = '/api/image/google';
    body = await buildGooglePayload(thread, rowValues);
  } else {
    const config = await buildRevePayload(thread, rowValues);
    endpoint = config.endpoint;
    body = config.body;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  try {
    const data = (await response.json()) as ImageGenerationResult;
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`
      };
    }

    // Return the image data as-is (will be saved to IndexedDB only if cached)
    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse response'
    };
  }
}
