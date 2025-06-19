/**
 * @file lib/editor/suggestion-manager.ts
 * @purpose Manages suggestion positions using ProseMirror's transaction mapping.
 * Separates suggestion identity from position tracking for robust real-time editing.
 * @modified 2024-12-28 - Initial implementation
 */

import type { Node } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';
import type { UnifiedSuggestion } from '@/types/suggestions';

export interface TrackedPosition {
  suggestionId: string;
  from: number;  // ProseMirror position
  to: number;    // ProseMirror position
}

export class SuggestionManager {
  private suggestions = new Map<string, UnifiedSuggestion>();
  private positions = new Map<string, TrackedPosition>();
  
  /**
   * Add new suggestions from server and find their initial positions
   * @purpose Replace all suggestions with new ones from server
   * @modified 2024-12-28 - Initial implementation
   */
  addSuggestions(newSuggestions: UnifiedSuggestion[], doc: Node) {
    console.log('[SuggestionManager] Adding suggestions:', {
      count: newSuggestions.length,
      documentText: doc.textContent,
      documentLength: doc.textContent.length
    });
    
    this.suggestions.clear();
    this.positions.clear();
    
    newSuggestions.forEach(suggestion => {
      this.suggestions.set(suggestion.id, suggestion);
      
      // Only find positions for suggestions that have matchText
      if ('matchText' in suggestion && suggestion.matchText) {
        const position = this.findInitialPosition(doc, suggestion);
        if (position) {
          this.positions.set(suggestion.id, {
            suggestionId: suggestion.id,
            from: position.from,
            to: position.to
          });
          console.log('[SuggestionManager] Found position for:', suggestion.id, position);
        } else {
          console.log('[SuggestionManager] No position found for:', suggestion.id, {
            matchText: suggestion.matchText,
            documentText: doc.textContent
          });
        }
      }
    });
    
    console.log('[SuggestionManager] Positions tracked:', this.positions.size);
  }
  
  /**
   * Update positions when document changes using ProseMirror's transaction mapping
   * @purpose Keep positions in sync with document edits
   * @modified 2024-12-28 - Initial implementation
   */
  updatePositions(tr: Transaction): void {
    if (!tr.docChanged) return;
    
    console.log('[SuggestionManager] Updating positions after document change');
    const updatedPositions = new Map<string, TrackedPosition>();
    
    this.positions.forEach((pos, id) => {
      // Map positions through the transaction
      const mappedFrom = tr.mapping.map(pos.from);
      const mappedTo = tr.mapping.map(pos.to);
      
      if (mappedFrom !== null && mappedTo !== null && mappedFrom < mappedTo) {
        // Validate text hasn't changed
        const suggestion = this.suggestions.get(id);
        if (suggestion && 'matchText' in suggestion) {
          try {
            const currentText = tr.doc.textBetween(mappedFrom, mappedTo);
            
            if (currentText === suggestion.matchText) {
              updatedPositions.set(id, {
                suggestionId: id,
                from: mappedFrom,
                to: mappedTo
              });
            } else {
              console.log('[SuggestionManager] Text changed, removing suggestion:', id);
            }
          } catch (e) {
            console.log('[SuggestionManager] Error validating position:', e);
          }
        }
      } else {
        console.log('[SuggestionManager] Position invalid after mapping:', id);
      }
    });
    
    this.positions = updatedPositions;
    console.log('[SuggestionManager] Positions remaining:', this.positions.size);
  }
  
  /**
   * Get all current positions for rendering decorations
   * @purpose Provide positions to ProseMirror for decoration rendering
   * @modified 2024-12-28 - Initial implementation
   */
  getPositions(): TrackedPosition[] {
    return Array.from(this.positions.values());
  }
  
  /**
   * Get a specific suggestion by ID
   * @purpose Retrieve suggestion data for decoration rendering
   * @modified 2024-12-28 - Initial implementation
   */
  getSuggestion(id: string): UnifiedSuggestion | undefined {
    return this.suggestions.get(id);
  }
  
  /**
   * Get position for a specific suggestion
   * @purpose Used when applying fixes
   * @modified 2024-12-28 - Initial implementation
   */
  getPosition(suggestionId: string): TrackedPosition | undefined {
    return this.positions.get(suggestionId);
  }
  
