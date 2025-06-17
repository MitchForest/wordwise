# nspell Spell Checker - Next.js App Router Guide

## Overview

This guide shows how to properly integrate nspell spell checking into a Next.js App Router application, handling SSR, bundle size optimization, and proper initialization.

## Installation

```bash
bun add nspell dictionary-en
# or
npm install nspell dictionary-en
```

## The Challenge with Next.js

1. **SSR Incompatibility**: nspell uses browser-only APIs
2. **Bundle Size**: Dictionary files are large (~1MB)
3. **Initialization**: Must happen client-side only
4. **Performance**: Need to avoid blocking the UI

## Solution 1: Basic Client-Side Implementation

### Create the SpellChecker Service

```typescript
// services/spell-checker.ts
import type { Nspell } from 'nspell';

class SpellCheckerService {
  private spell: Nspell | null = null;
  private initPromise: Promise<void> | null = null;
  private customWords = new Set<string>();

  async initialize(): Promise<void> {
    // Only run on client
    if (typeof window === 'undefined') {
      return;
    }

    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      // Dynamic imports for code splitting
      const [nspellModule, dictionaryModule] = await Promise.all([
        import('nspell'),
        import('dictionary-en')
      ]);

      const nspell = nspellModule.default;
      const dictionary = dictionaryModule.default;

      // Create spell checker instance
      this.spell = nspell(dictionary);

      // Add custom words for your domain
      const customWords = [
        'blog', 'blogging', 'blogger',
        'SEO', 'SERP', 'CMS', 'API',
        'URL', 'URLs', 'UI', 'UX',
        'metadata', 'permalink',
        // Add your app-specific terms
      ];

      customWords.forEach(word => {
        this.spell!.add(word);
        this.customWords.add(word.toLowerCase());
      });

      console.log('SpellChecker initialized successfully');
    } catch (error) {
      console.error('Failed to initialize spell checker:', error);
      throw error;
    }
  }

  isReady(): boolean {
    return this.spell !== null;
  }

  check(word: string): boolean {
    if (!this.spell) return true; // Assume correct if not initialized
    
    // Skip if custom word
    if (this.customWords.has(word.toLowerCase())) {
      return true;
    }

    // Skip certain patterns
    if (this.shouldSkipWord(word)) {
      return true;
    }

    return this.spell.correct(word);
  }

  suggest(word: string, limit: number = 5): string[] {
    if (!this.spell) return [];
    
    const suggestions = this.spell.suggest(word);
    return suggestions.slice(0, limit);
  }

  addWord(word: string): void {
    if (this.spell) {
      this.spell.add(word);
    }
    this.customWords.add(word.toLowerCase());
  }

  private shouldSkipWord(word: string): boolean {
    // Skip URLs
    if (word.startsWith('http://') || word.startsWith('https://')) {
      return true;
    }

    // Skip email addresses
    if (word.includes('@')) {
      return true;
    }

    // Skip numbers
    if (/^\d+$/.test(word)) {
      return true;
    }

    // Skip very short words
    if (word.length < 2) {
      return true;
    }

    // Skip code-like words (camelCase, snake_case)
    if (/[A-Z]/.test(word.slice(1)) || word.includes('_')) {
      return true;
    }

    return false;
  }
}

// Export singleton instance
export const spellChecker = new SpellCheckerService();
```

### Create a React Hook

```typescript
// hooks/useSpellChecker.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { spellChecker } from '@/services/spell-checker';

interface SpellCheckResult {
  isCorrect: boolean;
  suggestions: string[];
}

export function useSpellChecker() {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    
    spellChecker.initialize()
      .then(() => {
        setIsReady(true);
        setError(null);
      })
      .catch((err) => {
        setError(err);
        console.error('SpellChecker initialization failed:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const checkWord = useCallback((word: string): SpellCheckResult => {
    if (!isReady) {
      return { isCorrect: true, suggestions: [] };
    }

    const isCorrect = spellChecker.check(word);
    const suggestions = isCorrect ? [] : spellChecker.suggest(word);

    return { isCorrect, suggestions };
  }, [isReady]);

  const checkText = useCallback((text: string): Map<string, SpellCheckResult> => {
    const results = new Map<string, SpellCheckResult>();
    
    if (!isReady) return results;

    // Extract words from text
    const words = text.match(/\b[\w']+\b/g) || [];
    
    // Check each unique word
    const uniqueWords = new Set(words);
    uniqueWords.forEach(word => {
      results.set(word, checkWord(word));
    });

    return results;
  }, [isReady, checkWord]);

  const addCustomWord = useCallback((word: string) => {
    spellChecker.addWord(word);
  }, []);

  return {
    isReady,
    isLoading,
    error,
    checkWord,
    checkText,
    addCustomWord
  };
}
```

## Solution 2: Optimized with Web Worker

For better performance, run spell checking in a Web Worker:

### Create Worker File

