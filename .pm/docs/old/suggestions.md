# WordWise Unified Analysis System - Complete Implementation Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Tools & Libraries](#tools--libraries)
4. [Unified Suggestion Format](#unified-suggestion-format)
5. [Implementation Layers](#implementation-layers)
6. [Complete Code Implementation](#complete-code-implementation)
7. [Integration Guide](#integration-guide)
8. [Fallback Strategy](#fallback-strategy)
9. [Testing & Debugging](#testing--debugging)

## System Overview

WordWise uses a **progressive enhancement approach** with three layers:
1. **Local Analysis** (instant, no API needed)
2. **LanguageTool API** (advanced grammar, when available)
3. **AI Enhancement** (future phase, not covered here)

The system continues working even if LanguageTool API credits run out, falling back to local tools gracefully.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Types in Editor                     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Unified Analysis Engine                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Timing Controller                        │   │
│  │  • Instant (0ms): After each word                       │   │
│  │  • Fast (500ms): After sentence                         │   │
│  │  • Deep (3000ms): After pause or paragraph              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  Local Analyzers  │  │   API Analyzer   │  │   Document   │ │
│  │                  │  │                  │  │   Analyzer   │ │
│  │ • nspell         │  │ • LanguageTool   │  │ • Readability│ │
│  │ • Basic Grammar  │  │   (if available) │  │ • SEO Score  │ │
│  │ • write-good     │  │                  │  │ • Read Time  │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Suggestion Manager                            │
│  • Deduplication                                                │
│  • Priority sorting                                             │
│  • Position mapping                                             │
│  • Apply/Ignore tracking                                        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      UI Components                               │
│  • Editor decorations (underlines)                              │
│  • Suggestions panel                                            │
│  • Status bar scores                                            │
└─────────────────────────────────────────────────────────────────┘
```

## Tools & Libraries

### 1. **Spelling Check**
- **Library**: `nspell` with `dictionary-en`
- **When**: After each word (0ms)
- **What it does**: Checks if individual words are spelled correctly
- **Example**: "writting" → suggests "writing"

### 2. **Basic Grammar**
- **Library**: Custom implementation (no library needed)
- **When**: After each word (0ms)
- **What it checks**:
  - Capitalization (start of sentences, "I", proper nouns)
  - Basic punctuation (spaces, missing periods)
  - Common errors (double words, "dont" → "don't")

### 3. **Style Check**
- **Library**: `write-good`
- **When**: After sentence completion (500ms)
- **What it checks**:
  - Passive voice
  - Weasel words
  - Adverb usage
  - Clichés
  - Sentence complexity

### 4. **Readability Analysis**
- **Library**: `text-readability`
- **When**: After pause (3000ms)
- **What it provides**:
  - Flesch Reading Ease score
  - Grade level
  - Multiple readability metrics

### 5. **Reading Time**
- **Library**: `reading-time`
- **When**: After pause (3000ms)
- **What it provides**: Estimated time to read the document

### 6. **SEO Analysis**
- **Library**: Custom implementation using `keyword-extractor` and `string-similarity`
- **When**: After pause (3000ms) or manual trigger
- **What it checks**:
  - Keyword density (target: 1-2%)
  - Title optimization (50-60 chars, keyword placement)
  - Meta description (150-160 chars)
  - Heading structure (H1→H2→H3 hierarchy)
  - First paragraph keyword usage
  - Internal/external link balance
  - Image alt text presence
  - URL slug optimization

### 7. **Advanced Grammar** (when available)
- **Service**: LanguageTool API
- **When**: After sentence (500ms) or paragraph (2000ms)
- **What it checks**: Complex grammar rules that local tools miss
- **Fallback**: System works without it

## Unified Suggestion Format

Every tool's output is converted to this format:

```typescript
interface UnifiedSuggestion {
  // Unique identifier
  id: string;                    // e.g., "spell-142", "grammar-203"
  
  // Source information
  source: 'spelling' | 'grammar' | 'style' | 'readability' | 'seo' | 'languagetool';
  severity: 'error' | 'warning' | 'info' | 'enhancement';
  category: string;              // e.g., "Spelling", "Passive Voice"
  
  // Position in document
  position: {
    start: number;               // Character offset from document start
    end: number;                 // Character offset end
    paragraph?: number;          // Which paragraph (0-indexed)
    sentence?: number;           // Which sentence (0-indexed)
  };
  
  // What to show user
  message: string;               // Full explanation
  shortMessage: string;          // For tooltips/inline display
  
  // How to fix it
  suggestions: string[];         // Possible corrections (best first)
  autoApplicable: boolean;       // Can apply without user choosing
  
  // Metadata
  rule: string;                  // Rule identifier
  confidence: number;            // 0-1, how sure we are
  impact: 'high' | 'medium' | 'low';  // Impact on quality
  
  // State
  ignored?: boolean;             // User clicked ignore
  applied?: boolean;             // Fix was applied
}
```

## Implementation Layers

### Layer 1: Base Analysis Engine

```typescript
// services/analysis/unified-engine.ts
import nspell from 'nspell';
import dictionaryEn from 'dictionary-en';
import writeGood from 'write-good';
import readability from 'text-readability';
import readingTime from 'reading-time';
import keywordExtractor from 'keyword-extractor';

export class UnifiedAnalysisEngine {
  private spellChecker: any;
  private basicGrammar: BasicGrammarChecker;
  private cache: Map<string, CacheEntry> = new Map();
  private ignoredSuggestions: Set<string> = new Set();
  
  constructor() {
    this.initializeSpellChecker();
    this.basicGrammar = new BasicGrammarChecker();
  }
  
  private async initializeSpellChecker() {
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      this.spellChecker = nspell(dictionaryEn);
      // Add custom words
      ['blog', 'SEO', 'URL', 'API'].forEach(word => {
        this.spellChecker.add(word);
      });
    }
  }
  
  // Main entry point - decides what to check based on timing
  async analyze(
    text: string,
    trigger: 'instant' | 'sentence' | 'paragraph' | 'document',
    options: AnalysisOptions = {}
  ): Promise<AnalysisResult> {
    // Check cache first
    const cacheKey = `${trigger}-${this.hashText(text)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!.data;
    }
    
    let suggestions: UnifiedSuggestion[] = [];
    let metrics: DocumentMetrics | undefined;
    
    switch (trigger) {
      case 'instant':
        // Just spelling and basic grammar on last word
        suggestions = await this.runInstantChecks(text, options);
        break;
        
      case 'sentence':
        // Add style checks
        suggestions = await this.runSentenceChecks(text, options);
        break;
        
      case 'paragraph':
        // Add paragraph-level analysis
        suggestions = await this.runParagraphChecks(text, options);
        break;
        
      case 'document':
        // Full analysis including metrics
        const result = await this.runDocumentAnalysis(text, options);
        suggestions = result.suggestions;
        metrics = result.metrics;
        break;
    }
    
    // Filter out ignored suggestions
    suggestions = suggestions.filter(s => !this.ignoredSuggestions.has(s.id));
    
    // Cache result
    const result = { suggestions, metrics };
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  }
  
  // Apply a suggestion
  applySuggestion(text: string, suggestion: UnifiedSuggestion): string {
    if (!suggestion.suggestions || suggestion.suggestions.length === 0) {
      return text;
    }
    
    const fix = suggestion.suggestions[0];
    const before = text.slice(0, suggestion.position.start);
    const after = text.slice(suggestion.position.end);
    
    return before + fix + after;
  }
  
  // Ignore a suggestion
  ignoreSuggestion(suggestionId: string) {
    this.ignoredSuggestions.add(suggestionId);
  }
  
  // Clear ignored suggestions
  clearIgnored() {
    this.ignoredSuggestions.clear();
  }
}
```

### Layer 2: Check Implementations

```typescript
// services/analysis/checks/instant-checks.ts
export async function runInstantChecks(
  text: string,
  options: AnalysisOptions
): Promise<UnifiedSuggestion[]> {
  const suggestions: UnifiedSuggestion[] = [];
  
  // 1. Spelling check on last word
  if (options.lastWord && this.spellChecker) {
    const word = options.lastWord;
    const wordStart = text.lastIndexOf(word);
    
    if (!this.spellChecker.correct(word) && word.length > 2) {
      suggestions.push({
        id: `spell-${wordStart}`,
        source: 'spelling',
        severity: 'error',
        category: 'Spelling',
        position: {
          start: wordStart,
          end: wordStart + word.length
        },
        message: `"${word}" may be misspelled`,
        shortMessage: 'Spelling',
        suggestions: this.spellChecker.suggest(word).slice(0, 3),
        autoApplicable: false,
        rule: 'MISSPELLING',
        confidence: 0.9,
        impact: 'high'
      });
    }
  }
  
  // 2. Basic grammar checks (last 100 characters)
  const recentText = text.slice(-100);
  const offset = Math.max(0, text.length - 100);
  
  // Check for double spaces
  const doubleSpaces = recentText.matchAll(/  +/g);
  for (const match of doubleSpaces) {
    suggestions.push({
      id: `space-${offset + match.index}`,
      source: 'grammar',
      severity: 'warning',
      category: 'Spacing',
      position: {
        start: offset + match.index!,
        end: offset + match.index! + match[0].length
      },
      message: 'Remove extra spaces',
      shortMessage: 'Extra space',
      suggestions: [' '],
      autoApplicable: true,
      rule: 'DOUBLE_SPACE',
      confidence: 1.0,
      impact: 'low'
    });
  }
  
  // Check for lowercase "i"
  const lowerI = recentText.matchAll(/\bi\b/g);
  for (const match of lowerI) {
    suggestions.push({
      id: `cap-i-${offset + match.index}`,
      source: 'grammar',
      severity: 'error',
      category: 'Capitalization',
      position: {
        start: offset + match.index!,
        end: offset + match.index! + 1
      },
      message: 'The pronoun "I" should be capitalized',
      shortMessage: 'Capitalize "I"',
      suggestions: ['I'],
      autoApplicable: true,
      rule: 'LOWERCASE_I',
      confidence: 1.0,
      impact: 'high'
    });
  }
  
  return suggestions;
}
```

### Layer 3: LanguageTool Integration (with fallback)

```typescript
// services/analysis/languagetool-service.ts
export class LanguageToolService {
  private apiKey?: string;
  private baseUrl = '/api/languagetool'; // Next.js API route
  private available = true;
  private lastError?: Date;
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }
  
  async check(text: string): Promise<UnifiedSuggestion[]> {
    // Skip if we know it's unavailable
    if (!this.available && this.lastError) {
      const hoursSinceError = (Date.now() - this.lastError.getTime()) / (1000 * 60 * 60);
      if (hoursSinceError < 1) {
        return []; // Don't retry for 1 hour after error
      }
    }
    
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: 'en-US' })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Convert LanguageTool format to UnifiedSuggestion
      return data.matches.map((match: any) => ({
        id: `lt-${match.offset}-${match.length}`,
        source: 'languagetool',
        severity: this.getSeverity(match),
        category: match.rule.category.name,
        position: {
          start: match.offset,
          end: match.offset + match.length
        },
        message: match.message,
        shortMessage: match.shortMessage || match.rule.description,
        suggestions: match.replacements.map((r: any) => r.value),
        autoApplicable: match.replacements.length === 1,
        rule: match.rule.id,
        confidence: 0.85,
        impact: this.getImpact(match)
      }));
      
    } catch (error) {
      console.warn('LanguageTool unavailable:', error);
      this.available = false;
      this.lastError = new Date();
      return []; // Return empty array, system continues with local checks
    }
  }
  
  private getSeverity(match: any): 'error' | 'warning' | 'info' {
    if (match.rule.category.id === 'TYPOS') return 'error';
    if (match.rule.issueType === 'grammar') return 'error';
    return 'warning';
  }
  
  private getImpact(match: any): 'high' | 'medium' | 'low' {
    if (match.rule.category.id === 'TYPOS') return 'high';
    if (match.rule.issueType === 'grammar') return 'high';
    return 'medium';
  }
}
```

## Complete Code Implementation

### 1. Analysis Engine with All Features

```typescript
// services/analysis/unified-engine.ts
import type { Editor } from '@tiptap/core';

interface AnalysisOptions {
  lastWord?: string;
  position?: number;
  useLanguageTool?: boolean;
  targetKeyword?: string;
  title?: string;
  metaDescription?: string;
  slug?: string;
  content?: any; // TipTap JSON content
}

interface AnalysisResult {
  suggestions: UnifiedSuggestion[];
  metrics?: DocumentMetrics;
}

interface DocumentMetrics {
  readability: {
    fleschReadingEase: number;
    fleschKincaidGrade: number;
    gunningFog: number;
    averageGrade: string;
  };
  readingTime: {
    minutes: number;
    words: number;
  };
  seo: {
    score: number;
    keywordDensity: number;
    titleScore: number;
    headingScore: number;
  };
  statistics: {
    words: number;
    sentences: number;
    paragraphs: number;
    characters: number;
  };
}

export class UnifiedAnalysisEngine {
  private spellChecker: any;
  private languageTool?: LanguageToolService;
  private cache = new Map<string, CacheEntry>();
  private ignoredSuggestions = new Set<string>();
  
  constructor(options: { languageToolApiKey?: string } = {}) {
    this.initializeSpellChecker();
    if (options.languageToolApiKey) {
      this.languageTool = new LanguageToolService(options.languageToolApiKey);
    }
  }
  
  // ... initialization code ...
  
  private async runInstantChecks(
    text: string,
    options: AnalysisOptions
  ): Promise<UnifiedSuggestion[]> {
    const suggestions: UnifiedSuggestion[] = [];
    
    // Spelling
    if (options.lastWord && this.spellChecker) {
      const word = options.lastWord;
      const wordStart = text.lastIndexOf(word);
      
      if (!this.isWordCorrect(word)) {
        suggestions.push(this.createSpellingSuggestion(word, wordStart));
      }
    }
    
    // Basic grammar
    suggestions.push(...this.checkBasicGrammar(text));
    
    return suggestions;
  }
  
  private async runSentenceChecks(
    text: string,
    options: AnalysisOptions
  ): Promise<UnifiedSuggestion[]> {
    const suggestions = await this.runInstantChecks(text, options);
    
    // Get current sentence
    const sentence = this.extractCurrentSentence(text, options.position || text.length);
    
    // Style checks with write-good
    const styleIssues = writeGood(sentence.text);
    suggestions.push(...this.convertWriteGoodSuggestions(styleIssues, sentence.offset));
    
    // LanguageTool if available
    if (this.languageTool && options.useLanguageTool) {
      const grammarSuggestions = await this.languageTool.check(sentence.text);
      suggestions.push(...this.offsetSuggestions(grammarSuggestions, sentence.offset));
    }
    
    return suggestions;
  }
  
  private async runParagraphChecks(
    text: string,
    options: AnalysisOptions
  ): Promise<UnifiedSuggestion[]> {
    const suggestions = await this.runSentenceChecks(text, options);
    
    // Get current paragraph
    const paragraph = this.extractCurrentParagraph(text, options.position || text.length);
    
    // Paragraph-level style analysis
    suggestions.push(...this.checkParagraphStyle(paragraph.text, paragraph.offset));
    
    return suggestions;
  }
  
  private async runDocumentAnalysis(
    text: string,
    options: AnalysisOptions
  ): Promise<{ suggestions: UnifiedSuggestion[]; metrics: DocumentMetrics }> {
    const suggestions = await this.runParagraphChecks(text, options);
    
    // Run SEO analysis
    const seoAnalyzer = new SEOAnalyzer();
    const seoSuggestions = seoAnalyzer.analyze(text, {
      title: options.title,
      metaDescription: options.metaDescription,
      targetKeyword: options.targetKeyword,
      slug: options.slug,
      content: options.content
    });
    suggestions.push(...seoSuggestions);
    
    // Calculate all metrics
    const metrics: DocumentMetrics = {
      readability: {
        fleschReadingEase: readability.fleschReadingEase(text),
        fleschKincaidGrade: readability.fleschKincaidGradeLevel(text),
        gunningFog: readability.gunningFog(text),
        averageGrade: readability.textStandard(text)
      },
      readingTime: readingTime(text),
      seo: this.calculateSEO(text, options),
      statistics: {
        words: text.split(/\s+/).filter(w => w.length > 0).length,
        sentences: text.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
        paragraphs: text.split(/\n\n+/).filter(p => p.trim().length > 0).length,
        characters: text.length
      }
    };
    
    // Add document-level suggestions
    suggestions.push(...this.getDocumentSuggestions(text, metrics, options));
    
    return { suggestions, metrics };
  }
}
```

### 2. React Hook for Editor Integration

```typescript
// hooks/useUnifiedAnalysis.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { Editor } from '@tiptap/core';
import { UnifiedAnalysisEngine } from '@/services/analysis/unified-engine';
import { debounce } from 'lodash';

interface UseUnifiedAnalysisOptions {
  languageToolApiKey?: string;
  enableLanguageTool?: boolean;
  targetKeyword?: string;
  documentTitle?: string;
  metaDescription?: string;
  slug?: string;
}

export function useUnifiedAnalysis(
  editor: Editor | null,
  options: UseUnifiedAnalysisOptions = {}
) {
  const [suggestions, setSuggestions] = useState<UnifiedSuggestion[]>([]);
  const [metrics, setMetrics] = useState<DocumentMetrics | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const engineRef = useRef<UnifiedAnalysisEngine>();
  const lastTextRef = useRef<string>('');
  
  // Initialize engine
  useEffect(() => {
    engineRef.current = new UnifiedAnalysisEngine({
      languageToolApiKey: options.languageToolApiKey
    });
  }, [options.languageToolApiKey]);
  
  // Debounced check functions
  const instantCheck = useCallback((text: string, lastWord: string) => {
    if (!engineRef.current) return;
    
    engineRef.current.analyze(text, 'instant', { lastWord })
      .then(result => {
        setSuggestions(prev => {
          // Merge instant suggestions with existing
          const filtered = prev.filter(s => s.source !== 'spelling' && s.source !== 'grammar');
          return [...filtered, ...result.suggestions];
        });
      });
  }, []);
  
  const sentenceCheck = useRef(debounce((text: string, position: number) => {
    if (!engineRef.current) return;
    
    setIsAnalyzing(true);
    engineRef.current.analyze(text, 'sentence', {
      position,
      useLanguageTool: options.enableLanguageTool
    })
      .then(result => {
        setSuggestions(result.suggestions);
        setIsAnalyzing(false);
      });
  }, 500));
  
  const paragraphCheck = useRef(debounce((text: string, position: number) => {
    if (!engineRef.current) return;
    
    engineRef.current.analyze(text, 'paragraph', {
      position,
      useLanguageTool: options.enableLanguageTool
    })
      .then(result => {
        setSuggestions(result.suggestions);
      });
  }, 2000));
  
  const documentCheck = useRef(debounce((text: string) => {
    if (!engineRef.current) return;
    
    engineRef.current.analyze(text, 'document', {
      targetKeyword: options.targetKeyword,
      title: options.documentTitle,
      metaDescription: options.metaDescription,
      slug: options.slug,
      content: editor?.getJSON(),
      useLanguageTool: options.enableLanguageTool
    })
      .then(result => {
        setSuggestions(result.suggestions);
        setMetrics(result.metrics || null);
      });
  }, 3000));
  
  // Watch editor changes
  useEffect(() => {
    if (!editor) return;
    
    const handleUpdate = () => {
      const text = editor.getText();
      const { from } = editor.state.selection;
      
      // Detect what changed
      const lastChar = text[from - 1] || '';
      const lastTwoChars = text.slice(Math.max(0, from - 2), from);
      
      // Clear pending checks
      sentenceCheck.current.cancel();
      paragraphCheck.current.cancel();
      documentCheck.current.cancel();
      
      // Instant check after space (new word)
      if (lastChar === ' ' || lastChar === '\n') {
        const words = text.slice(0, from).split(/\s+/);
        const lastWord = words[words.length - 2]; // -2 because last is empty
        if (lastWord) {
          instantCheck(text, lastWord);
        }
      }
      
      // Sentence check after punctuation
      if (['.', '!', '?'].includes(lastChar)) {
        sentenceCheck.current(text, from);
      }
      
      // Paragraph check after double newline
      if (lastTwoChars === '\n\n') {
        paragraphCheck.current(text, from);
      }
      
      // Always schedule document check
      documentCheck.current(text);
      
      lastTextRef.current = text;
    };
    
    editor.on('update', handleUpdate);
    return () => editor.off('update', handleUpdate);
  }, [editor, instantCheck, options]);
  
  // Apply suggestion
  const applySuggestion = useCallback((suggestion: UnifiedSuggestion) => {
    if (!editor || !engineRef.current) return;
    
    const text = editor.getText();
    const newText = engineRef.current.applySuggestion(text, suggestion);
    
    // Calculate the change to apply to editor
    const start = suggestion.position.start;
    const end = suggestion.position.end;
    const replacement = suggestion.suggestions[0];
    
    // Apply change through editor transaction
    editor
      .chain()
      .focus()
      .setTextSelection({ from: start + 1, to: end + 1 }) // +1 for TipTap positions
      .insertContent(replacement)
      .run();
    
    // Remove this suggestion
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  }, [editor]);
  
  // Ignore suggestion
  const ignoreSuggestion = useCallback((suggestionId: string) => {
    if (!engineRef.current) return;
    
    engineRef.current.ignoreSuggestion(suggestionId);
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  }, []);
  
  return {
    suggestions,
    metrics,
    isAnalyzing,
    applySuggestion,
    ignoreSuggestion,
    clearIgnored: () => engineRef.current?.clearIgnored()
  };
}
```

### 3. UI Components Integration

```typescript
// components/editor/BlogEditor.tsx
import { useUnifiedAnalysis } from '@/hooks/useUnifiedAnalysis';

export function BlogEditor({ document }: { document: Document }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      // ... other extensions
    ],
    content: document.content
  });
  
  const {
    suggestions,
    metrics,
    isAnalyzing,
    applySuggestion,
    ignoreSuggestion
  } = useUnifiedAnalysis(editor, {
    languageToolApiKey: process.env.NEXT_PUBLIC_LANGUAGETOOL_API_KEY,
    enableLanguageTool: true, // Could be a user preference
    targetKeyword: document.targetKeyword,
    documentTitle: document.title,
    metaDescription: document.metaDescription,
    slug: document.slug
  });
  
  return (
    <div className="editor-container">
      <EditorContent editor={editor} />
      
      <SuggestionsPanel
        suggestions={suggestions}
        onApply={applySuggestion}
        onIgnore={ignoreSuggestion}
        isAnalyzing={isAnalyzing}
      />
      
      <StatusBar metrics={metrics} />
    </div>
  );
}
```

```typescript
// components/SuggestionsPanel.tsx
export function SuggestionsPanel({
  suggestions,
  onApply,
  onIgnore,
  isAnalyzing
}: SuggestionsPanelProps) {
  // Group by category
  const grouped = suggestions.reduce((acc, suggestion) => {
    const category = suggestion.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(suggestion);
    return acc;
  }, {} as Record<string, UnifiedSuggestion[]>);
  
  return (
    <div className="suggestions-panel">
      {isAnalyzing && <div className="loading">Analyzing...</div>}
      
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="category-group">
          <h3>{category} ({items.length})</h3>
          
          {items.map(suggestion => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onApply={() => onApply(suggestion)}
              onIgnore={() => onIgnore(suggestion.id)}
            />
          ))}
        </div>
      ))}
      
      {suggestions.length === 0 && !isAnalyzing && (
        <div className="no-suggestions">
          Great job! No issues found.
        </div>
      )}
    </div>
  );
}
```

## Integration Guide

### Step 1: Install Dependencies

```bash
# Required packages
bun add nspell dictionary-en write-good text-readability reading-time keyword-extractor string-similarity
bun add -D @types/text-readability
```

### Step 2: Set Up Environment Variables

```env
# .env.local
NEXT_PUBLIC_LANGUAGETOOL_API_KEY=your_api_key_here
```

### Step 3: Create API Route for LanguageTool

```typescript
// app/api/languagetool/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { text, language = 'en-US' } = await request.json();
  
  try {
    const response = await fetch('https://api.languagetoolplus.com/v2/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        text,
        language,
        apiKey: process.env.LANGUAGETOOL_API_KEY!
      })
    });
    
    if (!response.ok) {
      throw new Error(`LanguageTool API error: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('LanguageTool API error:', error);
    return NextResponse.json(
      { error: 'Grammar check unavailable' },
      { status: 503 }
    );
  }
}
```

### Step 4: Initialize in Your App

```typescript
// app/doc/[id]/page.tsx
import { BlogEditor } from '@/components/editor/BlogEditor';

export default function DocumentPage({ params }: { params: { id: string } }) {
  // Load document...
  
  return <BlogEditor document={document} />;
}
```

## Fallback Strategy

The system gracefully degrades when LanguageTool is unavailable:

1. **API Credits Exhausted**: System continues with local checks only
2. **Network Issues**: Cached results used, new checks use local tools
3. **API Errors**: Error logged, suggestion silently skipped
4. **User Preference**: Can disable LanguageTool in settings

```typescript
// Example fallback flow
async function checkGrammar(text: string) {
  let suggestions = [];
  
  // Always run local checks
  suggestions.push(...await localGrammarCheck(text));
  suggestions.push(...await spellCheck(text));
  suggestions.push(...await styleCheck(text));
  
  // Try LanguageTool if available
  if (languageToolEnabled && !rateLimited) {
    try {
      const ltSuggestions = await languageTool.check(text);
      suggestions.push(...ltSuggestions);
    } catch (error) {
      console.warn('LanguageTool unavailable, using local checks only');
      // System continues working!
    }
  }
  
  return suggestions;
}
```

## Testing & Debugging

### Test Different Scenarios

```typescript
// Test text with various issues
const testText = `
i dont think this is write. the the sentence has issues.
This sentence is written in passive voice by me.
monday is a day of the week.Its a nice day today .
`;

// Should detect:
// - "i" → "I"
// - "dont" → "don't"
// - "write" → "right" (if LanguageTool active)
// - "the the" → "the"
// - Passive voice warning
// - "monday" → "Monday"
// - "Its" → "It's"
// - Space before period
```

### Debug Mode

```typescript
// Enable debug logging
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('Instant check:', instantResults);
  console.log('Sentence check:', sentenceResults);
  console.log('LanguageTool available:', this.languageTool?.isAvailable());
}
```

### Performance Monitoring

```typescript
// Monitor check times
const startTime = performance.now();
const results = await this.analyze(text, 'sentence');
const elapsed = performance.now() - startTime;

if (elapsed > 1000) {
  console.warn(`Slow analysis: ${elapsed}ms for ${text.length} characters`);
}
```

## Summary

This unified system:
1. **Always works** - Falls back to local tools if API unavailable
2. **Scales progressively** - Instant basics, delayed advanced checks
3. **Preserves user choices** - Remembers ignored suggestions
4. **Provides consistent UI** - All tools output same format
5. **Optimizes performance** - Smart caching and debouncing

The developer implementing this needs to:
1. Install the npm packages
2. Copy the code structure
3. Set up the API route
4. Add their LanguageTool API key
5. Integrate with their editor component

Everything else works automatically!
