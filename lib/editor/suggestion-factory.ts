/**
 * @file lib/editor/suggestion-factory.ts
 * @purpose Defines a factory function for creating standardized `UnifiedSuggestion`
 * objects. This ensures consistency and stability of suggestion data across
 * all analysis services.
 */
import {
  UnifiedSuggestion,
  SuggestionAction,
  SuggestionCategory,
  SubCategory,
  RuleId,
} from '@/types/suggestions';

/**
 * Creates a standardized UnifiedSuggestion object with a position-based ID.
 * This ensures that the same error at the same position always gets the same ID,
 * preventing duplicate key errors in React when the same error is detected by
 * multiple analysis tiers.
 * 
 * @param from - The starting position of the suggestion. Can be `undefined` for document-level suggestions.
 * @param to - The ending position of the suggestion. Can be `undefined` for document-level suggestions.
 * @param originalText - The text that the suggestion is for.
 * @param contextSnippet - A snippet of surrounding context (kept for backwards compatibility but not used in ID).
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
  from: number | undefined,
  to: number | undefined,
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
  // Use position-based ID to ensure same error at same position always has same ID
  // This prevents duplicate keys when real-time and debounced checks find the same error
  const positionKey = from !== undefined ? from : 'global';
  const id = `${category}:${subCategory}:${ruleId}:${positionKey}`;
  
  const suggestion: UnifiedSuggestion = {
    id,
    ruleId,
    category,
    subCategory,
    severity,
    title,
    message,
    context: { text: originalText },
    actions,
  };

  // Only add the position object if `from` and `to` are valid numbers.
  // This allows for document-level suggestions that won't be sorted to the top.
  if (from !== undefined && to !== undefined) {
    suggestion.position = { start: from, end: to };
  }

  return suggestion;
}; 