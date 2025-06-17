'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { useDebouncedCallback } from 'use-debounce';

export function useAutoSave(editor: Editor | null, documentId: string) {
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const lastSavedContent = useRef<string>('');
  const currentTitle = useRef<string>('');
  const currentMeta = useRef<string>('');

  // Local save (immediate)
  const saveToLocal = useCallback((content: any, title: string, meta: string) => {
    const saveData = {
      content,
      title,
      metaDescription: meta,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(`doc_${documentId}_draft`, JSON.stringify(saveData));
  }, [documentId]);

  // Database save (debounced) - using API route
  const saveToDatabase = useDebouncedCallback(async (
    content: any,
    plainText: string,
    title: string,
    metaDescription: string
  ) => {
    setSaveState('saving');

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          plainText,
          title,
          metaDescription,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save document');
      }

      setSaveState('saved');
      setLastSaved(new Date());
      lastSavedContent.current = JSON.stringify(content);
      
      // Clear local draft after successful save
      localStorage.removeItem(`doc_${documentId}_draft`);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setSaveState('error');
      
      // Reset to saved state after 3 seconds if error
      setTimeout(() => setSaveState('saved'), 3000);
    }
  }, 2000); // 2 second debounce

  // Handle content changes
  const handleContentChange = useCallback((content: any, plainText: string) => {
    // Only save if content actually changed
    if (JSON.stringify(content) !== lastSavedContent.current) {
      saveToLocal(content, currentTitle.current, currentMeta.current);
      saveToDatabase(content, plainText, currentTitle.current, currentMeta.current);
    }
  }, [saveToLocal, saveToDatabase]);

  // Handle title changes
  const handleTitleChange = useCallback((title: string) => {
    currentTitle.current = title;
    if (editor) {
      const content = editor.getJSON();
      const plainText = editor.getText();
      saveToLocal(content, title, currentMeta.current);
      saveToDatabase(content, plainText, title, currentMeta.current);
    }
  }, [editor, saveToLocal, saveToDatabase]);

  // Handle meta description changes
  const handleMetaChange = useCallback((meta: string) => {
    currentMeta.current = meta;
    if (editor) {
      const content = editor.getJSON();
      const plainText = editor.getText();
      saveToLocal(content, currentTitle.current, meta);
      saveToDatabase(content, plainText, currentTitle.current, meta);
    }
  }, [editor, saveToLocal, saveToDatabase]);

  return { 
    saveState, 
    lastSaved, 
    handleContentChange, 
    handleTitleChange, 
    handleMetaChange 
  };
} 