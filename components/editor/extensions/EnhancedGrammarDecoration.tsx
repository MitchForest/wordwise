import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { UnifiedSuggestion } from '@/types/suggestions';

interface GrammarDecorationOptions {
  suggestions: UnifiedSuggestion[];
  onSuggestionHover: (suggestion: UnifiedSuggestion | null, element: HTMLElement | null) => void;
  onSuggestionClick: (suggestion: UnifiedSuggestion, element: HTMLElement) => void;
  onApplyFix: (suggestion: UnifiedSuggestion, fix: string) => void;
}

export const EnhancedGrammarDecoration = Extension.create<GrammarDecorationOptions>({
  name: 'enhancedGrammarDecoration',
  
  addOptions() {
    return {
      suggestions: [],
      onSuggestionHover: () => {},
      onSuggestionClick: () => {},
      onApplyFix: () => {},
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
                      class: getDecorationClass(suggestion),
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
            mouseenter: (view, event) => {
              const target = event.target as HTMLElement;
              if (target.classList.contains('grammar-decoration')) {
                const suggestionId = target.getAttribute('data-suggestion-id');
                const pluginState = pluginKey.getState(view.state);
                const suggestion = pluginState?.suggestions?.find((s: UnifiedSuggestion) => s.id === suggestionId);
                
                if (suggestion) {
                  options.onSuggestionHover(suggestion, target);
                }
              }
              return false;
            },
            
            mouseleave: (_view, event) => {
              const target = event.target as HTMLElement;
              const relatedTarget = event.relatedTarget as HTMLElement;
              
              // Don't hide hover card if moving to the hover card itself
              if (target.classList.contains('grammar-decoration') && 
                  !relatedTarget?.closest('.grammar-hover-card')) {
                options.onSuggestionHover(null, null);
              }
              return false;
            },
            
            click: (view, event) => {
              const target = event.target as HTMLElement;
              if (target.classList.contains('grammar-decoration')) {
                const suggestionId = target.getAttribute('data-suggestion-id');
                const pluginState = pluginKey.getState(view.state);
                const suggestion = pluginState?.suggestions?.find((s: UnifiedSuggestion) => s.id === suggestionId);
                
                if (suggestion) {
                  options.onSuggestionClick(suggestion, target);
                }
                return true;
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});

// Helper function for decoration class
function getDecorationClass(suggestion: UnifiedSuggestion): string {
  const baseClass = 'grammar-decoration';
  const severityClass = `grammar-${suggestion.severity}`;
  const categoryClass = `grammar-category-${suggestion.category}`;
  
  return `${baseClass} ${severityClass} ${categoryClass}`;
}

// Helper to update suggestions
export function updateSuggestions(editor: Editor, suggestions: UnifiedSuggestion[]) {
  if (!editor) return;
  
  const { tr } = editor.state;
  tr.setMeta('updateSuggestions', { suggestions });
  editor.view.dispatch(tr);
}

// Helper to clear suggestions
export function clearSuggestions(editor: Editor) {
  if (!editor) return;
  
  const { tr } = editor.state;
  tr.setMeta('clearSuggestions', true);
  editor.view.dispatch(tr);
}

// Import Editor type
import type { Editor } from '@tiptap/core';