  /**
   * Get all suggestions (for UI display)
   * @purpose Provide suggestions to React components
   * @modified 2024-12-28 - Initial implementation
   */
  getAllSuggestions(): UnifiedSuggestion[] {
    return Array.from(this.suggestions.values());
  }
  
  /**
   * Remove a specific suggestion
   * @purpose Remove suggestion after it's been applied or ignored
   * @modified 2024-12-28 - Initial implementation
   */
  removeSuggestion(id: string): void {
    this.suggestions.delete(id);
    this.positions.delete(id);
  }
  
  /**
   * Find initial position for a suggestion in the document
   * @purpose Locate where a suggestion's text appears when first received
   * @modified 2024-12-28 - Updated to handle contextual matches for short text
   */
  private findInitialPosition(doc: Node, suggestion: UnifiedSuggestion): { from: number; to: number } | null {
    if (!('matchText' in suggestion) || !suggestion.matchText) {
      return null;
    }
    
    const matchText = suggestion.matchText;
    const originalText = suggestion.originalText || matchText;
    const originalFrom = suggestion.originalFrom;
    const originalTo = suggestion.originalTo;
    
    // If we have the original position stored, try to use it directly
    // This is more reliable than searching
    if (originalFrom !== undefined && originalTo !== undefined) {
      try {
        const currentText = doc.textBetween(originalFrom, originalTo);
        if (currentText === originalText) {
          console.log('[SuggestionManager] Using original position:', {
            id: suggestion.id,
            originalFrom,
            originalTo,
            originalText,
            currentText
          });
          return { from: originalFrom, to: originalTo };
        }
      } catch {
        // Position might be out of bounds, fall back to search
      }
    }
    
    let occurrenceCount = 0;
    let result: { from: number; to: number } | null = null;
    
    // Extract occurrence number from ID
    const lastHyphenIndex = suggestion.id.lastIndexOf('-');
    const occurrenceStr = lastHyphenIndex !== -1 ? suggestion.id.substring(lastHyphenIndex + 1) : '0';
    const expectedOccurrence = parseInt(occurrenceStr) || 0;
    
    console.log('[SuggestionManager] Finding position for:', {
      id: suggestion.id,
      matchText,
      originalText,
      expectedOccurrence,
      hasOriginalPosition: originalFrom !== undefined
    });
    
    // For contextual matches (when matchText is longer than originalText)
    // we need to find the match and then locate the original text within it
    const isContextualMatch = originalText !== matchText && originalText.length < matchText.length;
    
    doc.descendants((node, pos) => {
      if (!node.isText || !node.text || result) return;
      
      let index = -1;
      while ((index = node.text.indexOf(matchText, index + 1)) !== -1) {
        const matchStart = pos + index;
        const matchEnd = matchStart + matchText.length;
        
        // For contextual matches, find the original text within the match
        let actualFrom = matchStart;
        let actualTo = matchEnd;
        
        if (isContextualMatch) {
          const contextIndex = matchText.indexOf(originalText);
          if (contextIndex !== -1) {
            actualFrom = matchStart + contextIndex;
            actualTo = actualFrom + originalText.length;
          } else {
            // Original text not found in context, skip this match
            continue;
          }
        }
        
        console.log('[SuggestionManager] Found potential match:', {
          occurrenceCount,
          expectedOccurrence,
          matchStart,
          matchEnd,
          actualFrom,
          actualTo,
          nodeText: node.text.substring(0, 50) + '...',
          isContextualMatch
        });
        
        if (occurrenceCount === expectedOccurrence) {
          result = {
            from: actualFrom,
            to: actualTo
          };
          console.log('[SuggestionManager] Found exact match at:', result);
          return false; // Stop searching
        }
        occurrenceCount++;
      }
    });
    
    if (!result) {
      console.log('[SuggestionManager] No match found:', {
        matchText,
        originalText,
        expectedOccurrence,
        totalOccurrencesChecked: occurrenceCount,
        documentPreview: doc.textContent.substring(0, 200) + '...'
      });
    }
    
    return result;
  }
} 