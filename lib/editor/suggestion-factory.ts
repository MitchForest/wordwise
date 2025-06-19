/**
 * @file lib/editor/suggestion-factory.ts
 * @purpose Defines a factory function for creating standardized `UnifiedSuggestion`
 * objects. This ensures consistency and stability of suggestion data across
 * all analysis services.
 * @modified 2024-12-28 - Improved matchText to include context for short matches
 */
import {
  UnifiedSuggestion,
  SuggestionAction,
  SuggestionCategory,
  SubCategory,
  RuleId,
} from '@/types/suggestions';

/**
 * Creates a standardized UnifiedSuggestion object with stable ID.
 * @purpose Create suggestions with position-independent IDs
 * @modified 2024-12-28 - Added context for short matches to ensure uniqueness
 * 
 * @param from - The starting position (used only for occurrence counting)
 * @param to - The ending position (not stored in suggestion)
 * @param originalText - The text that the suggestion is for
 * @param documentText - The full document text (used only for occurrence counting)
 * @param category - The main category of the suggestion
 * @param subCategory - The specific sub-category
 * @param ruleId - The canonical ID for the specific rule
 * @param title - A short, descriptive title
 * @param message - The detailed message for the user
 * @param actions - An array of actions the user can take
 * @param severity - The severity of the suggestion
 * @returns A standardized UnifiedSuggestion object
 */
export const createSuggestion = (
  from: number,
  to: number,
  originalText: string,
  documentText: string,
  category: SuggestionCategory,
  subCategory: SubCategory,
  ruleId: RuleId,
  title: string,
  message: string,
  actions: SuggestionAction[] = [],
  severity: 'error' | 'warning' | 'suggestion' = 'suggestion',
): UnifiedSuggestion => {
  // For very short matches (1-2 chars), we need more context to ensure uniqueness
  // This prevents issues like matching the wrong "t" when fixing capitalization
  let contextualMatchText = originalText;
  
  if (originalText.length <= 2) {
    // Get surrounding context for short matches
    const contextBefore = Math.max(0, from - 10);
    const contextAfter = Math.min(documentText.length, to + 10);
    contextualMatchText = documentText.substring(contextBefore, contextAfter);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[createSuggestion] Short match, adding context:', {
        originalText,
        contextualMatchText,
        from,
        to,
        contextBefore,
        contextAfter
      });
    }
  }
  
  // Count occurrences of the contextual text for unique identification
  let occurrenceCount = 0;
  let searchIndex = -1;
  const occurrencePositions: number[] = [];
  
  // Debug: Check what we're searching for
  if (process.env.NODE_ENV === 'development') {
    console.log('[createSuggestion] Counting occurrences:', {
      searchText: contextualMatchText,
      originalText,
      currentPosition: from,
      documentLength: documentText.length,
      textAtCurrentPosition: documentText.substring(from, to)
    });
  }
  
  while ((searchIndex = documentText.indexOf(contextualMatchText, searchIndex + 1)) !== -1) {
    occurrencePositions.push(searchIndex);
    if (searchIndex < from - (contextualMatchText.length - originalText.length) / 2) {
      occurrenceCount++;
      if (process.env.NODE_ENV === 'development') {
        console.log('[createSuggestion] Found earlier occurrence:', {
          at: searchIndex,
          occurrenceCount
        });
      }
    }
    if (searchIndex >= from - (contextualMatchText.length - originalText.length) / 2) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[createSuggestion] Reached current position, stopping count');
      }
      break;
    }
  }
  
  // Generate stable ID without context
  // Use first 8 chars of text (alphanumeric only) for readability
  const textHash = originalText.slice(0, 8).toLowerCase().replace(/[^a-z0-9]/g, '');
  const id = `${ruleId}-${textHash}-${occurrenceCount}`;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[createSuggestion] Generated ID:', {
      id,
      ruleId,
      textHash,
      occurrenceCount,
      originalText,
      matchText: contextualMatchText,
      from,
      to,
      actualTextAtPosition: documentText.substring(from, to),
      expectedText: originalText,
      textMatches: documentText.substring(from, to) === originalText,
      allOccurrences: occurrencePositions,
      documentLength: documentText.length
    });
  }
  
  const suggestion: UnifiedSuggestion = {
    id,
    ruleId,
    category,
    subCategory,
    severity,
    title,
    message,
    matchText: contextualMatchText,
    originalText, // Store the actual error text separately
    originalFrom: from, // Store original position for reference
    originalTo: to,
    actions,
    context: { text: originalText }, // Keep for backward compatibility
  };

  return suggestion;
};

/**
 * Creates a document-level suggestion (no position)
 * @purpose Create suggestions that apply to the entire document
 * @modified 2024-12-28 - Simplified implementation
 */
export const createDocumentSuggestion = (
  category: SuggestionCategory,
  subCategory: SubCategory,
  ruleId: RuleId,
  title: string,
  message: string,
  actions: SuggestionAction[] = [],
  severity: 'error' | 'warning' | 'suggestion' = 'suggestion',
): UnifiedSuggestion => {
  // For document-level suggestions, use a simple ID
  const id = `${ruleId}-global`;
  
  return {
    id,
    ruleId,
    category,
    subCategory,
    severity,
    title,
    message,
    actions,
    context: { text: '' },
  };
}; 