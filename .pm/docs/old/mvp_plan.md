# WordWise MVP Implementation Plan

## Overview

This plan delivers a working Grammarly-like writing assistant focused on blog content optimization. The approach prioritizes core functionality first, then AI enhancement - ensuring you have a solid MVP that meets assignment requirements.

## Current Status (2025-06-17)

**Phase 1**: ✅ COMPLETE - All core services implemented
**Phase 2**: 🔧 IN PROGRESS - UI Integration (50% complete)

### Completed Features:
- ✅ Three-tier analysis engine with instant/smart/deep checks
- ✅ SpellChecker service with nspell integration
- ✅ TypoCorrector for common mistakes
- ✅ Enhanced caching with IndexedDB persistence
- ✅ EnhancedGrammarDecoration Tiptap extension
- ✅ GrammarHoverCard with fix actions
- ✅ Database migration for score fields
- ✅ Zero lint/type errors maintained

### In Progress:
- 🔧 Connecting analysis results to UI decorations
- 🔧 Ensuring all error types appear in suggestions panel
- 🔧 Real-time decoration updates
- 🔧 Testing with sample content

## Success Metrics

- **Grammar Accuracy**: 85%+ correction rate
- **Performance**: Sub-2 second response time
- **User Experience**: Seamless typing without interruption
- **SEO Integration**: Real-time keyword optimization feedback

## Current Tech Stack Analysis

### Existing Dependencies (package.json)
```json
{
  "ai": "^4.3.16",                    // Already has AI SDK
  "@ai-sdk/openai": "^1.3.22",       // OpenAI integration ready
  "@ai-sdk/react": "^1.2.12",        // React AI hooks
  
  "@tiptap/react": "^2.14.0",        // Editor framework
  "@tiptap/starter-kit": "^2.14.0",  // Basic extensions
  "@tiptap/extension-*": "...",       // Multiple extensions
  
  "drizzle-orm": "^0.44.2",          // Database ORM
  "postgres": "^3.4.7",              // Database
  "better-auth": "^1.2.9",           // Authentication
  
  "text-readability": "^1.1.1",      // Readability analysis
  "write-good": "^1.0.8",            // Style analysis
  "keyword-extractor": "^0.0.28",    // SEO keywords
  "string-similarity": "^4.0.4",     // Text comparison
  "reading-time": "^1.5.0",          // Reading time calc
  
  "use-debounce": "^10.0.5",         // Performance optimization
  "zustand": "^5.0.5",               // State management
  "framer-motion": "^12.18.1"        // Animations
}
```

### Required New Dependencies
```bash
# Grammar checking libraries
bun add nspell nspell-dictionaries en-dictionary

# Advanced performance optimization
bun add comlink web-worker

# Enhanced UI components for suggestions
bun add @floating-ui/react-dom cmdk

# Text processing utilities
bun add compromise compromise-sentences

# SEO enhancements
bun add stopword readability-text-js

# Testing utilities (dev dependencies)
bun add -D @testing-library/react @testing-library/jest-dom vitest jsdom
```

## Phase 1: Performance & Core Fixes (Weeks 1-2) ✅ COMPLETE

### 1.1 Fix Critical Performance Issues in useAnalysis Hook ✅

**Current Problem**: `hooks/useAnalysis.ts` causes excessive re-renders
**Status**: RESOLVED - Implemented useOptimizedAnalysis with three-tier debouncing

**Detailed Implementation**:

