/**
 * @file services/analysis/suggestion-deduplicator.ts
 * @purpose Sophisticated deduplication of suggestions from multiple sources
 * @created 2024-12-28
 */

import { UnifiedSuggestion, EnhancedSuggestion } from '@/types/suggestions';

export class SuggestionDeduplicator {
  /**
   * @purpose Merge suggestions from multiple sources with sophisticated overlap handling
   * Priority: AI Enhanced > Server > Client
   * @param clientSuggestions - Suggestions from retext (client-side)
   * @param serverSuggestions - Suggestions from server analysis
   * @param aiEnhancedSuggestions - AI-enhanced suggestions
   * @returns Deduplicated array of suggestions
   */
  static deduplicate(
    clientSuggestions: UnifiedSuggestion[],
    serverSuggestions: UnifiedSuggestion[],
    aiEnhancedSuggestions: EnhancedSuggestion[]
  ): UnifiedSuggestion[] {
    const suggestionMap = new Map<string, UnifiedSuggestion>();
    const positionMap = new Map<string, Set<string>>(); // position -> suggestion IDs
    
    // Helper to register position coverage
    const registerPosition = (s: UnifiedSuggestion) => {
      if (s.originalFrom === undefined || s.originalTo === undefined) return;
      
      for (let pos = s.originalFrom; pos < s.originalTo; pos++) {
        const key = `${pos}`;
        if (!positionMap.has(key)) {
          positionMap.set(key, new Set());
        }
        positionMap.get(key)!.add(s.id);
      }
    };
    
    // Helper to check exact overlap
    const hasExactOverlap = (s1: UnifiedSuggestion, s2: UnifiedSuggestion) => {
      return s1.originalFrom === s2.originalFrom &&
             s1.originalTo === s2.originalTo &&
             s1.matchText === s2.matchText;
    };
    
    // Process a suggestion with priority handling
    const processSuggestion = (suggestion: UnifiedSuggestion, priority: number) => {
      // Check for exact duplicates first
      for (const [id, existing] of suggestionMap) {
        if (hasExactOverlap(suggestion, existing)) {
          // Higher priority wins
          const existingPriority = (existing as any).aiEnhanced ? 3 : 1;
          if (priority > existingPriority) {
            suggestionMap.delete(id);
            // Clear position registrations
            if (existing.originalFrom !== undefined && existing.originalTo !== undefined) {
              for (let pos = existing.originalFrom; pos < existing.originalTo; pos++) {
                positionMap.get(`${pos}`)?.delete(id);
              }
            }
            suggestionMap.set(suggestion.id, suggestion);
            registerPosition(suggestion);
          }
          return; // Don't add duplicate
        }
      }
      
      // Check for overlapping but different suggestions
      if (suggestion.originalFrom !== undefined && suggestion.originalTo !== undefined) {
        const overlappingIds = new Set<string>();
        
        for (let pos = suggestion.originalFrom; pos < suggestion.originalTo; pos++) {
          const idsAtPos = positionMap.get(`${pos}`);
          if (idsAtPos) {
            idsAtPos.forEach(id => overlappingIds.add(id));
          }
        }
        
        // Handle overlaps based on rules
        for (const existingId of overlappingIds) {
          const existing = suggestionMap.get(existingId);
          if (!existing) continue;
          
          // Same category at same position - higher priority wins
          if (existing.category === suggestion.category) {
            suggestionMap.delete(existingId);
            // Clear from position map
            if (existing.originalFrom !== undefined && existing.originalTo !== undefined) {
              for (let pos = existing.originalFrom; pos < existing.originalTo; pos++) {
                positionMap.get(`${pos}`)?.delete(existingId);
              }
            }
          }
          // Different categories - check for conflicts
          else if (this.conflictingCategories(existing.category, suggestion.category)) {
            const existingPriority = (existing as any).aiEnhanced ? 3 : 1;
            if (priority > existingPriority) {
              suggestionMap.delete(existingId);
              // Clear from position map
              if (existing.originalFrom !== undefined && existing.originalTo !== undefined) {
                for (let pos = existing.originalFrom; pos < existing.originalTo; pos++) {
                  positionMap.get(`${pos}`)?.delete(existingId);
                }
              }
            } else {
              return; // Don't add this suggestion
            }
          }
          // Non-conflicting categories can coexist
        }
      }
      
      // Add the suggestion
      suggestionMap.set(suggestion.id, suggestion);
      registerPosition(suggestion);
    };
    
    // Process all suggestions by priority
    clientSuggestions.forEach(s => processSuggestion(s, 1));
    serverSuggestions.forEach(s => processSuggestion(s, 2));
    aiEnhancedSuggestions.forEach(s => processSuggestion(s, 3));
    
    // Sort by position
    return Array.from(suggestionMap.values()).sort((a, b) => {
      const posA = a.originalFrom || 0;
      const posB = b.originalFrom || 0;
      return posA - posB;
    });
  }
  
  /**
   * @purpose Check if two categories conflict (can't coexist at same position)
   * @param cat1 - First category
   * @param cat2 - Second category
   * @returns True if categories conflict
   */
  private static conflictingCategories(cat1: string, cat2: string): boolean {
    // Spelling and grammar often conflict (e.g., "dont" could be spelling or contraction)
    if ((cat1 === 'spelling' && cat2 === 'grammar') || 
        (cat1 === 'grammar' && cat2 === 'spelling')) {
      return true;
    }
    
    // Style and grammar can conflict (e.g., passive voice vs. verb agreement)
    if ((cat1 === 'style' && cat2 === 'grammar') || 
        (cat1 === 'grammar' && cat2 === 'style')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * @purpose Merge document-wide suggestions (like SEO) that don't have positions
   * @param suggestions - Array of suggestions to process
   * @returns Deduplicated document-wide suggestions
   */
  static mergeDocumentWideSuggestions(suggestions: UnifiedSuggestion[]): UnifiedSuggestion[] {
    const seen = new Map<string, UnifiedSuggestion>();
    
    suggestions.forEach(suggestion => {
      if (suggestion.originalFrom !== undefined) return; // Skip positioned suggestions
      
      const key = `${suggestion.category}:${suggestion.subCategory}:${suggestion.ruleId}`;
      
      // Keep AI-enhanced version if available
      const existing = seen.get(key);
      if (!existing || (suggestion as any).aiEnhanced) {
        seen.set(key, suggestion);
      }
    });
    
    return Array.from(seen.values());
  }
} 