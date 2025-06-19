/**
 * @file services/analysis/retext-converter.ts
 * @purpose Convert retext VFileMessage to UnifiedSuggestion format with stable IDs
 * @created 2024-12-28
 */

import type { VFileMessage } from 'vfile-message';
import { UnifiedSuggestion, SuggestionCategory, SubCategory, SuggestionAction } from '@/types/suggestions';
import { createHash } from 'crypto';

// Helper function to escape regex special characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Extended VFileMessage type with position info
interface VFileMessageWithPosition {
  reason: string;
  ruleId?: string;
  source?: string;
  fatal?: boolean;
  note?: string;
  position?: {
    start: { offset: number };
    end: { offset: number };
  };
  expected?: string[];
}

export class RetextConverter {
  /**
   * @purpose Convert retext VFileMessage to UnifiedSuggestion format with stable IDs
   * @param message - The retext message to convert
   * @param documentText - Full document text for context extraction
   * @param category - Optional category override
   * @returns UnifiedSuggestion object
   */
  static messageToSuggestion(
    message: VFileMessage,
    documentText: string,
    category?: string
  ): UnifiedSuggestion {
    const msg = message as VFileMessageWithPosition;
    
    // Extract text around the error position
    const start = msg.position?.start.offset || 0;
    const end = msg.position?.end.offset || start;
    const matchText = documentText.slice(start, end);
    
    // Get context (20 chars before/after, trimmed at word boundaries)
    const contextStart = Math.max(0, start - 20);
    const contextEnd = Math.min(documentText.length, end + 20);
    
    // Find word boundaries for cleaner context
    let contextBefore = documentText.slice(contextStart, start);
    let contextAfter = documentText.slice(end, contextEnd);
    
    // Trim to word boundaries
    const beforeWords = contextBefore.split(/\s+/);
    if (beforeWords.length > 1 && contextStart > 0) {
      beforeWords.shift(); // Remove partial word at start
    }
    contextBefore = beforeWords.join(' ').trimStart();
    
    const afterWords = contextAfter.split(/\s+/);
    if (afterWords.length > 1 && contextEnd < documentText.length) {
      afterWords.pop(); // Remove partial word at end
    }
    contextAfter = afterWords.join(' ').trimEnd();
    
    // Determine category from source
    const suggestionCategory = category || this.mapSourceToCategory(msg.source);
    
    // Generate stable ID using occurrence count
    const id = this.generateStableId(msg, matchText, suggestionCategory, documentText, start);
    
    // Convert expected values to actions
    const actions: SuggestionAction[] = msg.expected ? msg.expected.map((fix: string) => ({
      type: 'fix' as const,
      label: fix,
      value: fix,
      handler: () => {} // Will be set by the UI component
    })) : [];
    
    return {
      id,
      category: suggestionCategory as SuggestionCategory,
      subCategory: (msg.ruleId || msg.source || 'general') as SubCategory,
      ruleId: msg.ruleId || `${msg.source}/${suggestionCategory}`,
      title: this.getTitle(msg),
      message: msg.reason || 'Issue detected',
      severity: this.mapSeverity(msg),
      matchText,
      context: {
        text: matchText,
        before: contextBefore,
        after: contextAfter
      },
      position: {
        start,
        end
      },
      originalFrom: start,
      originalTo: end,
      actions
    };
  }
  
  /**
   * @purpose Generate stable ID that survives document edits
   * @param message - The retext message
   * @param matchText - The matched text
   * @param category - Suggestion category
   * @param documentText - Full document text
   * @param position - Position in document
   * @returns Stable suggestion ID
   */
  private static generateStableId(
    message: VFileMessageWithPosition,
    matchText: string,
    category: string,
    documentText: string,
    position: number
  ): string {
    // Count occurrences of this exact text before this position
    const beforeText = documentText.slice(0, position);
    const regex = new RegExp(escapeRegExp(matchText), 'g');
    const occurrenceCount = (beforeText.match(regex) || []).length;
    
    // Use the same ID structure as existing system
    const ruleId = message.ruleId || `${message.source}/${category}`;
    const textHash = createHash('sha256').update(matchText).digest('hex').slice(0, 8);
    
    return `${ruleId}-${textHash}-${occurrenceCount}`;
  }
  
  /**
   * @purpose Map retext source to our category system
   * @param source - The retext plugin source
   * @returns Category string
   */
  private static mapSourceToCategory(source?: string): string {
    if (!source) return 'style';
    
    const categoryMap: Record<string, string> = {
      'retext-spell': 'spelling',
      'retext-repeated-words': 'style',
      'retext-sentence-spacing': 'grammar',
      'retext-passive': 'style',
      'retext-simplify': 'style',
      'retext-quotes': 'grammar',
      'retext-contractions': 'style',
      'retext-indefinite-article': 'grammar',
      'retext-readability': 'style',
      'retext-equality': 'style'
    };
    
    return categoryMap[source] || 'style';
  }
  
  /**
   * @purpose Map retext severity to our system
   * @param message - The retext message
   * @returns Severity level
   */
  private static mapSeverity(message: VFileMessageWithPosition): 'error' | 'warning' | 'info' {
    // Retext uses fatal for errors
    if (message.fatal) return 'error';
    
    // Spelling errors should be errors
    if (message.source === 'retext-spell') return 'error';
    
    // Grammar issues are warnings
    if (['retext-sentence-spacing', 'retext-indefinite-article', 'retext-quotes']
        .includes(message.source || '')) {
      return 'warning';
    }
    
    // Style suggestions are info
    return 'info';
  }
  
  /**
   * @purpose Get user-friendly title for the issue
   * @param message - The retext message
   * @returns Title string
   */
  private static getTitle(message: VFileMessageWithPosition): string {
    const titleMap: Record<string, string> = {
      'retext-spell': 'Spelling Error',
      'retext-repeated-words': 'Repeated Word',
      'retext-sentence-spacing': 'Sentence Spacing',
      'retext-passive': 'Passive Voice',
      'retext-simplify': 'Complex Phrase',
      'retext-quotes': 'Quote Style',
      'retext-contractions': 'Contraction',
      'retext-indefinite-article': 'Article Usage',
      'retext-readability': 'Readability',
      'retext-equality': 'Inclusive Language'
    };
    
    return titleMap[message.source || ''] || 'Style Issue';
  }
} 