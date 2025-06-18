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
    const options = this.options;
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
              
              suggestions.forEach((suggestion: UnifiedSuggestion) => {
                if (suggestion.position && suggestion.position.start !== undefined) {
                  try {
                    const from = suggestion.position.start;
                    const to = suggestion.position.end || suggestion.position.start + 1;
                    
                    // Validate positions
                    if (from < 0 || to > tr.doc.content.size || from >= to) {
                      return;
                    }
                    
                    const decoration = Decoration.inline(from, to, {
                      class: getDecorationClass(suggestion, options.hoveredSuggestionId),
                      'data-suggestion-id': suggestion.id,
                      'data-suggestion-category': suggestion.category,
                      'data-suggestion-severity': suggestion.severity,
                      title: suggestion.message,
                    });
                    
                    decorations.push(decoration);
                  } catch (error) {
                    console.warn('Failed to create decoration:', error);
                  }
                }
              });
              
              return { 
                decorations: DecorationSet.create(tr.doc, decorations),
                suggestions: suggestions
              };
            }
            
            // Clear decorations if requested
            if (tr.getMeta('clearSuggestions')) {
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
              if (target.classList.contains('grammar-decoration')) {
                const suggestionId = target.getAttribute('data-suggestion-id');
                const pluginState = pluginKey.getState(view.state);
                const suggestion = pluginState?.suggestions.find(
                  (s: UnifiedSuggestion) => s.id === suggestionId
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
              if (target.classList.contains('grammar-decoration')) {
                const suggestionId = target.getAttribute('data-suggestion-id');
                if (suggestionId) {
                  options.onHover(suggestionId);
                }
              }
              return false;
            },
            mouseout: (view, event) => {
              const target = event.target as HTMLElement;
              if (target.classList.contains('grammar-decoration')) {
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

// Get decoration class based on severity and category
function getDecorationClass(suggestion: UnifiedSuggestion, hoveredId: string | null): string {
  const baseClass = 'grammar-decoration';
  const categoryClass = `grammar-${suggestion.category}`;
  const isHovered = suggestion.id === hoveredId;
  
  // No severity class for now to simplify, can be added back later.
  // const severityClass = `grammar-${suggestion.severity}`;
  
  let finalClass = `${baseClass} ${categoryClass}`;
  if (isHovered) {
    finalClass += ' bg-muted';
  }
  
  return finalClass;
}