/**
 * @file hooks/useUnifiedAnalysis.ts
 * @purpose This hook is the client-side bridge to the analysis API. It uses a
 * multi-tiered debounce strategy to provide responsive feedback. Real-time
 * spell checks are sent instantly, fast checks (style, grammar) are sent after
 * a short delay, and deep metric analysis is sent after a longer delay.
 * @modified 2024-12-28 - Integrated retext for client-side analysis
 */
'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useSuggestions } from '@/contexts/SuggestionContext';
import { Node } from '@tiptap/pm/model';
import { toast } from 'sonner';
import { EnhancedSuggestion, UnifiedSuggestion } from '@/types/suggestions';
import { analysisCache } from '@/services/analysis/cache';
import { useRetextAnalysis } from './useRetextAnalysis';
import { SuggestionDeduplicator } from '@/services/analysis/suggestion-deduplicator';
import { AIQueueManager } from '@/services/ai/ai-queue-manager';

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
  const aiQueueManager = useRef<AIQueueManager>(new AIQueueManager());
  
  // RETEXT: Get client-side analysis results
  const { 
    allSuggestions: retextSuggestions, 
    fallbackToServer,
    isProcessing: retextProcessing 
  } = useRetextAnalysis(doc, isReady);
  
  const [serverSuggestions, setServerSuggestions] = useState<UnifiedSuggestion[]>([]);

  // Helper to generate a simple hash of document content
  const getDocHash = useCallback((doc: Node | null): string => {
    if (!doc) return '';
    return doc.textContent.slice(0, 100) + doc.textContent.length;
  }, []);
  
  // Set up AI Queue Manager callback
  useEffect(() => {
    aiQueueManager.current.setUpdateCallback((enhanced: EnhancedSuggestion[]) => {
      setEnhancementState('enhanced');
      
      // Update enhanced suggestions map
      const newMap = new Map(enhancedSuggestions);
      enhanced.forEach(s => {
        newMap.set(s.id, s);
        enhancedSuggestionIds.current.add(s.id);
      });
      setEnhancedSuggestions(newMap);
      
      // Persist to cache
      if (documentId) {
        const enhancedCacheKey = `enhanced-suggestions-${documentId}`;
        const allEnhanced = Array.from(newMap.values());
        analysisCache.setAsync(enhancedCacheKey, allEnhanced, 3600);
      }
      
      // Trigger re-deduplication
      deduplicateAndUpdate();
    });
  }, [documentId, enhancedSuggestions]);

  // Immediate check to clear suggestions if the document is empty
  useEffect(() => {
    if (isReady && (!doc || doc.textContent.trim().length === 0)) {
      updateSuggestions(['spelling', 'grammar', 'style', 'seo', 'readability'], []);
      setMetrics(null);
      setEnhancementState('idle');
      setEnhancedSuggestions(new Map());
      aiQueueManager.current.clear();
    }
  }, [doc, isReady, updateSuggestions, setMetrics]);

  // Tier 3 (Real-time): Live Word Count
  useEffect(() => {
    if (!doc) return;
    const text = doc.textContent.trim();
    const wordCount = text.length > 0 ? text.split(/\s+/).length : 0;
    setMetrics({ wordCount });
  }, [doc, setMetrics]);

  // Deduplicate and update suggestions
  const deduplicateAndUpdate = useCallback(() => {
    // Get all enhanced suggestions as array
    const enhancedArray = Array.from(enhancedSuggestions.values());
    
    // Deduplicate: Client (retext) < Server < AI Enhanced
    const deduplicated = SuggestionDeduplicator.deduplicate(
      retextSuggestions,
      serverSuggestions,
      enhancedArray
    );
    
    // Merge document-wide suggestions (SEO)
    const documentWide = SuggestionDeduplicator.mergeDocumentWideSuggestions([
      ...retextSuggestions,
      ...serverSuggestions,
      ...enhancedArray
    ]);
    
    const allSuggestions = [...deduplicated, ...documentWide];
    
    console.log('[Deduplication] Results:', {
      retext: retextSuggestions.length,
      server: serverSuggestions.length,
      enhanced: enhancedArray.length,
      final: allSuggestions.length
    });
    
    updateSuggestions(['spelling', 'grammar', 'style', 'seo', 'readability'], allSuggestions);
  }, [retextSuggestions, serverSuggestions, enhancedSuggestions, updateSuggestions]);

  // Tier 2: Deep Analysis (Metrics, SEO) - Long debounce
  const debouncedDeepAnalysis = useDebouncedCallback(async (currentDoc, metadata) => {
    if (!isReady || !currentDoc || currentDoc.textContent.trim().length < 5) {
      setMetrics(null);
      // Only clear SEO suggestions if SEO checks are enabled
      if (enableSEOChecks) {
        setServerSuggestions(prev => prev.filter(s => s.category !== 'seo'));
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
      if (enableSEOChecks && suggestions) {
        const seoSuggestions = suggestions.filter((s: UnifiedSuggestion) => s.category === 'seo');
        setServerSuggestions(prev => {
          const nonSEO = prev.filter(s => s.category !== 'seo');
          return [...nonSEO, ...seoSuggestions];
        });
      }
    } catch (error) {
      console.error('Failed to fetch deep analysis:', error);
      toast.error('Deep analysis service is unavailable.');
    }
  }, 800);

  // Tier 1: Fast Analysis - Only if retext fails
  const debouncedFastAnalysis = useDebouncedCallback(async (currentDoc) => {
    console.log('[useUnifiedAnalysis] Fast analysis called, fallback:', fallbackToServer);
    
    // Skip if retext is working
    if (!fallbackToServer) {
      console.log('[useUnifiedAnalysis] Skipping server analysis - retext is working');
      return;
    }
    
    if (!isReady || !currentDoc || currentDoc.textContent.trim().length < 2) {
      setServerSuggestions([]);
      return;
    }
    
    try {
      console.log('[useUnifiedAnalysis] Fetching server analysis (retext fallback)...');
      const response = await fetch('/api/analysis/fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc: currentDoc.toJSON() }),
      });
      if (!response.ok) throw new Error(`Fast analysis request failed: ${response.status}`);
      const { suggestions } = await response.json();
      
      setServerSuggestions(suggestions || []);
    } catch (error) {
      console.error('Failed to fetch fast analysis:', error);
      toast.error('Analysis service is unavailable.');
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

  // Queue suggestions for AI enhancement
  useEffect(() => {
    const allCurrentSuggestions = [...retextSuggestions, ...serverSuggestions];
    if (allCurrentSuggestions.length > 0) {
      aiQueueManager.current.enqueueSuggestions(allCurrentSuggestions);
    }
  }, [retextSuggestions, serverSuggestions]);

  // Trigger deduplication when any suggestions change
  useEffect(() => {
    deduplicateAndUpdate();
  }, [retextSuggestions, serverSuggestions, enhancedSuggestions, deduplicateAndUpdate]);

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
          // Add to server suggestions (they'll be deduplicated)
          setServerSuggestions(prev => [...prev, ...additionalSuggestions]);
        }
      }
    } catch (error) {
      console.error('[AI Enhancement] Error detecting additional errors:', error);
    }
  }, 3000); // 3 second delay for additional error detection

  // Tier 0: Real-time Spell Check - Now handled by retext
  const runRealtimeSpellCheck = useCallback(async (word: string, currentDoc: Node) => {
    // This is now a no-op since retext handles spell checking
    console.log('[useUnifiedAnalysis] Real-time spell check called (handled by retext)');
  }, []);

  // Manual SEO analysis trigger
  const runSEOAnalysis = useCallback(() => {
    if (doc && isReady) {
      console.log('[SEO Analysis] Manual trigger');
      debouncedDeepAnalysis(doc, documentMetadata);
    }
  }, [doc, isReady, documentMetadata, debouncedDeepAnalysis]);

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
    // Only run server analysis if retext fails
    if (fallbackToServer) {
      debouncedFastAnalysis(doc);
    }
  }, [doc, JSON.stringify(documentMetadata), debouncedDeepAnalysis, debouncedFastAnalysis, enableSEOChecks, fallbackToServer]);

  // We return the real-time checker so it can be called by the editor
  return { 
    runRealtimeSpellCheck, 
    debouncedFastAnalysis,
    runSEOAnalysis,
    enhancementState,
    enhancedSuggestions,
    isProcessing: retextProcessing,
    retextFallback: fallbackToServer
  };
}; 