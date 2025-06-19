/**
 * @file hooks/useUnifiedAnalysis.ts
 * @purpose This hook is the client-side bridge to the analysis API. It uses a
 * multi-tiered debounce strategy to provide responsive feedback. Real-time
 * spell checks are sent instantly, fast checks (style, grammar) are sent after
 * a short delay, and deep metric analysis is sent after a longer delay.
 * @modified 2024-12-28 - Added AI enhancement tier with 2-second debounce
 */
'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useSuggestions } from '@/contexts/SuggestionContext';
import { Node } from '@tiptap/pm/model';
import { toast } from 'sonner';
import { EnhancedSuggestion, UnifiedSuggestion } from '@/types/suggestions';

const AI_ENHANCEMENT_DELAY = 2000; // 2 seconds after user stops typing

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
  const { setMetrics, updateSuggestions, suggestions } = useSuggestions();
  const [enhancementState, setEnhancementState] = useState<'idle' | 'enhancing' | 'enhanced'>('idle');
  const [enhancedSuggestions, setEnhancedSuggestions] = useState<Map<string, EnhancedSuggestion>>(new Map());
  const aiEnhancementTimer = useRef<NodeJS.Timeout | null>(null);
  const lastEnhancedDocHash = useRef<string>('');

  // Helper to generate a simple hash of document content
  const getDocHash = useCallback((doc: Node | null): string => {
    if (!doc) return '';
    return doc.textContent.slice(0, 100) + doc.textContent.length;
  }, []);

  // Immediate check to clear suggestions if the document is empty
  useEffect(() => {
    if (isReady && (!doc || doc.textContent.trim().length === 0)) {
      updateSuggestions(['spelling', 'grammar', 'style', 'seo', 'readability'], []);
      setMetrics(null);
      setEnhancementState('idle');
      setEnhancedSuggestions(new Map());
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

  // Tier 4: AI Enhancement - 2 second debounce
  const debouncedAIEnhancement = useDebouncedCallback(async (currentDoc, currentSuggestions) => {
    if (!isReady || !currentDoc || currentSuggestions.length === 0) {
      console.log('[AI Enhancement] Skipping - no suggestions to enhance');
      return;
    }

    // Check if document has changed significantly since last enhancement
    const currentHash = getDocHash(currentDoc);
    if (currentHash === lastEnhancedDocHash.current && enhancementState === 'enhanced') {
      console.log('[AI Enhancement] Skipping - document unchanged since last enhancement');
      return;
    }

    console.log('[AI Enhancement] Starting enhancement after 2s delay', {
      suggestionCount: currentSuggestions.length,
      categories: [...new Set(currentSuggestions.map((s: UnifiedSuggestion) => s.category))],
      documentLength: currentDoc.textContent.length
    });
    setEnhancementState('enhancing');
    
    // Update suggestions to show enhancing state
    const enhancingSuggestions = currentSuggestions.map((s: UnifiedSuggestion) => ({ 
      ...s, 
      isEnhancing: true 
    } as EnhancedSuggestion));
    updateSuggestions(['spelling', 'grammar', 'style', 'seo'], enhancingSuggestions);
    
    try {
      const response = await fetch('/api/analysis/ai-enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestions: currentSuggestions,
          doc: currentDoc.toJSON(),
          metadata: {
            title: documentMetadata.title,
            targetKeyword: documentMetadata.targetKeyword
          }
        })
      });
      
      if (response.ok) {
        const { enhanced } = await response.json();
        
        console.log('[AI Enhancement] Received enhanced suggestions:', {
          total: enhanced.length,
          withAIFixes: enhanced.filter((s: EnhancedSuggestion) => s.aiFix).length,
          highConfidence: enhanced.filter((s: EnhancedSuggestion) => (s.aiConfidence || 0) > 0.8).length
        });
        
        // Create map of enhanced suggestions
        const enhancedMap = new Map<string, EnhancedSuggestion>(
          enhanced.map((s: EnhancedSuggestion) => [s.id, s])
        );
        
        setEnhancedSuggestions(enhancedMap);
        
        // Update suggestions with enhancements (remove enhancing state)
        const finalEnhanced = enhanced.map((s: EnhancedSuggestion) => ({ 
          ...s, 
          isEnhancing: false 
        }));
        
        updateSuggestions(['spelling', 'grammar', 'style', 'seo'], finalEnhanced);
        setEnhancementState('enhanced');
        lastEnhancedDocHash.current = currentHash;
      } else if (response.status === 429) {
        console.log('[AI Enhancement] Daily limit reached');
        toast.error('Daily AI enhancement limit reached');
        setEnhancementState('idle');
        
        // Remove enhancing state
        const normalSuggestions = currentSuggestions.map((s: UnifiedSuggestion) => ({ 
          ...s, 
          isEnhancing: false 
        }));
        updateSuggestions(['spelling', 'grammar', 'style', 'seo'], normalSuggestions);
      }
    } catch (error) {
      console.error('[AI Enhancement] Error:', error);
      setEnhancementState('idle');
      
      // Remove enhancing state on error
      const normalSuggestions = currentSuggestions.map((s: UnifiedSuggestion) => ({ 
        ...s, 
        isEnhancing: false 
      }));
      updateSuggestions(['spelling', 'grammar', 'style', 'seo'], normalSuggestions);
    }
  }, AI_ENHANCEMENT_DELAY);

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

  // AI Enhancement effect - triggered after suggestions change
  useEffect(() => {
    if (!doc || suggestions.length === 0) {
      if (aiEnhancementTimer.current) {
        clearTimeout(aiEnhancementTimer.current);
      }
      return;
    }

    // Clear existing timer
    if (aiEnhancementTimer.current) {
      clearTimeout(aiEnhancementTimer.current);
    }

    // Don't enhance if we're already enhancing
    if (enhancementState === 'enhancing') {
      return;
    }

    // Trigger AI enhancement
    debouncedAIEnhancement(doc, suggestions);
  }, [doc, suggestions, debouncedAIEnhancement, enhancementState]);

  // We return the real-time checker so it can be called by the editor
  return { 
    runRealtimeSpellCheck, 
    debouncedFastAnalysis,
    enhancementState,
    enhancedSuggestions
  };
}; 