```typescript
// hooks/useOptimizedAnalysis.ts - Replace current useAnalysis
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { useDebounce } from './useDebounce';
import { AnalysisEngine } from '@/services/analysis/engine';
import { AnalysisCache } from '@/services/analysis/cache';
import type { UnifiedSuggestion, AnalysisResults } from '@/types/suggestions';

interface AnalysisConfig {
  enableInstantChecks: boolean;    // 0ms - spell check, typos
  enableSmartChecks: boolean;      // 500ms - paragraph grammar
  enableDeepChecks: boolean;       // 2000ms - full document
}

export function useOptimizedAnalysis(
  editor: Editor | null, 
  document: any,
  config: AnalysisConfig = {
    enableInstantChecks: true,
    enableSmartChecks: true,
    enableDeepChecks: true,
  }
) {
  // Stable state management
  const [analyses, setAnalyses] = useState<AnalysisResults>({});
  const [suggestions, setSuggestions] = useState<UnifiedSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState({
    instant: false,
    smart: false,
    deep: false,
  });
  
  // Text extraction with memoization
  const text = useMemo(() => editor?.getText() || '', [editor?.state]);
  const textHash = useMemo(() => hashText(text), [text]);
  
  // Three-tier debouncing
  const instantText = text; // No debounce for instant checks
  const smartText = useDebounce(text, 500); // 500ms for smart checks
  const deepText = useDebounce(text, 2000); // 2s for deep analysis
  
  // Stable service instances
  const analysisEngine = useRef(new AnalysisEngine());
  const cache = useRef(new AnalysisCache());
  
  // Instant checks: spell check, basic typos (0ms delay)
  useEffect(() => {
    if (!config.enableInstantChecks || !instantText || instantText.length < 3) return;
    
    setIsAnalyzing(prev => ({ ...prev, instant: true }));
    
    const runInstantChecks = async () => {
      try {
        const instant = await analysisEngine.current.runInstantChecks(instantText);
        
        setAnalyses(prev => ({ ...prev, instant }));
        updateSuggestions(instant, 'instant');
      } catch (error) {
        console.error('Instant check failed:', error);
      } finally {
        setIsAnalyzing(prev => ({ ...prev, instant: false }));
      }
    };
    
    runInstantChecks();
  }, [instantText, config.enableInstantChecks]);
  
  // Smart checks: paragraph grammar, quick SEO (500ms delay)
  useEffect(() => {
    if (!config.enableSmartChecks || !smartText || smartText.length < 10) return;
    
    setIsAnalyzing(prev => ({ ...prev, smart: true }));
    
    const runSmartChecks = async () => {
      try {
        // Check cache first
        const cacheKey = `smart-${textHash}`;
        let smart = cache.current.get(cacheKey);
        
        if (!smart) {
          smart = await analysisEngine.current.runSmartChecks({
            text: smartText,
            document,
            currentParagraph: getCurrentParagraph(editor),
          });
          cache.current.set(cacheKey, smart, 300); // 5 min cache
        }
        
        setAnalyses(prev => ({ ...prev, smart }));
        updateSuggestions(smart, 'smart');
      } catch (error) {
        console.error('Smart check failed:', error);
      } finally {
        setIsAnalyzing(prev => ({ ...prev, smart: false }));
      }
    };
    
    runSmartChecks();
  }, [smartText, textHash, document, config.enableSmartChecks]);
  
  // Deep checks: full document analysis (2s delay)
  useEffect(() => {
    if (!config.enableDeepChecks || !deepText || deepText.length < 50) return;
    
    setIsAnalyzing(prev => ({ ...prev, deep: true }));
    
    const runDeepChecks = async () => {
      try {
        const cacheKey = `deep-${textHash}`;
        let deep = cache.current.get(cacheKey);
        
        if (!deep) {
          deep = await analysisEngine.current.runDeepChecks({
            text: deepText,
            document,
            content: editor?.getJSON(),
          });
          cache.current.set(cacheKey, deep, 600); // 10 min cache
        }
        
        setAnalyses(prev => ({ ...prev, deep }));
        updateSuggestions(deep, 'deep');
      } catch (error) {
        console.error('Deep check failed:', error);
      } finally {
        setIsAnalyzing(prev => ({ ...prev, deep: false }));
      }
    };
    
    runDeepChecks();
  }, [deepText, textHash, document, config.enableDeepChecks]);
  
  // Suggestion management
  const updateSuggestions = useCallback((results: any, tier: string) => {
    setSuggestions(prev => {
      // Remove old suggestions from this tier
      const filtered = prev.filter(s => !s.id.startsWith(tier));
      
      // Add new suggestions
      const newSuggestions = convertToUnifiedSuggestions(results, tier);
      
      return [...filtered, ...newSuggestions];
    });
  }, []);
  
  return {
    analyses,
    suggestions,
    scores: calculateScores(analyses),
    isAnalyzing: Object.values(isAnalyzing).some(Boolean),
    forceRefresh: () => cache.current.clear(),
  };
}

// Helper functions
function hashText(text: string): string {
  return btoa(text.slice(0, 100) + text.length).replace(/[^a-zA-Z0-9]/g, '');
}

function getCurrentParagraph(editor: Editor | null): string {
  if (!editor) return '';
  
  const { from } = editor.state.selection;
  const $pos = editor.state.doc.resolve(from);
  const paragraph = $pos.parent;
  
  return paragraph.textContent || '';
}

function convertToUnifiedSuggestions(results: any, tier: string): UnifiedSuggestion[] {
  // Convert analysis results to unified suggestion format
  // Implementation details...
  return [];
}

function calculateScores(analyses: AnalysisResults): any {
  // Calculate unified scores from all analysis results
  return {
    grammar: 100,
    seo: 100,
    readability: 100,
    overall: 100,
  };
}
```