```typescript
// public/spell-checker.worker.js
let spell = null;

self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'INIT':
      try {
        // Import nspell and dictionary in worker
        const [nspellModule, dictModule] = await Promise.all([
          import('https://unpkg.com/nspell@2/index.js'),
          import('https://unpkg.com/dictionary-en@3/index.js')
        ]);
        
        spell = nspellModule.default(dictModule.default);
        
        // Add custom words
        if (payload.customWords) {
          payload.customWords.forEach(word => spell.add(word));
        }
        
        self.postMessage({ type: 'READY' });
      } catch (error) {
        self.postMessage({ type: 'ERROR', error: error.message });
      }
      break;

    case 'CHECK':
      if (!spell) {
        self.postMessage({ 
          type: 'RESULT', 
          id: payload.id,
          result: { isCorrect: true, suggestions: [] }
        });
        return;
      }

      const isCorrect = spell.correct(payload.word);
      const suggestions = isCorrect ? [] : spell.suggest(payload.word).slice(0, 5);
      
      self.postMessage({
        type: 'RESULT',
        id: payload.id,
        result: { isCorrect, suggestions }
      });
      break;

    case 'ADD_WORD':
      if (spell) {
        spell.add(payload.word);
      }
      break;
  }
});
```

### Worker Service

```typescript
// services/spell-checker-worker.ts
class SpellCheckerWorkerService {
  private worker: Worker | null = null;
  private ready = false;
  private pendingChecks = new Map<string, (result: any) => void>();
  private checkId = 0;

  async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;

    return new Promise((resolve, reject) => {
      this.worker = new Worker('/spell-checker.worker.js', { type: 'module' });

      this.worker.addEventListener('message', (event) => {
        const { type, id, result, error } = event.data;

        switch (type) {
          case 'READY':
            this.ready = true;
            resolve();
            break;
          
          case 'ERROR':
            reject(new Error(error));
            break;
          
          case 'RESULT':
            const callback = this.pendingChecks.get(id);
            if (callback) {
              callback(result);
              this.pendingChecks.delete(id);
            }
            break;
        }
      });

      // Initialize worker
      this.worker.postMessage({
        type: 'INIT',
        payload: {
          customWords: ['blog', 'SEO', 'API', 'URL', 'CMS']
        }
      });
    });
  }

  async checkWord(word: string): Promise<{ isCorrect: boolean; suggestions: string[] }> {
    if (!this.ready || !this.worker) {
      return { isCorrect: true, suggestions: [] };
    }

    return new Promise((resolve) => {
      const id = String(this.checkId++);
      this.pendingChecks.set(id, resolve);

      this.worker!.postMessage({
        type: 'CHECK',
        payload: { id, word }
      });
    });
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.ready = false;
    }
  }
}

export const spellCheckerWorker = new SpellCheckerWorkerService();
```

## Solution 3: Lazy Loading with Suspense

Use React Suspense for better UX:

```typescript
// components/SpellCheckerProvider.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';
import dynamic from 'next/dynamic';

const SpellCheckerContext = createContext<any>(null);

// Lazy load the spell checker
const SpellCheckerCore = dynamic(
  () => import('./SpellCheckerCore'),
  {
    ssr: false,
    loading: () => <div>Loading spell checker...</div>
  }
);

export function SpellCheckerProvider({ children }: { children: ReactNode }) {
  return (
    <SpellCheckerContext.Provider value={{}}>
      <SpellCheckerCore>
        {children}
      </SpellCheckerCore>
    </SpellCheckerContext.Provider>
  );
}
```

## Usage in Components

### Basic Usage

```typescript
// components/Editor.tsx
'use client';

import { useSpellChecker } from '@/hooks/useSpellChecker';
import { useState, useEffect } from 'react';

export function Editor() {
  const { isReady, checkWord, addCustomWord } = useSpellChecker();
  const [text, setText] = useState('');
  const [misspellings, setMisspellings] = useState<Map<string, string[]>>(new Map());

  useEffect(() => {
    if (!isReady) return;

    // Debounce spell checking
    const timeout = setTimeout(() => {
      const words = text.match(/\b[\w']+\b/g) || [];
      const newMisspellings = new Map<string, string[]>();

      words.forEach(word => {
        const result = checkWord(word);
        if (!result.isCorrect) {
          newMisspellings.set(word, result.suggestions);
        }
      });

      setMisspellings(newMisspellings);
    }, 300);

    return () => clearTimeout(timeout);
  }, [text, isReady, checkWord]);

  const handleAddWord = (word: string) => {
    addCustomWord(word);
    // Remove from misspellings
    const newMisspellings = new Map(misspellings);
    newMisspellings.delete(word);
    setMisspellings(newMisspellings);
  };

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full h-64 p-4 border"
      />
      
      {misspellings.size > 0 && (
        <div className="mt-4">
          <h3>Potential Misspellings:</h3>
          {Array.from(misspellings.entries()).map(([word, suggestions]) => (
            <div key={word} className="mb-2">
              <span className="text-red-500">{word}</span>
              {suggestions.length > 0 && (
                <span className="ml-2">
                  Suggestions: {suggestions.join(', ')}
                </span>
              )}
              <button
                onClick={() => handleAddWord(word)}
                className="ml-2 text-sm text-blue-500"
              >
                Add to dictionary
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Integration with TipTap

```typescript
// extensions/SpellCheckExtension.ts
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { spellChecker } from '@/services/spell-checker';

