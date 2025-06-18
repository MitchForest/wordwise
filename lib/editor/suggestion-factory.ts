import {
  UnifiedSuggestion,
  SuggestionAction,
  SuggestionCategory,
  SubCategory,
  RuleId,
} from '@/types/suggestions';

/**
 * A simple, non-crypto hash function to create a stable identifier.
 * This is used to generate a unique ID from the suggestion's content,
 * making it resilient to position changes in the document.
 * @param str The string to hash.
 * @returns A 32-bit integer hash.
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash); // Return absolute value to keep it positive
}

/**
 * Creates a standardized UnifiedSuggestion object with a truly stable, essence-based ID.
 * @param from - The starting position of the suggestion.
 * @param to - The ending position of the suggestion.
 * @param originalText - The text that the suggestion is for.
 * @param contextSnippet - A snippet of surrounding context for the suggestion.
 * @param category - The main category of the suggestion.
 * @param subCategory - The specific sub-category for semantic ID creation.
 * @param ruleId - The canonical, hardcoded ID for the specific rule being violated.
 * @param title - A short, descriptive title for the suggestion type.
 * @param message - The detailed message for the user.
 * @param actions - An array of actions the user can take.
 * @param severity - The severity of the suggestion.
 * @returns A standardized UnifiedSuggestion object.
 */
export const createSuggestion = (
  from: number,
  to: number,
  originalText: string,
  contextSnippet: string,
  category: SuggestionCategory,
  subCategory: SubCategory,
  ruleId: RuleId,
  title: string,
  message: string,
  actions: SuggestionAction[] = [],
  severity: 'error' | 'warning' | 'suggestion' = 'suggestion',
): UnifiedSuggestion => {
  // The hash is now created from the rule's ID, the specific text that was
  // flagged, and a snippet of surrounding context. This creates a truly stable ID
  // that is resilient to position changes and unique even for repeated errors.
  const contentHash = simpleHash(`${ruleId}-${originalText.trim()}-${contextSnippet}`);
  
  return {
    id: `${category}:${subCategory}:${contentHash}`,
    ruleId,
    category,
    subCategory,
    severity,
    title,
    message,
    position: { start: from, end: to },
    context: { text: originalText },
    actions,
  };
}; 