### 1.2 Three-Tier Analysis Engine Implementation ✅

```typescript
// services/analysis/engine.ts - New unified analysis engine
import { LanguageToolService } from '@/services/languagetool';
import { SEOAnalyzer } from '@/services/analysis/seo';
import { ReadabilityAnalyzer } from '@/services/analysis/readability';
import { StyleAnalyzer } from '@/services/analysis/style';
import { SpellChecker } from '@/services/analysis/spellcheck';
import { TypoCorrector } from '@/services/analysis/typos';

export class AnalysisEngine {
  private spellChecker: SpellChecker;
  private typoCorrector: TypoCorrector;
  private languageTool: LanguageToolService;
  private seoAnalyzer: SEOAnalyzer;
  private readabilityAnalyzer: ReadabilityAnalyzer;
  private styleAnalyzer: StyleAnalyzer;
  
  constructor() {
    this.spellChecker = new SpellChecker();
    this.typoCorrector = new TypoCorrector();
    this.languageTool = new LanguageToolService();
    this.seoAnalyzer = new SEOAnalyzer();
    this.readabilityAnalyzer = new ReadabilityAnalyzer();
    this.styleAnalyzer = new StyleAnalyzer();
  }
  
  // Tier 1: Instant checks (0ms) - Run on every keystroke
  async runInstantChecks(text: string) {
    const tasks = await Promise.allSettled([
      this.spellChecker.check(text),
      this.typoCorrector.check(text),
      this.checkRepeatedWords(text),
    ]);
    
    return {
      spelling: getResult(tasks[0]),
      typos: getResult(tasks[1]),
      repeatedWords: getResult(tasks[2]),
      timestamp: Date.now(),
    };
  }
  
  // Tier 2: Smart checks (500ms) - Current paragraph + quick SEO
  async runSmartChecks({ text, document, currentParagraph }: any) {
    const tasks = await Promise.allSettled([
      this.languageTool.check(currentParagraph), // Only current paragraph
      this.quickSEOCheck(document),
      this.checkSentenceClarity(currentParagraph),
    ]);
    
    return {
      paragraphGrammar: getResult(tasks[0]),
      quickSEO: getResult(tasks[1]),
      sentenceClarity: getResult(tasks[2]),
      timestamp: Date.now(),
    };
  }
  
  // Tier 3: Deep checks (2s) - Full document analysis
  async runDeepChecks({ text, document, content }: any) {
    const tasks = await Promise.allSettled([
      this.languageTool.check(text), // Full document
      this.seoAnalyzer.analyze({
        title: document.title,
        metaDescription: document.metaDescription,
        content,
        plainText: text,
        targetKeyword: document.targetKeyword,
        keywords: document.keywords,
      }),
      this.readabilityAnalyzer.analyze(text),
      this.styleAnalyzer.analyze(text),
    ]);
    
    return {
      fullGrammar: getResult(tasks[0]),
      seoAnalysis: getResult(tasks[1]),
      readability: getResult(tasks[2]),
      style: getResult(tasks[3]),
      timestamp: Date.now(),
    };
  }
  
  private async quickSEOCheck(document: any) {
    return {
      titleLength: document.title?.length || 0,
      titleOptimal: (document.title?.length || 0) >= 50 && (document.title?.length || 0) <= 60,
      hasTargetKeyword: document.title?.toLowerCase().includes(document.targetKeyword?.toLowerCase()) || false,
      metaLength: document.metaDescription?.length || 0,
      metaOptimal: (document.metaDescription?.length || 0) >= 150 && (document.metaDescription?.length || 0) <= 160,
    };
  }
  
  private async checkRepeatedWords(text: string) {
    const words = text.toLowerCase().split(/\s+/);
    const repeated = [];
    
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i] === words[i + 1] && words[i].length > 2) {
        repeated.push({
          word: words[i],
          position: text.toLowerCase().indexOf(`${words[i]} ${words[i]}`, i),
        });
      }
    }
    
    return repeated;
  }
  
  private async checkSentenceClarity(text: string) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const issues = [];
    
    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/);
      if (words.length > 25) {
        issues.push({
          type: 'long_sentence',
          sentence: sentence.trim(),
          wordCount: words.length,
          suggestion: 'Consider breaking this sentence into shorter ones.',
        });
      }
    }
    
    return issues;
  }
}

function getResult(task: PromiseSettledResult<any>): any {
  return task.status === 'fulfilled' ? task.value : null;
}
```

