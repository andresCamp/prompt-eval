import {
  ImageExecutionThread,
  ImageGenerationResult,
  GoogleImageRequest,
  ReveCreateRequest,
  ReveEditRequest,
  ReveRemixRequest,
  getRequiredImages
} from './types';

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

function buildGooglePayload(thread: ImageExecutionThread): GoogleImageRequest {
  const { promptThread } = thread;
  const { data, mimeType } = extractDataUrl(promptThread.referenceImages?.[0]);
  return {
    prompt: promptThread.prompt,
    referenceImage: data,
    referenceImageMimeType: mimeType
  };
}

function buildRevePayload(thread: ImageExecutionThread) {
  const { promptThread } = thread;
  const payloadBase = {
    aspect_ratio: promptThread.aspectRatio,
    version: promptThread.version
  };

  switch (promptThread.mode) {
    case 'remix': {
      const body: ReveRemixRequest = {
        prompt: promptThread.prompt,
        reference_images: (promptThread.referenceImages || [])
          .map(image => extractDataUrl(image).data)
          .filter(Boolean) as string[],
        aspect_ratio: payloadBase.aspect_ratio,
        version: payloadBase.version
      };
      return { endpoint: '/api/image/reve/remix', body };
    }
    case 'edit': {
      const body: ReveEditRequest = {
        edit_instruction: promptThread.prompt,
        reference_image: extractDataUrl(promptThread.referenceImages?.[0]).data ?? '',
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
  const providedImages = thread.promptThread.referenceImages?.filter(Boolean) ?? [];
  if (providedImages.length < requiredImages.min || providedImages.length > requiredImages.max) {
    return {
      success: false,
      error: `This prompt requires between ${requiredImages.min} and ${requiredImages.max} image${requiredImages.max === 1 ? '' : 's'}.`
    };
  }

  if (provider === 'google') {
    endpoint = '/api/image/google';
    body = buildGooglePayload(thread);
  } else {
    const config = buildRevePayload(thread);
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
    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse response'
    };
  }
}
