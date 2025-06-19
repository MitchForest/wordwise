/**
 * @file hooks/useRetextAnalysis.ts
 * @purpose Client-side text analysis using retext with caching and performance tracking
 * @created 2024-12-28
 */

'use client';

import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Node } from '@tiptap/pm/model';
import { UnifiedSuggestion } from '@/types/suggestions';
import { retextProcessor } from '@/services/analysis/retext-processor';
import { RetextConverter } from '@/services/analysis/retext-converter';
import { RetextCache } from '@/services/analysis/retext-cache';
import { typoSpellChecker } from '@/services/analysis/typo-spell-checker';
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
  const [grammarSuggestions, setGrammarSuggestions] = useState<UnifiedSuggestion[]>([]);
  const [styleSuggestions, setStyleSuggestions] = useState<UnifiedSuggestion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fallbackToServer, setFallbackToServer] = useState(false);
  const [isProcessorInitialized, setProcessorInitialized] = useState(false);
  const processingRef = useRef(false);
  const cache = useRef(new RetextCache());
  
  // Initialize both retext and typo spell checker on mount
  useEffect(() => {
    Promise.all([
      retextProcessor.initialize(),
      typoSpellChecker.initialize()
    ]).then(() => {
      setProcessorInitialized(true);
    }).catch((error) => {
      console.error('[Analysis] Failed to initialize, using server fallback:', error);
      setFallbackToServer(true);
    });
    
    // Cleanup on unmount
    return () => {
      retextProcessor.cleanup();
      typoSpellChecker.cleanup();
      cache.current.clear();
    };
  }, []);
  
  // Instant spell check (0ms) using Typo.js with caching
  const runSpellCheck = useCallback(async (text: string) => {
    if (!text || text.length < 2 || fallbackToServer) return;
    
    const cacheKey = cache.current.generateKey(text, 'spell');
    const cached = cache.current.get(cacheKey);
    
    if (cached) {
      setSpellingSuggestions(cached);
      return;
    }
    
    try {
      const start = performance.now();
      
      // Use Typo.js for spell checking (synchronous, browser-compatible)
      const suggestions = typoSpellChecker.analyzeText(text);
      
      const duration = performance.now() - start;
      PerformanceMetrics.trackAnalysisTime('retext', duration, suggestions.length);
      
      cache.current.set(cacheKey, suggestions);
      setSpellingSuggestions(suggestions);
    } catch (error) {
      console.error('[Typo] Spell check error:', error);
      setFallbackToServer(true);
    }
  }, [fallbackToServer]);
  
  // Grammar check using retext
  const runGrammarCheck = useCallback(async (text: string) => {
    if (!text || text.length < 5 || fallbackToServer) {
      setGrammarSuggestions([]);
      return;
    }
    
    const cacheKey = cache.current.generateKey(text, 'grammar');
    const cached = cache.current.get(cacheKey);
    
    if (cached) {
      setGrammarSuggestions(cached);
      return;
    }
    
    try {
      const start = performance.now();
      
      const messages = await retextProcessor.runGrammarCheck(text);
      const suggestions = messages.map(msg => 
        RetextConverter.messageToSuggestion(msg, text, 'grammar')
      );
      
      const duration = performance.now() - start;
      PerformanceMetrics.trackAnalysisTime('retext', duration, suggestions.length);
      
      cache.current.set(cacheKey, suggestions);
      setGrammarSuggestions(suggestions);
    } catch (error) {
      console.error('[Retext] Grammar check error:', error);
      setFallbackToServer(true);
    }
  }, [fallbackToServer]);
  
  // Create debounced style check function without dependencies
  const debouncedStyleCheck = useDebouncedCallback(async (text: string) => {
    if (!text || text.length < 10) {
      setStyleSuggestions([]);
      return;
    }
    
    try {
      setIsProcessing(true);
      const start = performance.now();
      
      const messages = await retextProcessor.runStyleCheck(text);
      const suggestions = messages.map(msg => 
        RetextConverter.messageToSuggestion(msg, text, 'style')
      );
      
      const duration = performance.now() - start;
      PerformanceMetrics.trackAnalysisTime('retext', duration, suggestions.length);
      
      setStyleSuggestions(suggestions);
    } catch (error) {
      console.error('[Retext] Style check error:', error);
      setStyleSuggestions([]);
    } finally {
      setIsProcessing(false);
    }
  }, 50, { leading: false, trailing: true });
  
  // Run checks when document changes - MINIMAL DEPENDENCIES
  useEffect(() => {
    if (!doc || !isReady || !isProcessorInitialized) return;
    
    const text = doc.textContent;
    
    // Spell check with Typo.js (instant)
    if (text && text.length >= 2) {
      try {
        const suggestions = typoSpellChecker.analyzeText(text);
        setSpellingSuggestions(suggestions);
      } catch (error) {
        console.error('[Typo] Spell check error:', error);
        setSpellingSuggestions([]);
      }
    } else {
      setSpellingSuggestions([]);
    }
    
    // Grammar check with retext (instant)
    if (text && text.length >= 5) {
      retextProcessor.runGrammarCheck(text).then(messages => {
        try {
          const suggestions = messages.map(msg => 
            RetextConverter.messageToSuggestion(msg, text, 'grammar')
          );
          setGrammarSuggestions(suggestions);
        } catch (error) {
          console.error('[Retext] Grammar check error:', error);
          setGrammarSuggestions([]);
        }
      }).catch(() => {
        setGrammarSuggestions([]);
      });
    } else {
      setGrammarSuggestions([]);
    }
    
    // Style check (debounced) - inline to avoid closure dependencies
    if (text && text.length >= 10) {
      // Clear previous timeout to debounce
      const timeoutId = setTimeout(async () => {
        try {
          setIsProcessing(true);
          const messages = await retextProcessor.runStyleCheck(text);
          const suggestions = messages.map(msg => 
            RetextConverter.messageToSuggestion(msg, text, 'style')
          );
          setStyleSuggestions(suggestions);
        } catch (error) {
          console.error('[Retext] Style check error:', error);
          setStyleSuggestions([]);
        } finally {
          setIsProcessing(false);
        }
      }, 50);
      
      // Cleanup timeout on next render
      return () => clearTimeout(timeoutId);
    } else {
      setStyleSuggestions([]);
    }
  }, [doc?.textContent, isReady, isProcessorInitialized]); // Use textContent and initialization state as dependency
  
  const allSuggestions = useMemo(() => {
    return [...spellingSuggestions, ...grammarSuggestions, ...styleSuggestions];
  }, [spellingSuggestions, grammarSuggestions, styleSuggestions]);

  return {
    spellingSuggestions,
    grammarSuggestions,
    styleSuggestions,
    allSuggestions,
    isProcessing,
    fallbackToServer
  };
} 