export const SpellCheckExtension = Extension.create({
  name: 'spellCheck',

  addOptions() {
    return {
      checkInterval: 500, // ms
    };
  },

  addProseMirrorPlugins() {
    let checkTimeout: NodeJS.Timeout;

    return [
      new Plugin({
        key: new PluginKey('spellCheck'),
        
        state: {
          init: () => DecorationSet.empty,
          
          apply: (tr, oldState) => {
            if (!tr.docChanged) return oldState;
            
            // Clear existing timeout
            clearTimeout(checkTimeout);
            
            // Schedule new check
            checkTimeout = setTimeout(() => {
              this.checkDocument(tr.doc);
            }, this.options.checkInterval);
            
            return oldState;
          },
        },
        
        props: {
          decorations: (state) => {
            const decorations: Decoration[] = [];
            
            state.doc.descendants((node, pos) => {
              if (node.isText) {
                const words = node.text!.matchAll(/\b[\w']+\b/g);
                
                for (const match of words) {
                  const word = match[0];
                  const start = pos + match.index!;
                  
                  if (!spellChecker.check(word)) {
                    decorations.push(
                      Decoration.inline(start, start + word.length, {
                        class: 'spell-error',
                        title: `"${word}" may be misspelled`,
                      })
                    );
                  }
                }
              }
            });
            
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
```

## Performance Tips

### 1. Batch Processing

```typescript
// Process multiple words at once
async function batchCheckWords(words: string[]): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();
  
  // Check unique words only
  const uniqueWords = [...new Set(words)];
  
  await Promise.all(
    uniqueWords.map(async (word) => {
      const isCorrect = await spellChecker.check(word);
      results.set(word, isCorrect);
    })
  );
  
  return results;
}
```

### 2. Caching Results

```typescript
class CachedSpellChecker {
  private cache = new Map<string, boolean>();
  private maxCacheSize = 10000;

  async check(word: string): Promise<boolean> {
    // Check cache first
    if (this.cache.has(word)) {
      return this.cache.get(word)!;
    }

    // Check with spell checker
    const result = await spellChecker.check(word);
    
    // Cache result
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entries
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(word, result);
    return result;
  }
}
```

### 3. Debounced Checking

```typescript
import { debounce } from 'lodash';

const debouncedCheck = debounce(async (text: string) => {
  const words = text.match(/\b[\w']+\b/g) || [];
  const results = await batchCheckWords(words);
  // Update UI with results
}, 300);
```

## Common Issues & Solutions

### Issue 1: "Module not found" Error

```typescript
// ❌ Wrong
import dictionary from 'dictionary-en';

// ✅ Correct - use dynamic import
const dictionary = await import('dictionary-en');
```

### Issue 2: SSR Errors

```typescript
// Always check for client-side
if (typeof window !== 'undefined') {
  // Initialize spell checker
}
```

### Issue 3: Large Bundle Size

Use dynamic imports and code splitting:

```typescript
const SpellChecker = dynamic(
  () => import('@/components/SpellChecker'),
  { 
    ssr: false,
    loading: () => <p>Loading spell checker...</p>
  }
);
```

### Issue 4: Memory Leaks

```typescript
// Clean up on unmount
useEffect(() => {
  spellChecker.initialize();
  
  return () => {
    // Cleanup if needed
    spellChecker.terminate?.();
  };
}, []);
```

## Testing

```typescript
// __tests__/spell-checker.test.ts
import { spellChecker } from '@/services/spell-checker';

describe('SpellChecker', () => {
  beforeAll(async () => {
    await spellChecker.initialize();
  });

  test('correctly identifies misspellings', () => {
    expect(spellChecker.check('hello')).toBe(true);
    expect(spellChecker.check('helo')).toBe(false);
  });

  test('provides suggestions', () => {
    const suggestions = spellChecker.suggest('helo');
    expect(suggestions).toContain('hello');
  });

  test('handles custom words', () => {
    spellChecker.addWord('blockchain');
    expect(spellChecker.check('blockchain')).toBe(true);
  });
});
```

## Summary

1. **Always use dynamic imports** for nspell and dictionary
2. **Initialize only on client side** to avoid SSR issues
3. **Consider Web Workers** for heavy processing
4. **Cache results** to improve performance
5. **Debounce checks** to avoid overwhelming the system
6. **Handle loading states** properly for better UX

This setup gives you a robust spell checking system that works well with Next.js App Router while maintaining good performance and user experience. 