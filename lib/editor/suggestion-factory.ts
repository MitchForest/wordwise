import { UnifiedSuggestion, SuggestionAction } from '@/types/suggestions';

type SuggestionCategory = 'spelling' | 'grammar' | 'style' | 'seo';

/**
 * Creates a standardized UnifiedSuggestion object with a canonical ID.
 * @param from - The starting position of the suggestion.
 * @param to - The ending position of the suggestion.
 * @param originalText - The text that the suggestion is for.
 * @param category - The category of the suggestion.
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
  category: SuggestionCategory,
  title: string,
  message: string,
  actions: SuggestionAction[] = [],
  severity: 'error' | 'warning' | 'suggestion' = 'suggestion'
): UnifiedSuggestion => {
  return {
    id: `${category}:${from}:${to}`,
    category,
    severity,
    title,
    message,
    position: { start: from, end: to },
    context: { text: originalText },
    actions,
  };
}; 