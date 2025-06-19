import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Editor } from '@tiptap/core';
import type { UnifiedSuggestion } from '@/types/suggestions';

interface GrammarDecorationOptions {
  suggestions: UnifiedSuggestion[];
  hoveredSuggestionId: string | null;
  onSuggestionClick?: (suggestion: UnifiedSuggestion) => void;
  onHover: (id: string) => void;
  onLeave: () => void;
}

export const EnhancedGrammarDecoration = Extension.create<GrammarDecorationOptions>({
  name: 'enhancedGrammarDecoration',
  
  addOptions() {
    return {
      suggestions: [],
      hoveredSuggestionId: null,
      onSuggestionClick: () => {},
      onHover: () => {},
      onLeave: () => {},
    };
  },
  
  addProseMirrorPlugins() {
    const { options } = this;
    const pluginKey = new PluginKey('enhancedGrammarDecoration');
    
    return [
      new Plugin({
        key: pluginKey,
        
        state: {
          init() {
            return { decorations: DecorationSet.empty, suggestions: [] };
          },
          
          apply(tr, value) {
            // Update decorations when suggestions change
            const meta = tr.getMeta('updateSuggestions');
            if (meta) {
              const suggestions = meta.suggestions || [];
              const decorations: Decoration[] = [];
              
              console.log('[GrammarDecoration] Updating decorations with suggestions:', suggestions.length);
              
              suggestions.forEach((suggestion: UnifiedSuggestion) => {
                // Skip SEO suggestions - they don't have text positions
                if (suggestion.category === 'seo') {
                  return;
                }
                
                // Legacy position-based suggestions
                if (suggestion.position) {
                  const position = { start: suggestion.position.start, end: suggestion.position.end };
                  
                  if (position.start < 0 || position.end > tr.doc.content.size) {
                    console.warn('[GrammarDecoration] Invalid position:', position);
                    return;
                  }
                  
                  try {
                    const decoration = Decoration.inline(
                      position.start,
                      position.end,
                      {
                        class: `suggestion-${suggestion.category} suggestion-${suggestion.severity}`,
                        'data-suggestion-id': suggestion.id,
                        'data-category': suggestion.category,
                        'data-severity': suggestion.severity,
                        title: suggestion.message,
                      },
                      {
                        inclusiveStart: false,
                        inclusiveEnd: false,
                      }
                    );
                    decorations.push(decoration);
                  } catch (error) {
                    console.warn('Failed to create decoration:', error);
                  }
                }
              });
              
              console.log('[GrammarDecoration] Created decorations:', decorations.length);
              
              return { 
                decorations: DecorationSet.create(tr.doc, decorations),
                suggestions: suggestions
              };
            }
            
            // Clear decorations if requested
            if (tr.getMeta('clearSuggestions')) {
              console.log('[GrammarDecoration] Clearing all decorations');
              return { decorations: DecorationSet.empty, suggestions: [] };
            }
            
            // Map decorations through document changes
            return {
              decorations: value.decorations.map(tr.mapping, tr.doc),
              suggestions: value.suggestions
            };
          },
        },
        
        props: {
          decorations(state) {
            const pluginState = pluginKey.getState(state);
            return pluginState?.decorations || DecorationSet.empty;
          },
          
          handleDOMEvents: {
            click: (view, event) => {
              const target = event.target as HTMLElement;
              const suggestionId = target.getAttribute('data-suggestion-id');
              if (target.matches('[data-suggestion-id]')) {
                const pluginState = pluginKey.getState(view.state);
                const suggestion = pluginState?.suggestions.find(
                  (s: UnifiedSuggestion) => s.id === suggestionId,
                );

                if (suggestion && options.onSuggestionClick) {
                  options.onSuggestionClick(suggestion);
                  return true;
                }
              }
              return false;
            },
            mouseover: (view, event) => {
              const target = event.target as HTMLElement;
              if (target.matches('[data-suggestion-id]')) {
                const suggestionId = target.getAttribute('data-suggestion-id');
                if (suggestionId) {
                  options.onHover(suggestionId);
                }
              }
              return false;
            },
            mouseout: (view, event) => {
              const target = event.target as HTMLElement;
              if (target.matches('[data-suggestion-id]')) {
                options.onLeave();
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});

// Helper function to update suggestions
export function updateSuggestions(editor: Editor, suggestions: UnifiedSuggestion[]) {
  editor.chain()
    .command(({ tr }) => {
      tr.setMeta('updateSuggestions', { suggestions });
      return true;
    })
    .run();
}

// Helper function to clear suggestions
export function clearSuggestions(editor: Editor) {
  editor.chain()
    .command(({ tr }) => {
      tr.setMeta('clearSuggestions', true);
      return true;
    })
    .run();
}
