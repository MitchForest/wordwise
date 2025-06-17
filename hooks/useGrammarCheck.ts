'use client';

import { useEffect, useState, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { useDebouncedCallback } from 'use-debounce';
import { LanguageToolService } from '@/services/languagetool';
import { applyGrammarErrors, clearGrammarErrors, type GrammarError } from '@/components/editor/extensions/GrammarDecoration';

export function useGrammarCheck(editor: Editor | null) {
  const [errors, setErrors] = useState<GrammarError[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [contextMenuError, setContextMenuError] = useState<{
    error: GrammarError;
    position: { x: number; y: number };
  } | null>(null);

  const checkGrammar = useDebouncedCallback(async (text: string) => {
    if (!text || text.length < 10) {
      setErrors([]);
      if (editor) {
        clearGrammarErrors(editor);
      }
      return;
    }

    setIsChecking(true);
    try {
      const languageTool = new LanguageToolService();
      const grammarErrors = await languageTool.check(text);
      
      setErrors(grammarErrors);
      
      // Apply decorations to editor
      if (editor && grammarErrors.length > 0) {
        applyGrammarErrors(editor, grammarErrors);
      } else if (editor) {
        clearGrammarErrors(editor);
      }
    } catch (error) {
      console.error('Grammar check failed:', error);
      setErrors([]);
      if (editor) {
        clearGrammarErrors(editor);
      }
    } finally {
      setIsChecking(false);
    }
  }, 2000); // 2 second debounce

  useEffect(() => {
    if (!editor) return;

    const text = editor.getText();
    checkGrammar(text);
  }, [editor?.state.doc, checkGrammar]);

  // Apply grammar fix
  const applyFix = useCallback((errorId: string, replacement: string) => {
    if (!editor) return;
    
    const error = errors.find(e => e.id === errorId);
    if (!error) return;
    
    const from = error.offset;
    const to = error.offset + error.length;
    
    editor.chain()
      .focus()
      .setTextSelection({ from, to })
      .insertContent(replacement)
      .run();
      
    // Hide context menu
    setContextMenuError(null);
  }, [editor, errors]);

  // Listen for grammar error clicks
  useEffect(() => {
    if (!editor) return;

    const handleGrammarErrorClick = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { errorId, errorMessage, pos } = customEvent.detail;
      
      const error = errors.find(e => e.id === errorId);
      if (error) {
        // Get click position
        const rect = editor.view.dom.getBoundingClientRect();
        const coords = editor.view.coordsAtPos(pos);
        
        setContextMenuError({
          error,
          position: {
            x: coords.left,
            y: coords.bottom + 5,
          },
        });
      }
    };

    editor.view.dom.addEventListener('grammarErrorClick', handleGrammarErrorClick);
    
    return () => {
      editor.view.dom.removeEventListener('grammarErrorClick', handleGrammarErrorClick);
    };
  }, [editor, errors]);

  // Click outside to close context menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.grammar-context-menu')) {
        setContextMenuError(null);
      }
    };

    if (contextMenuError) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [contextMenuError]);

  return { 
    errors, 
    isChecking,
    contextMenuError,
    applyFix,
    hideContextMenu: () => setContextMenuError(null),
  };
} 