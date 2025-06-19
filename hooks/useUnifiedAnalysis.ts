/**
 * @file hooks/useUnifiedAnalysis.ts
 * @purpose This hook is the client-side bridge to the analysis API. It uses a
 * multi-tiered debounce strategy to provide responsive feedback. Real-time
 * spell checks are sent instantly, fast checks (style, grammar) are sent after
 * a short delay, and deep metric analysis is sent after a longer delay.
 */
'use client';

import { useEffect, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useSuggestions } from '@/contexts/SuggestionContext';
import { Node } from '@tiptap/pm/model';
import { toast } from 'sonner';

export const useUnifiedAnalysis = (
  doc: Node | null,
  isReady: boolean,
  documentMetadata: {
    title: string;
    metaDescription: string;
    targetKeyword: string;
    keywords: string[];
  }
) => {
  const { setMetrics, updateSuggestions } = useSuggestions();

  // Immediate check to clear suggestions if the document is empty
  useEffect(() => {
    if (isReady && (!doc || doc.textContent.trim().length === 0)) {
      updateSuggestions(['spelling', 'grammar', 'style', 'seo', 'readability'], []);
      setMetrics(null);
    }
  }, [doc, isReady, updateSuggestions, setMetrics]);

  // Tier 3 (Real-time): Live Word Count
  useEffect(() => {
    if (!doc) return;
    const text = doc.textContent.trim();
    const wordCount = text.length > 0 ? text.split(/\s+/).length : 0;
    setMetrics({ wordCount });
  }, [doc, setMetrics]);

  // Tier 2: Deep Analysis (Metrics, SEO) - Long debounce
  const debouncedDeepAnalysis = useDebouncedCallback(async (currentDoc, metadata) => {
    if (!isReady || !currentDoc || currentDoc.textContent.trim().length < 5) {
      setMetrics(null);
      // Also clear out any existing deep suggestions
      updateSuggestions(['seo', 'readability'], []);
      return;
    }
    try {
      const response = await fetch('/api/analysis/deep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc: currentDoc.toJSON(), documentMetadata: metadata }),
      });
      if (!response.ok) throw new Error(`Deep analysis request failed: ${response.status}`);
      const { suggestions, metrics } = await response.json();
      setMetrics(metrics || null);
      updateSuggestions(['seo', 'readability'], suggestions || []);
    } catch (error) {
      console.error('Failed to fetch deep analysis:', error);
      toast.error('Deep analysis service is unavailable.');
    }
  }, 800);

  // Tier 1: Fast Analysis (Grammar, Style, Spelling) - Short debounce
  const debouncedFastAnalysis = useDebouncedCallback(async (currentDoc) => {
    console.log('[useUnifiedAnalysis] debouncedFastAnalysis called, doc length:', currentDoc?.textContent?.length || 0);
    
    if (!isReady || !currentDoc || currentDoc.textContent.trim().length < 2) {
      // If the document is too short, clear out all fast-check categories
      console.log('[useUnifiedAnalysis] Document too short, clearing suggestions');
      updateSuggestions(['grammar', 'style', 'spelling'], []);
      return;
    }
    
    console.log('[useUnifiedAnalysis] Sending document for fast analysis:', {
      docType: currentDoc.type?.name,
      textContent: currentDoc.textContent,
      textLength: currentDoc.textContent?.length,
      preview: currentDoc.textContent.substring(0, 100) + '...'
    });
    
    try {
      console.log('[useUnifiedAnalysis] Fetching fast analysis...');
      const response = await fetch('/api/analysis/fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc: currentDoc.toJSON() }),
      });
      if (!response.ok) throw new Error(`Fast analysis request failed: ${response.status}`);
      const { suggestions } = await response.json();
      
      console.log('[useUnifiedAnalysis] Received from fast API:', {
        count: suggestions?.length || 0,
        firstSuggestion: suggestions?.[0] ? {
          id: suggestions[0].id,
          category: suggestions[0].category,
          matchText: suggestions[0].matchText,
          contextBefore: suggestions[0].contextBefore,
          contextAfter: suggestions[0].contextAfter,
          hasPosition: !!suggestions[0].position,
          message: suggestions[0].message
        } : null
      });
      
      updateSuggestions(['grammar', 'style', 'spelling'], suggestions || []);
    } catch (error) {
      console.error('Failed to fetch fast analysis:', error);
      toast.error('Fast analysis service is unavailable.');
    }
  }, 400);

  // Tier 0: Real-time Spell Check (as user types)
  const runRealtimeSpellCheck = useCallback(async (word: string, currentDoc: Node) => {
    if (!word || !currentDoc) return;
    try {
      const response = await fetch('/api/analysis/spell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, doc: currentDoc.toJSON() }),
      });
      if (!response.ok) throw new Error('Real-time spell check failed');
      const { suggestions } = await response.json();
      if (suggestions && suggestions.length > 0) {
        // Spell check should add to existing suggestions, not replace a whole category
        // Note: this part of the logic might need review, but for now we unify the function call
        updateSuggestions(['spelling'], suggestions);
      }
    } catch (error) {
      console.error('Real-time spell check error:', error);
    }
  }, [updateSuggestions]);

  // Main effect to orchestrate all checks
  useEffect(() => {
    debouncedDeepAnalysis(doc, documentMetadata);
    debouncedFastAnalysis(doc);
  }, [doc, JSON.stringify(documentMetadata), debouncedDeepAnalysis, debouncedFastAnalysis]);

  // We return the real-time checker so it can be called by the editor
  return { runRealtimeSpellCheck, debouncedFastAnalysis };
}; 