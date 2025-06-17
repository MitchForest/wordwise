import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Editor } from '@tiptap/react';

export interface GrammarError {
  id: string;
  message: string;
  shortMessage?: string;
  offset: number;
  length: number;
  replacements: Array<{ value: string }>;
  category: string;
  severity: 'critical' | 'warning' | 'suggestion';
}

const grammarPluginKey = new PluginKey('grammarDecoration');

export const GrammarDecorationExtension = Extension.create({
  name: 'grammarDecoration',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: grammarPluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(transaction, oldState) {
            // Check if we have grammar errors to apply
            const meta = transaction.getMeta('addGrammarErrors');
            if (meta && meta.errors) {
              const decorations = meta.errors
                .map((error: GrammarError) => {
                  try {
                    const from = error.offset;
                    const to = error.offset + error.length;
                    
                    // Ensure positions are valid
                    if (from < 0 || to > transaction.doc.content.size || from >= to) {
                      return null;
                    }
                    
                    return Decoration.inline(from, to, {
                      class: `grammar-error grammar-${error.severity}`,
                      'data-error-id': error.id,
                      'data-error-message': error.message,
                      'data-error-short': error.shortMessage || error.message,
                      title: error.shortMessage || error.message,
                    });
                  } catch (e) {
                    console.warn('Failed to create decoration for error:', error, e);
                    return null;
                  }
                })
                .filter(Boolean);
              
              return DecorationSet.create(transaction.doc, decorations);
            }
            
            // Clear decorations if requested
            if (transaction.getMeta('clearGrammarErrors')) {
              return DecorationSet.empty;
            }
            
            // Map decorations through document changes
            return oldState.map(transaction.mapping, transaction.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
          handleClick(view, pos, event) {
            // Handle clicks on grammar errors
            const target = event.target as HTMLElement;
            if (target.classList.contains('grammar-error')) {
              const errorId = target.getAttribute('data-error-id');
              const errorMessage = target.getAttribute('data-error-message');
              
              if (errorId && errorMessage) {
                // Dispatch custom event for error click
                const customEvent = new CustomEvent('grammarErrorClick', {
                  detail: { errorId, errorMessage, pos }
                });
                view.dom.dispatchEvent(customEvent);
                return true;
              }
            }
            return false;
          },
        },
      }),
    ];
  },
});

// Helper functions to apply/clear grammar errors
export function applyGrammarErrors(editor: Editor, errors: GrammarError[]) {
  if (!editor) return;
  
  const { tr } = editor.state;
  tr.setMeta('addGrammarErrors', { errors });
  editor.view.dispatch(tr);
}

export function clearGrammarErrors(editor: Editor) {
  if (!editor) return;
  
  const { tr } = editor.state;
  tr.setMeta('clearGrammarErrors', true);
  editor.view.dispatch(tr);
} 