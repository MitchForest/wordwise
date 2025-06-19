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
import { analysisCache } from '@/services/analysis/cache';

const AI_ENHANCEMENT_DELAY = 1000; // Reduced from 2000ms to 1000ms

export const useUnifiedAnalysis = (
  doc: Node | null,
  isReady: boolean,
  documentMetadata: {
    title: string;
    metaDescription: string;
    targetKeyword: string;
    keywords: string[];
  },
  documentId?: string,
  enableSEOChecks: boolean = false
) => {
  const { setMetrics, updateSuggestions, suggestions } = useSuggestions();
  const [enhancementState, setEnhancementState] = useState<'idle' | 'enhancing' | 'enhanced'>('idle');
  const [enhancedSuggestions, setEnhancedSuggestions] = useState<Map<string, EnhancedSuggestion>>(new Map());
  const enhancedSuggestionIds = useRef<Set<string>>(new Set());
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
      // Only clear SEO suggestions if SEO checks are enabled
      if (enableSEOChecks) {
        updateSuggestions(['seo'], []);
      }
      return;
    }
    try {
      const response = await fetch('/api/analysis/deep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          doc: currentDoc.toJSON(), 
          documentMetadata: metadata,
          enableSEOChecks // Pass flag to API
        }),
      });
      if (!response.ok) throw new Error(`Deep analysis request failed: ${response.status}`);
      const { suggestions, metrics } = await response.json();
      setMetrics(metrics || null);
      
      // Only update SEO suggestions if enabled
      if (enableSEOChecks) {
        updateSuggestions(['seo', 'readability'], suggestions || []);
      } else {
        // Only update non-SEO suggestions
        const nonSEOSuggestions = (suggestions || []).filter((s: UnifiedSuggestion) => 
          s.category !== 'seo'
        );
        updateSuggestions(['spelling', 'grammar', 'style'], nonSEOSuggestions);
      }
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

  // Restore enhanced suggestions from cache on mount
  useEffect(() => {
    const restoreEnhancedSuggestions = async () => {
      if (!documentId) return;
      
      const enhancedCacheKey = `enhanced-suggestions-${documentId}`;
      const cached = await analysisCache.getAsync<EnhancedSuggestion[]>(enhancedCacheKey);
      
      if (cached && cached.length > 0) {
        console.log('[AI Enhancement] Restored enhanced suggestions from cache:', cached.length);
        
        // Restore enhanced suggestions map
        const restoredMap = new Map<string, EnhancedSuggestion>();
        cached.forEach(s => {
          restoredMap.set(s.id, s);
          enhancedSuggestionIds.current.add(s.id);
        });
        
        setEnhancedSuggestions(restoredMap);
        setEnhancementState('enhanced');
      }
    };
    
    restoreEnhancedSuggestions();
  }, [documentId]);

  // Immediate AI Enhancement for new suggestions
  const enhanceNewSuggestions = useCallback(async (currentDoc: Node, allSuggestions: UnifiedSuggestion[]) => {
    // Filter out suggestions that have already been enhanced
    const newSuggestions = allSuggestions.filter(s => !enhancedSuggestionIds.current.has(s.id));
    
    if (newSuggestions.length === 0) {
      console.log('[AI Enhancement] No new suggestions to enhance');
      return;
    }

    console.log('[AI Enhancement] Enhancing new suggestions immediately:', {
      newCount: newSuggestions.length,
      newIds: newSuggestions.map(s => s.id)
    });

    // Mark these as being enhanced
    newSuggestions.forEach(s => enhancedSuggestionIds.current.add(s.id));
    
    try {
      const response = await fetch('/api/analysis/ai-enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestions: newSuggestions,
          doc: currentDoc.toJSON(),
          metadata: {
            title: documentMetadata.title,
            targetKeyword: documentMetadata.targetKeyword,
            metaDescription: documentMetadata.metaDescription,
            keywords: documentMetadata.keywords
          }
        })
      });
      
      if (response.ok) {
        const { enhanced } = await response.json();
        
        console.log('[AI Enhancement] Enhanced new suggestions:', {
          total: enhanced.length,
          withAIFixes: enhanced.filter((s: EnhancedSuggestion) => s.aiFix).length
        });
        
        // Merge with existing enhanced suggestions
        const newEnhancedMap = new Map(enhancedSuggestions);
        enhanced.forEach((s: EnhancedSuggestion) => {
          newEnhancedMap.set(s.id, s);
        });
        
        setEnhancedSuggestions(newEnhancedMap);
        
        // Persist to cache if documentId is available
        if (documentId) {
          const enhancedCacheKey = `enhanced-suggestions-${documentId}`;
          const allEnhanced = Array.from(newEnhancedMap.values());
          await analysisCache.setAsync(enhancedCacheKey, allEnhanced, 3600); // 1 hour TTL
          console.log('[AI Enhancement] Persisted enhanced suggestions to cache');
        }
        
        // Update only the new suggestions in the UI
        const updatedSuggestions = allSuggestions.map(s => {
          const enhanced = newEnhancedMap.get(s.id);
          return enhanced || s;
        });
        
        updateSuggestions(['spelling', 'grammar', 'style', 'seo'], updatedSuggestions);
      }
    } catch (error) {
      console.error('[AI Enhancement] Error enhancing new suggestions:', error);
      // Remove failed IDs so they can be retried
      newSuggestions.forEach(s => enhancedSuggestionIds.current.delete(s.id));
    }
  }, [enhancedSuggestions, updateSuggestions, documentMetadata, documentId]);

  // Delayed AI Enhancement for finding additional errors
  const debouncedAdditionalErrorDetection = useDebouncedCallback(async (currentDoc) => {
    if (!isReady || !currentDoc || currentDoc.textContent.trim().length < 10) {
      return;
    }

    console.log('[AI Enhancement] Looking for additional errors missed by local checkers');
    
    try {
      // This will be a new endpoint that uses AI to find errors not caught by local analysis
      const response = await fetch('/api/analysis/ai-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc: currentDoc.toJSON(),
          metadata: documentMetadata,
          existingSuggestionIds: Array.from(enhancedSuggestionIds.current)
        })
      });
      
      if (response.ok) {
        const { additionalSuggestions } = await response.json();
        if (additionalSuggestions && additionalSuggestions.length > 0) {
          console.log('[AI Enhancement] Found additional errors:', additionalSuggestions.length);
          // Merge with existing suggestions instead of using 'ai' category
          const currentSuggestions = [...suggestions, ...additionalSuggestions];
          updateSuggestions(['spelling', 'grammar', 'style', 'seo'], currentSuggestions);
        }
      }
    } catch (error) {
      console.error('[AI Enhancement] Error detecting additional errors:', error);
    }
  }, 3000); // 3 second delay for additional error detection

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

  // Manual SEO analysis trigger
  const runSEOAnalysis = useCallback(() => {
    if (doc && isReady) {
      console.log('[SEO Analysis] Manual trigger');
      debouncedDeepAnalysis(doc, documentMetadata);
    }
  }, [doc, isReady, documentMetadata, debouncedDeepAnalysis]);

  // Watch for new suggestions and enhance them immediately
  useEffect(() => {
    if (!doc || !isReady || suggestions.length === 0) {
      return;
    }

    // Enhance new suggestions immediately
    enhanceNewSuggestions(doc, suggestions);
  }, [suggestions, doc, isReady, enhanceNewSuggestions]);

  // Trigger additional error detection on document changes
  useEffect(() => {
    if (!doc || !isReady) {
      return;
    }

    debouncedAdditionalErrorDetection(doc);
  }, [doc, isReady, debouncedAdditionalErrorDetection]);

  // Clean up enhanced IDs when suggestions are removed
  useEffect(() => {
    const currentSuggestionIds = new Set(suggestions.map(s => s.id));
    const enhancedIds = Array.from(enhancedSuggestionIds.current);
    
    enhancedIds.forEach(id => {
      if (!currentSuggestionIds.has(id)) {
        enhancedSuggestionIds.current.delete(id);
      }
    });
  }, [suggestions]);

  // Main effect to orchestrate all checks
  useEffect(() => {
    if (enableSEOChecks) {
      debouncedDeepAnalysis(doc, documentMetadata);
    }
    debouncedFastAnalysis(doc);
  }, [doc, JSON.stringify(documentMetadata), debouncedDeepAnalysis, debouncedFastAnalysis, enableSEOChecks]);

  // We return the real-time checker so it can be called by the editor
  return { 
    runRealtimeSpellCheck, 
    debouncedFastAnalysis,
    runSEOAnalysis,
    enhancementState,
    enhancedSuggestions
  };
}; 