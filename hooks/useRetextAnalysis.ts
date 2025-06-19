/**
 * @file hooks/useRetextAnalysis.ts
 * @purpose Client-side text analysis using retext with caching and performance tracking
 * @created 2024-12-28
 */

'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Node } from '@tiptap/pm/model';
import { UnifiedSuggestion } from '@/types/suggestions';
import { retextProcessor } from '@/services/analysis/retext-processor';
import { RetextConverter } from '@/services/analysis/retext-converter';
import { RetextCache } from '@/services/analysis/retext-cache';
import { PerformanceMetrics } from '@/services/analytics/performance-metrics';
import React from 'react';

// Error boundary for graceful degradation
export class RetextErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: () => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error) {
    console.error('[Retext] Crashed, falling back to server:', error);
    this.props.onError?.();
  }
  
  render() {
    if (this.state.hasError) {
      return null; // Fallback to server-side analysis
    }
    return this.props.children;
  }
}

export function useRetextAnalysis(
  doc: Node | null,
  isReady: boolean
) {
  const [spellingSuggestions, setSpellingSuggestions] = useState<UnifiedSuggestion[]>([]);
  const [styleSuggestions, setStyleSuggestions] = useState<UnifiedSuggestion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fallbackToServer, setFallbackToServer] = useState(false);
  const processingRef = useRef(false);
  const cache = useRef(new RetextCache());
  
  // Initialize retext on mount
  useEffect(() => {
    retextProcessor.initialize().catch(() => {
      console.error('[Retext] Failed to initialize, using server fallback');
      setFallbackToServer(true);
    });
    
    // Cleanup on unmount
    return () => {
      retextProcessor.cleanup();
      cache.current.clear();
    };
  }, []);
  
  // Instant spell check (0ms) with caching
  const runSpellCheck = useCallback(async (text: string) => {
    if (!text || text.length < 2 || processingRef.current || fallbackToServer) return;
    
    const cacheKey = cache.current.generateKey(text, 'spell');
    const cached = cache.current.get(cacheKey);
    
    if (cached) {
      setSpellingSuggestions(cached);
      return;
    }
    
    try {
      processingRef.current = true;
      const start = performance.now();
      
      const messages = await retextProcessor.runSpellCheck(text);
      const suggestions = messages.map(msg => 
        RetextConverter.messageToSuggestion(msg, text, 'spelling')
      );
      
      const duration = performance.now() - start;
      PerformanceMetrics.trackAnalysisTime('retext', duration, suggestions.length);
      
      cache.current.set(cacheKey, suggestions);
      setSpellingSuggestions(suggestions);
    } catch (error) {
      console.error('[Retext] Spell check error:', error);
      setFallbackToServer(true);
    } finally {
      processingRef.current = false;
    }
  }, [fallbackToServer]);
  
  // Debounced style check (50ms) with caching
  const debouncedStyleCheck = useDebouncedCallback(async (text: string) => {
    if (!text || text.length < 10 || fallbackToServer) {
      setStyleSuggestions([]);
      return;
    }
    
    const cacheKey = cache.current.generateKey(text, 'style');
    const cached = cache.current.get(cacheKey);
    
    if (cached) {
      setStyleSuggestions(cached);
      return;
    }
    
    try {
      setIsProcessing(true);
      const start = performance.now();
      
      const messages = await retextProcessor.runStyleCheck(text);
      const suggestions = messages.map(msg => 
        RetextConverter.messageToSuggestion(msg, text)
      );
      
      const duration = performance.now() - start;
      PerformanceMetrics.trackAnalysisTime('retext', duration, suggestions.length);
      
      cache.current.set(cacheKey, suggestions);
      setStyleSuggestions(suggestions);
    } catch (error) {
      console.error('[Retext] Style check error:', error);
      setFallbackToServer(true);
    } finally {
      setIsProcessing(false);
    }
  }, 50);
  
  // Run checks when document changes
  useEffect(() => {
    if (!doc || !isReady) return;
    
    const text = doc.textContent;
    
    // Run instant spell check
    runSpellCheck(text);
    
    // Run debounced style check
    debouncedStyleCheck(text);
  }, [doc, isReady, runSpellCheck, debouncedStyleCheck]);
  
  return {
    spellingSuggestions,
    styleSuggestions,
    allSuggestions: [...spellingSuggestions, ...styleSuggestions],
    isProcessing,
    fallbackToServer
  };
} 