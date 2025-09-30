import {
  ImageExecutionThread,
  ImageGenerationResult,
  GoogleImageRequest,
  ReveCreateRequest,
  ReveEditRequest,
  ReveRemixRequest,
  getRequiredImages
} from './types';
import { getImage } from '@/lib/image-storage';

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

async function buildGooglePayload(thread: ImageExecutionThread): Promise<GoogleImageRequest> {
  const { promptThread } = thread;
  let referenceImage: string | undefined;

  if (promptThread.referenceImageIds?.[0]) {
    const imageData = await getImage(promptThread.referenceImageIds[0]);
    referenceImage = imageData || undefined;
  }

  return {
    prompt: promptThread.prompt,
    referenceImage,
    referenceImageMimeType: referenceImage ? 'image/png' : undefined
  };
}

async function buildRevePayload(thread: ImageExecutionThread) {
  const { promptThread } = thread;
  const payloadBase = {
    aspect_ratio: promptThread.aspectRatio,
    version: promptThread.version
  };

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
        prompt: promptThread.prompt,
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
        edit_instruction: promptThread.prompt,
        reference_image: referenceImage,
        version: payloadBase.version
      };
      return { endpoint: '/api/image/reve/edit', body };
    }
    case 'create':
    default: {
      const body: ReveCreateRequest = {
        prompt: promptThread.prompt,
        aspect_ratio: payloadBase.aspect_ratio,
        version: payloadBase.version
      };
      return { endpoint: '/api/image/reve/create', body };
    }
  }
}

export async function runImageExecution(thread: ImageExecutionThread): Promise<ImageGenerationResult> {
  const provider = thread.promptThread.provider;
  let endpoint: string;
  let body: unknown;

  const requiredImages = getRequiredImages(provider, thread.promptThread.mode);
  const providedImages = thread.promptThread.referenceImageIds?.filter(Boolean) ?? [];
  if (providedImages.length < requiredImages.min || providedImages.length > requiredImages.max) {
    return {
      success: false,
      error: `This prompt requires between ${requiredImages.min} and ${requiredImages.max} image${requiredImages.max === 1 ? '' : 's'}.`
    };
  }

  if (provider === 'google') {
    endpoint = '/api/image/google';
    body = await buildGooglePayload(thread);
  } else {
    const config = await buildRevePayload(thread);
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