### 1.3 Implement Spell Checking Service ✅

```typescript
// services/analysis/spellcheck.ts - New spell checking service
import { Dictionary } from 'nspell';

export class SpellChecker {
  private dictionary: Dictionary | null = null;
  private initialized = false;
  
  async init() {
    if (this.initialized) return;
    
    try {
      // Load English dictionary
      const dict = await import('en-dictionary');
      const nspell = await import('nspell');
      
      this.dictionary = nspell.default(dict.default);
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize spell checker:', error);
    }
  }
  
  async check(text: string) {
    await this.init();
    
    if (!this.dictionary) return [];
    
    const words = text.match(/\b[a-zA-Z]+\b/g) || [];
    const misspelled = [];
    
    for (const word of words) {
      if (!this.dictionary.correct(word) && word.length > 2) {
        const suggestions = this.dictionary.suggest(word).slice(0, 3);
        const position = text.indexOf(word);
        
        misspelled.push({
          word,
          position,
          length: word.length,
          suggestions,
          type: 'spelling',
        });
      }
    }
    
    return misspelled;
  }
}
```

### 1.4 Advanced Caching System ✅

```typescript
// services/analysis/cache.ts - Enhanced caching system
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  textHash: string;
}

export class AnalysisCache {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private maxSize = 1000;
  private defaultTTL = 300000; // 5 minutes
  
  set<T>(key: string, data: T, ttlSeconds?: number): void {
    const ttl = (ttlSeconds || 300) * 1000; // Convert to ms
    
    // Implement LRU eviction
    if (this.memoryCache.size >= this.maxSize) {
      const oldestKey = this.findOldestKey();
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }
    
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      textHash: this.generateTextHash(data),
    });
    
    // Persist to IndexedDB for longer-term caching
    this.persistToIndexedDB(key, data, ttl);
  }
  
  get<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    
    if (!entry) {
      // Try to load from IndexedDB
      this.loadFromIndexedDB(key);
      return null;
    }
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.memoryCache.delete(key);
      return null;
    }
    
    // Update hit count
    entry.hits++;
    
    return entry.data as T;
  }
  
  clear(): void {
    this.memoryCache.clear();
    this.clearIndexedDB();
  }
  
  private findOldestKey(): string | null {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.timestamp < oldestTime && entry.hits < 2) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }
  
  private generateTextHash(data: any): string {
    return btoa(JSON.stringify(data).slice(0, 100)).replace(/[^a-zA-Z0-9]/g, '');
  }
  
  private async persistToIndexedDB(key: string, data: any, ttl: number): Promise<void> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      
      await store.put({
        key,
        data,
        timestamp: Date.now(),
        ttl,
      });
    } catch (error) {
      console.warn('Failed to persist to IndexedDB:', error);
    }
  }
  
  private async loadFromIndexedDB(key: string): Promise<any> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      
      const result = await store.get(key);
      
      if (result && (Date.now() - result.timestamp) < result.ttl) {
        // Restore to memory cache
        this.memoryCache.set(key, {
          data: result.data,
          timestamp: result.timestamp,
          ttl: result.ttl,
          hits: 0,
          textHash: this.generateTextHash(result.data),
        });
        
        return result.data;
      }
    } catch (error) {
      console.warn('Failed to load from IndexedDB:', error);
    }
    
    return null;
  }
  
  private async openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WordWiseCache', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
    });
  }
  
  private async clearIndexedDB(): Promise<void> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      await store.clear();
    } catch (error) {
      console.warn('Failed to clear IndexedDB:', error);
    }
  }
}
```

