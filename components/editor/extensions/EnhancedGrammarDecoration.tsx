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
    
    return [
      new Plugin({
        key: new PluginKey('enhancedGrammarDecoration'),
        
        state: {
          init() {
            return DecorationSet.empty;
          },
          
          apply(tr, decorationSet) {
            // Update decorations when suggestions change
            const meta = tr.getMeta('updateSuggestions');
            if (meta) {
              const suggestions = meta.suggestions || options.suggestions;
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
              
              return DecorationSet.create(tr.doc, decorations);
            }
            
            // Clear decorations if requested
            if (tr.getMeta('clearSuggestions')) {
              return DecorationSet.empty;
            }
            
            // Map decorations through document changes
            return decorationSet.map(tr.mapping, tr.doc);
          },
        },
        
        props: {
          decorations(state) {
            return this.getState(state);
          },
          
          handleDOMEvents: {
            mouseenter: (view, event) => {
              const target = event.target as HTMLElement;
              if (target.classList.contains('grammar-decoration')) {
                const suggestionId = target.getAttribute('data-suggestion-id');
                const suggestion = options.suggestions.find((s: UnifiedSuggestion) => s.id === suggestionId);
                
                if (suggestion) {
                  options.onSuggestionHover(suggestion, target);
                }
              }
              return false;
            },
            
            mouseleave: (view, event) => {
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
                const suggestion = options.suggestions.find((s: UnifiedSuggestion) => s.id === suggestionId);
                
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