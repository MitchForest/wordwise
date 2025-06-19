/**
 * @file lib/editor/extensions/suggestion-tracking.ts
 * @purpose ProseMirror plugin that tracks suggestion positions through document changes.
 * Uses transaction mapping to keep positions in sync with edits.
 * @modified 2024-12-28 - Initial implementation
 */

import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { SuggestionManager } from '../suggestion-manager';

export const suggestionTrackingKey = new PluginKey('suggestionTracking');

/**
 * Create a ProseMirror plugin for tracking suggestion positions
 * @purpose Integrate SuggestionManager with ProseMirror's transaction system
 * @modified 2024-12-28 - Initial implementation
 */
export function createSuggestionTrackingPlugin(suggestionManager: SuggestionManager) {
  return new Plugin({
    key: suggestionTrackingKey,
    
    state: {
      init() {
        return { manager: suggestionManager };
      },
      
      apply(tr, value) {
        // Update positions on every transaction
        value.manager.updatePositions(tr);
        return value;
      }
    },
    
    // Provide decorations for rendering
    props: {
      decorations(state) {
        const pluginState = this.getState(state);
        if (!pluginState) return DecorationSet.empty;
        
        const { manager } = pluginState;
        const positions = manager.getPositions();
        const decorations: Decoration[] = [];
        
        positions.forEach(pos => {
          const suggestion = manager.getSuggestion(pos.suggestionId);
          if (!suggestion) return;
          
          try {
            const decoration = Decoration.inline(pos.from, pos.to, {
              class: `suggestion-${suggestion.category} suggestion-${suggestion.severity}`,
              'data-suggestion-id': suggestion.id,
              'data-category': suggestion.category,
              'data-severity': suggestion.severity,
              title: suggestion.message,
            });
            decorations.push(decoration);
          } catch (e) {
            console.warn('[SuggestionTracking] Failed to create decoration:', e);
          }
        });
        
        return DecorationSet.create(state.doc, decorations);
      },
      
      // Handle clicks on suggestions
      handleClick(view, pos, event) {
        const target = event.target as HTMLElement;
        const suggestionId = target.getAttribute('data-suggestion-id');
        
        if (suggestionId) {
          // Dispatch custom event that can be handled by React
          const customEvent = new CustomEvent('suggestion-click', {
            detail: { suggestionId },
            bubbles: true
          });
          target.dispatchEvent(customEvent);
          return true;
        }
        
        return false;
      }
    }
  });
} 