### 1.5 Inline Grammar Decorations with Tiptap Extension ✅

```typescript
// components/editor/extensions/GrammarDecoration.ts - Enhanced version
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { UnifiedSuggestion } from '@/types/suggestions';

interface GrammarDecorationOptions {
  suggestions: UnifiedSuggestion[];
  onHover: (suggestion: UnifiedSuggestion | null) => void;
  onApplyFix: (suggestion: UnifiedSuggestion, fix: string) => void;
}

export const GrammarDecoration = Extension.create<GrammarDecorationOptions>({
  name: 'grammarDecoration',
  
  addOptions() {
    return {
      suggestions: [],
      onHover: () => {},
      onApplyFix: () => {},
    };
  },
  
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('grammarDecoration'),
        
        state: {
          init() {
            return DecorationSet.empty;
          },
          
          apply(tr, decorationSet) {
            // Update decorations when suggestions change
            const suggestions = this.options.suggestions;
            
            if (!suggestions || suggestions.length === 0) {
              return DecorationSet.empty;
            }
            
            const decorations: Decoration[] = [];
            
            suggestions.forEach(suggestion => {
              if (suggestion.position && suggestion.position.start !== undefined) {
                const decoration = Decoration.inline(
                  suggestion.position.start,
                  suggestion.position.end || suggestion.position.start + 1,
                  {
                    class: this.getDecorationClass(suggestion),
                    'data-suggestion-id': suggestion.id,
                    title: suggestion.message,
                  },
                  {
                    suggestion,
                    onHover: this.options.onHover,
                    onApplyFix: this.options.onApplyFix,
                  }
                );
                
                decorations.push(decoration);
              }
            });
            
            return DecorationSet.create(tr.doc, decorations);
          },
        },
        
        props: {
          decorations(state) {
            return this.getState(state);
          },
          
          handleDOMEvents: {
            mouseenter: (view, event) => {
              const target = event.target as HTMLElement;
              const suggestionId = target.getAttribute('data-suggestion-id');
              
              if (suggestionId) {
                const suggestion = this.options.suggestions.find(s => s.id === suggestionId);
                if (suggestion) {
                  this.options.onHover(suggestion);
                }
              }
              
              return false;
            },
            
            mouseleave: (view, event) => {
              this.options.onHover(null);
              return false;
            },
            
            click: (view, event) => {
              const target = event.target as HTMLElement;
              const suggestionId = target.getAttribute('data-suggestion-id');
              
              if (suggestionId) {
                const suggestion = this.options.suggestions.find(s => s.id === suggestionId);
                if (suggestion && suggestion.actions && suggestion.actions.length > 0) {
                  // Show context menu or apply primary fix
                  const primaryAction = suggestion.actions.find(a => a.primary);
                  if (primaryAction && primaryAction.type === 'fix') {
                    this.options.onApplyFix(suggestion, primaryAction.label);
                  }
                }
              }
              
              return false;
            },
          },
        },
      }),
    ];
  },
  
  getDecorationClass(suggestion: UnifiedSuggestion): string {
    const baseClass = 'grammar-decoration';
    const severityClass = `grammar-${suggestion.severity}`;
    const categoryClass = `grammar-${suggestion.category}`;
    
    return `${baseClass} ${severityClass} ${categoryClass}`;
  },
});
```

### 1.6 Grammar Decoration Styles ✅

