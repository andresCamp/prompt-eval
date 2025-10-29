import { generateId, detectVariables } from '@/components/prompt-playground/shared/utils';
import {
  ImageExecutionThread,
  ImageGenerationConfig,
  ImagePromptThread,
  VariableRow,
  DataSet,
} from './types';

export function buildExecutionThreads(
  prompts: ImagePromptThread[],
  previous: ImageExecutionThread[],
  rows: VariableRow[] = []
): ImageExecutionThread[] {
  const newThreads: ImageExecutionThread[] = [];

  // Process ALL prompts, not just visible ones, to preserve cached images
  prompts.forEach(prompt => {
    const variables = detectVariables(prompt.prompt);

    // If prompt has no variables, create single execution thread
    if (variables.length === 0 || rows.length === 0) {
      const name = prompt.name;
      const existing = previous.find(thread =>
        thread.promptThread?.id === prompt.id && !thread.rowId
      );
      newThreads.push({
        id: existing?.id ?? generateId(),
        name,
        promptThread: prompt,
        visible: prompt.visible,
        isRunning: existing?.isRunning ?? false,
        result: existing?.result
      });
      return;
    }

    // If prompt has variables, create one execution thread per row
    rows.forEach(row => {
      const name = `${prompt.name} (Row ${row.position})`;
      const existing = previous.find(thread =>
        thread.promptThread?.id === prompt.id && thread.rowId === row.id
      );
      newThreads.push({
        id: existing?.id ?? generateId(),
        name,
        promptThread: prompt,
        rowId: row.id, // Link to specific row
        visible: prompt.visible && row.visible, // Both must be visible
        isRunning: existing?.isRunning ?? false,
        result: existing?.result
      });
    });
  });

  return newThreads;
}

export function updateExecutionThread(
  config: ImageGenerationConfig,
  threadId: string,
  updates: Partial<ImageExecutionThread>
): ImageGenerationConfig {
  return {
    ...config,
    executionThreads: config.executionThreads.map(thread =>
      thread.id === threadId ? { ...thread, ...updates } : thread
    )
  };
}

// ---------------------------------------------
// Data Set Utilities
// ---------------------------------------------

/**
 * Get unique variable combination as a sorted, normalized key
 * Example: ['color', 'animal'] → 'animal,color'
 */
export function getDataSetKey(variableNames: string[]): string {
  return [...variableNames].sort().join(',');
}

/**
 * Compute all Data Sets from prompts
 * Creates one Data Set per unique variable combination
 */
export function computeDataSets(prompts: ImagePromptThread[]): DataSet[] {
  const dataSetMap = new Map<string, DataSet>();

  prompts.forEach(prompt => {
    const variables = detectVariables(prompt.prompt);
    if (variables.length === 0) return;

    const key = getDataSetKey(variables);
    if (!dataSetMap.has(key)) {
      dataSetMap.set(key, {
        id: `dataset-${key}`,
        variableNames: [...variables].sort(),
      });
    }
  });

  return Array.from(dataSetMap.values());
}

/**
 * Get Data Set for a specific prompt based on its variables
 */
export function getDataSetForPrompt(prompt: ImagePromptThread, dataSets: DataSet[]): DataSet | undefined {
  const variables = detectVariables(prompt.prompt);
  if (variables.length === 0) return undefined;

  const key = getDataSetKey(variables);
  return dataSets.find(ds => getDataSetKey(ds.variableNames) === key);
}

/**
 * Get prompts that use a specific Data Set
 */
export function getPromptsForDataSet(dataSet: DataSet, prompts: ImagePromptThread[]): ImagePromptThread[] {
  const dataSetKey = getDataSetKey(dataSet.variableNames);

  return prompts.filter(prompt => {
    const variables = detectVariables(prompt.prompt);
    if (variables.length === 0) return false;
    return getDataSetKey(variables) === dataSetKey;
  });
}

/**
 * Get visible rows filtered by a Data Set's variables
 */
export function getVisibleRowsForDataSet(dataSet: DataSet, rows: VariableRow[]): VariableRow[] {
  return rows.filter(row => row.visible);
}

/**
 * Update a row's variable value globally
 */
export function updateRowValue(
  rows: VariableRow[],
  rowId: string,
  varName: string,
  value: string
): VariableRow[] {
  return rows.map(row => {
    if (row.id !== rowId) return row;
    return {
      ...row,
      values: {
        ...row.values,
        [varName]: value,
      },
    };
  });
}

/**
 * Toggle row visibility globally
 */
export function toggleRowVisibility(rows: VariableRow[], rowId: string): VariableRow[] {
  return rows.map(row => {
    if (row.id !== rowId) return row;
    return { ...row, visible: !row.visible };
  });
}

/**
 * Add a new row to the global store
 */
export function addRow(rows: VariableRow[], initialValues: Record<string, string> = {}): VariableRow[] {
  const maxPosition = rows.length > 0 ? Math.max(...rows.map(r => r.position)) : -1;
  const newRow: VariableRow = {
    id: generateId(),
    position: maxPosition + 1,
    values: initialValues,
    visible: true,
  };
  return [...rows, newRow];
}

/**
 * Get or create first row if none exist
 */
export function ensureFirstRow(rows: VariableRow[], variables: string[]): VariableRow[] {
  if (rows.length > 0) return rows;

  // Create Row 0 with empty values for detected variables
  const initialValues: Record<string, string> = {};
  variables.forEach(v => {
    initialValues[v] = '';
  });

  return addRow(rows, initialValues);
}
