/**
 * Utility functions for the GenerateObject Playground
 */

/**
 * Detect variables in the format ${variableName} from a text string
 * @param text - The text to search for variables
 * @returns Array of unique variable names found
 */
export function detectVariables(text: string): string[] {
  const variablePattern = /\$\{([^}]+)\}/g;
  const matches = text.matchAll(variablePattern);
  const variables = new Set<string>();

  for (const match of matches) {
    if (match[1]) {
      variables.add(match[1].trim());
    }
  }

  return Array.from(variables);
}

/**
 * Replace variables in text with their corresponding values
 * @param text - The text containing ${variable} placeholders
 * @param variables - Object mapping variable names to their values
 * @returns Text with variables replaced by their values
 */
export function replaceVariables(text: string, variables?: Record<string, string>): string {
  if (!variables) return text;

  return text.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    const trimmedName = varName.trim();
    return variables[trimmedName] ?? match;
  });
}

/**
 * Get default values for detected variables
 * @param variableNames - Array of variable names
 * @param existingValues - Existing variable values to preserve
 * @returns Object with variable names as keys and values (existing or empty string)
 */
export function getVariableDefaults(
  variableNames: string[],
  existingValues?: Record<string, string>
): Record<string, string> {
  const defaults: Record<string, string> = {};

  for (const name of variableNames) {
    defaults[name] = existingValues?.[name] ?? '';
  }

  return defaults;
}