```scss
// styles/grammar-decorations.scss - Add to styles/editor.css
.grammar-decoration {
  position: relative;
  border-bottom: 2px solid;
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

// Severity-based styling
.grammar-error {
  border-bottom-color: #ef4444; // red-500
  border-bottom-style: wavy;
}

.grammar-warning {
  border-bottom-color: #f59e0b; // amber-500
  border-bottom-style: dotted;
}

.grammar-info {
  border-bottom-color: #3b82f6; // blue-500
  border-bottom-style: dashed;
}

// Category-based styling
.grammar-grammar {
  animation: pulse-red 2s infinite;
}

.grammar-spelling {
  border-bottom-width: 3px;
}

.grammar-style {
  opacity: 0.7;
}

.grammar-seo {
  border-bottom-color: #10b981; // emerald-500
}

// Animations
@keyframes pulse-red {
  0%, 100% {
    border-bottom-color: #ef4444;
  }
  50% {
    border-bottom-color: #dc2626;
  }
}

// Hover card for suggestions
.grammar-hover-card {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 50;
  min-width: 200px;
  max-width: 400px;
  padding: 12px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  transform: translateY(4px);
  
  &::before {
    content: '';
    position: absolute;
    top: -6px;
    left: 12px;
    width: 12px;
    height: 12px;
    background: white;
    border: 1px solid #e5e7eb;
    border-bottom: none;
    border-right: none;
    transform: rotate(45deg);
  }
  
  .suggestion-title {
    font-size: 14px;
    font-weight: 600;
    color: #111827;
    margin-bottom: 4px;
  }
  
  .suggestion-message {
    font-size: 13px;
    color: #6b7280;
    margin-bottom: 8px;
  }
  
  .suggestion-fixes {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    
    .fix-button {
      padding: 4px 8px;
      font-size: 12px;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      cursor: pointer;
      
      &:hover {
        background: #e5e7eb;
      }
      
      &.primary {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
        
        &:hover {
          background: #2563eb;
        }
      }
    }
  }
}
```

### 1.7 Database Schema Migration ✅

```sql
-- drizzle/migrations/add_missing_fields.sql
-- Fix missing fields in documents table

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS author TEXT DEFAULT 'Anonymous',
ADD COLUMN IF NOT EXISTS keywords JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS target_keyword TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS seo_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS readability_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS style_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS overall_score INTEGER DEFAULT 0;

-- Add indices for performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_target_keyword ON documents(target_keyword);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at);

-- Update existing documents with default values
UPDATE documents 
SET 
  author = COALESCE(author, 'Anonymous'),
  keywords = COALESCE(keywords, '[]'::jsonb),
  target_keyword = COALESCE(target_keyword, ''),
  seo_score = COALESCE(seo_score, 0),
  readability_score = COALESCE(readability_score, 0),
  style_score = COALESCE(style_score, 0),
  overall_score = COALESCE(overall_score, 0)
WHERE author IS NULL 
   OR keywords IS NULL 
   OR target_keyword IS NULL 
   OR seo_score IS NULL;
```

