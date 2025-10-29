/**
 * @fileoverview Type definitions for image generation playground
 *
 * This system allows threading at every stage of the image generation pipeline.
 * Supports multiple providers (Google Gemini, REVE) with different capabilities.
 */

// ---------------------------------------------
// Image Providers
// ---------------------------------------------

export const IMAGE_PROVIDERS = [
  { value: 'google', label: 'Google Gemini' },
  { value: 'reve', label: 'REVE AI' }
] as const;

export type ImageProvider = 'google' | 'reve';
export type ReveMode = 'create' | 'remix' | 'edit';

// ---------------------------------------------
// Generation Parameters
// ---------------------------------------------

export type AspectRatio = '16:9' | '9:16' | '3:2' | '2:3' | '4:3' | '3:4' | '1:1';
export type ImageFormat = 'image/png' | 'image/jpeg' | 'image/webp' | 'application/json';

export const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: '1:1', label: 'Square (1:1)' },
  { value: '16:9', label: 'Landscape (16:9)' },
  { value: '9:16', label: 'Portrait (9:16)' },
  { value: '3:2', label: 'Classic (3:2)' },
  { value: '2:3', label: 'Classic Portrait (2:3)' },
  { value: '4:3', label: 'Standard (4:3)' },
  { value: '3:4', label: 'Standard Portrait (3:4)' }
];

// ---------------------------------------------
// Variable Data Management
// ---------------------------------------------

/**
 * Global row containing values for all variables across all Data Sets.
 * Rows are position-indexed and values sync across Data Sets by variable name.
 */
export interface VariableRow {
  id: string;
  position: number;
  values: Record<string, string>; // e.g., {color: 'red', animal: 'cat'}
  visible: boolean; // Global visibility - affects all Data Sets
}

/**
 * Data Set is a view of rows filtered by a unique combination of variables.
 * Auto-created based on prompts' variable combinations.
 * Example: Prompts using {color} link to Data Set [color]
 *          Prompts using {color, animal} link to Data Set [color, animal]
 */
export interface DataSet {
  id: string;
  variableNames: string[]; // Sorted array: ['color'] or ['animal', 'color']
  // Rows are computed from global VariableRow[] store
}

// ---------------------------------------------
// Threading Types
// ---------------------------------------------

export interface ImagePromptThread {
  id: string;
  name: string;
  provider: ImageProvider;
  prompt: string;
  // For REVE, mode determines which API endpoint to use
  mode?: ReveMode;
  // Reference images (IDs to images stored in IndexedDB)
  referenceImageIds?: string[];
  aspectRatio?: AspectRatio;
  format?: ImageFormat;
  version?: string;
  visible: boolean;
  // Variables for prompt templating (supports {var} and ${var} syntax)
  // DEPRECATED: Use dataSetId instead - kept for backward compatibility
  variables?: Record<string, string>;
  // Link to Data Set (auto-assigned based on detected variables)
  dataSetId?: string;
}

export interface ImageExecutionThread {
  id: string;
  name: string;
  promptThread: ImagePromptThread;
  rowId?: string; // Link to VariableRow for variable substitution
  visible: boolean;
  isRunning: boolean;
  result?: ImageGenerationResult;
}

// ---------------------------------------------
// API Response Types
// ---------------------------------------------

export interface ImageGenerationResult {
  success: boolean;
  imageId?: string; // Reference to image stored in IndexedDB
  image?: string; // Temporary base64 for immediate display (not persisted)
  error?: string;
  duration?: number;
  requestId?: string;
  creditsUsed?: number;
  creditsRemaining?: number;
  contentViolation?: boolean;
  version?: string;
}

export interface GoogleImageRequest {
  prompt: string;
  referenceImage?: string; // Optional base64 image
  referenceImageMimeType?: string;
}

export interface ReveCreateRequest {
  prompt: string;
  aspect_ratio?: AspectRatio;
  version?: string;
}

export interface ReveRemixRequest {
  prompt: string;
  reference_images: string[]; // 1-4 base64 images
  aspect_ratio?: AspectRatio;
  version?: string;
}

export interface ReveEditRequest {
  edit_instruction: string;
  reference_image: string; // Single base64 image
  version?: string;
}

// ---------------------------------------------
// Config Types
// ---------------------------------------------

export interface ImageGenerationConfig {
  promptThreads: ImagePromptThread[];
  executionThreads: ImageExecutionThread[];
  rows: VariableRow[]; // Global row store for all variable values
  openSections: {
    prompts: boolean;
    results: boolean;
    dataSets: boolean;
  };
}

// ---------------------------------------------
// Component Props
// ---------------------------------------------

export interface ImageUploadProps {
  imageIds: string[]; // IDs of images stored in IndexedDB
  maxImages: number;
  onImageIdsChange: (imageIds: string[]) => void;
  disabled?: boolean;
  required?: boolean;
}

export function getRequiredImages(provider: ImageProvider, mode?: ReveMode): { min: number; max: number } {
  if (provider === 'google') {
    return { min: 0, max: 1 };
  }

  // REVE
  switch (mode) {
    case 'create':
      return { min: 0, max: 0 };
    case 'remix':
      return { min: 1, max: 4 };
    case 'edit':
      return { min: 1, max: 1 };
    default:
      return { min: 0, max: 0 };
  }
}