```typescript
// lib/db/migrate.ts - Run migration
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function runMissingFieldsMigration() {
  try {
    // Add missing columns
    await db.execute(sql`
      ALTER TABLE documents 
      ADD COLUMN IF NOT EXISTS author TEXT DEFAULT 'Anonymous',
      ADD COLUMN IF NOT EXISTS keywords JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS target_keyword TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS seo_score INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS readability_score INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS style_score INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS overall_score INTEGER DEFAULT 0
    `);
    
    // Add indices
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
      CREATE INDEX IF NOT EXISTS idx_documents_target_keyword ON documents(target_keyword);
      CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at);
    `);
    
    // Update existing records
    await db.execute(sql`
      UPDATE documents 
      SET 
        author = COALESCE(author, 'Anonymous'),
        keywords = COALESCE(keywords, '[]'::jsonb),
        target_keyword = COALESCE(target_keyword, ''),
        seo_score = COALESCE(seo_score, 0),
        readability_score = COALESCE(readability_score, 0),
        style_score = COALESCE(style_score, 0),
        overall_score = COALESCE(overall_score, 0)
      WHERE author IS NULL 
         OR keywords IS NULL 
         OR target_keyword IS NULL 
         OR seo_score IS NULL
    `);
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}
```

## Code Quality & Technical Standards

### Continuous Quality Assurance

**CRITICAL**: Throughout the entire development process, maintain zero technical debt by following these practices:

#### Daily Development Workflow
```bash
# Run these commands before every commit:
bun run lint          # ESLint - fix all warnings/errors
bun run typecheck     # TypeScript - zero type errors allowed
bun run build         # Next.js build - must succeed without warnings
bun test              # Run all tests - 100% pass rate required
```

#### Code Organization Standards

1. **File Structure Consistency**
   ```
   services/analysis/
   ├── engine.ts           # Main analysis engine
   ├── cache.ts           # Caching system
   ├── spellcheck.ts      # Spell checking
   ├── typos.ts           # Typo correction
   └── index.ts           # Clean exports
   
   hooks/
   ├── useOptimizedAnalysis.ts  # Replace useAnalysis.ts
   ├── useGrammarCheck.ts       # Keep existing
   └── index.ts                 # Export all hooks
   
   components/editor/
   ├── extensions/
   │   ├── GrammarDecoration.ts
   │   └── index.ts
   └── BlogEditor.tsx
   ```

2. **TypeScript Standards**
   - **Zero `any` types** - use proper typing for everything
   - **Strict mode enabled** - no implicit any, strict null checks
   - **Interface over type** for object definitions
   - **Proper error handling** - no unhandled promise rejections

3. **Import/Export Organization**
   ```typescript
   // ✅ Good - organized imports
   import { useState, useEffect, useCallback } from 'react';
   import { Editor } from '@tiptap/react';
   
   import { AnalysisEngine } from '@/services/analysis/engine';
   import { AnalysisCache } from '@/services/analysis/cache';
   import type { UnifiedSuggestion } from '@/types/suggestions';
   
   // ✅ Good - clean exports
   export { useOptimizedAnalysis } from './useOptimizedAnalysis';
   export { AnalysisEngine } from './engine';
   export type { UnifiedSuggestion, AnalysisResults } from './types';
   ```

4. **Performance Standards**
   - **No memory leaks** - cleanup all subscriptions/timers
   - **Debounced operations** - never run heavy operations on every keystroke
   - **Memoization** - use React.memo, useMemo, useCallback appropriately
   - **Bundle size monitoring** - keep total bundle under 500KB

#### Code Review Checklist

Before merging any changes, verify:

- [ ] **Lint**: `bun run lint` passes with zero warnings
- [ ] **TypeCheck**: `bun run typecheck` passes with zero errors  
- [ ] **Build**: `bun run build` succeeds without warnings
- [ ] **Tests**: All existing tests pass, new features have tests
- [ ] **Performance**: No new performance regressions
- [ ] **Documentation**: All new functions/classes have JSDoc comments
- [ ] **Naming**: Clear, descriptive variable/function names
- [ ] **Error Handling**: Proper error boundaries and fallbacks
- [ ] **Accessibility**: Components follow WCAG guidelines

#### Technical Debt Prevention

1. **Remove Dead Code Immediately**
   ```bash
   # Find unused files
   npx unimport --scan
   
   # Remove unused dependencies
   npx depcheck
   ```

2. **Refactor as You Go**
   - If you touch a file, improve it while you're there
   - Extract reusable components/utilities immediately
   - Replace any TODO comments with GitHub issues
   - Update documentation for changed APIs

3. **Consistent Code Style**
   ```typescript
   // ✅ Good - consistent naming
   const analysisEngine = new AnalysisEngine();
   const grammarErrors = await checkGrammar(text);
   const isAnalyzing = useAnalysisState();
   
   // ❌ Bad - inconsistent naming  
   const engine = new AnalysisEngine();
   const errors = await checkGrammar(text);
   const analyzing = useAnalysisState();
   ```

#### ESLint Configuration Updates

Add these rules to `eslint.config.mjs`:

```javascript
export default [
  // ... existing config
  {
    rules: {
      // Prevent technical debt
      '@typescript-eslint/no-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      
      // Performance rules
      'react-hooks/exhaustive-deps': 'error',
      'react/jsx-key': 'error',
      'react/no-array-index-key': 'warn',
      
      // Code organization
      'import/order': ['error', {
        'groups': ['builtin', 'external', 'internal', 'parent', 'sibling'],
        'newlines-between': 'always',
      }],
      'import/no-default-export': 'error', // Use named exports
      
      // Accessibility
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/aria-role': 'error',
    }
  }
];
```

## Implementation Timeline - Week by Week

### Week 1: Foundation & Performance
- **Day 1**: Install dependencies, run database migration, setup linting rules
- **Day 2**: Run full codebase cleanup - fix all lint/type errors
- **Day 3-4**: Implement three-tier analysis engine with proper TypeScript
- **Day 5**: Implement caching system, run performance tests
- **Day 6**: Build spell checking service, add comprehensive tests
- **Day 7**: Code review, refactoring, ensure 100% type coverage

**End of Week 1 Requirements**:
- ✅ Zero lint errors (`bun run lint`)
- ✅ Zero type errors (`bun run typecheck`) 
- ✅ Clean build (`bun run build`)
- ✅ All tests passing
- ✅ Performance benchmarks established

### Week 2: Core Grammar Features  
- **Day 8**: Clean up existing editor components, remove dead code
- **Day 9**: Implement inline grammar decorations with full TypeScript
- **Day 10**: Build hover card system with accessibility compliance
- **Day 11**: Implement fix application system with error boundaries
- **Day 12**: Add comprehensive test coverage for grammar features
- **Day 13**: Performance optimization and bundle size analysis
- **Day 14**: Final code review, documentation updates

**End of Week 2 Requirements**:
- ✅ Grammar decorations working with zero performance issues
- ✅ Hover cards fully accessible (WCAG compliant)
- ✅ Test coverage > 80% for new features
- ✅ Bundle size increase < 100KB
- ✅ All TypeScript strict mode compliant

### Week 3: Enhanced User Experience
- **Day 15**: Refactor existing suggestion panels, improve organization
- **Day 16**: Implement unified suggestion system with proper typing
- **Day 17**: Build advanced SEO integration with performance monitoring
- **Day 18**: Create publication readiness dashboard
- **Day 19**: Add comprehensive error handling and fallbacks
- **Day 20**: Performance testing and optimization
- **Day 21**: Code quality review and refactoring

### Week 4: Integration & Testing
- **Day 22**: Clean up all existing components, remove technical debt
- **Day 23**: Implement comprehensive error handling
- **Day 24**: Add auto-save improvements with conflict resolution
- **Day 25**: Performance testing across different content sizes
- **Day 26**: Cross-browser testing and compatibility fixes
- **Day 27**: User experience testing and feedback integration
- **Day 28**: Final MVP polish and deployment preparation

### Week 5: AI Foundation
- **Day 29**: Set up AI SDK integration with proper error boundaries
- **Day 30**: Implement basic content generation with TypeScript
- **Day 31**: Create AI chat interface with accessibility
- **Day 32**: Add tool calling system with comprehensive testing
- **Day 33**: Performance optimization for AI features
- **Day 34**: Integration testing between AI and analysis systems
- **Day 35**: Code review and refactoring

### Week 6: AI Polish & Launch
- **Day 36**: Add advanced AI features with proper typing
- **Day 37**: Implement multi-step enhancement system
- **Day 38**: Final testing and bug fixes
- **Day 39**: Performance optimization and bundle analysis
- **Day 40**: Security audit and accessibility review
- **Day 41**: Documentation completion
- **Day 42**: Final deployment and launch preparation

## Quality Gates

Each week must pass these quality gates before proceeding:

1. **Code Quality Gate**
   ```bash
   bun run lint --max-warnings=0
   bun run typecheck
   bun run build --no-warnings
   ```

2. **Performance Gate**
   - Analysis response time < 2 seconds
   - No memory leaks detected
   - Bundle size within targets
   - Lighthouse score > 90

3. **Accessibility Gate**
   - WCAG AA compliance
   - Keyboard navigation working
   - Screen reader compatibility
   - Color contrast ratios met

4. **Testing Gate**
   - Unit test coverage > 80%
   - Integration tests passing
   - E2E tests for critical paths
   - Performance regression tests

**RULE**: No new features until all quality gates pass. Technical debt is not allowed to accumulate.