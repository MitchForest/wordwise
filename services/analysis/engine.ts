/**
 * @file services/analysis/engine.ts
 * @purpose This is the main analysis orchestrator. It initializes and runs all the
 * different analysis services (spelling, grammar, style, seo, metrics) in different
 * tiers based on their performance characteristics (real-time, fast, deep). It is
 * consumed by the `useUnifiedAnalysis` hook.
 * @modified 2024-12-28 - Updated to use text-based suggestions
 */
import { SEOAnalyzer } from './seo';
import { StyleAnalyzer } from './style';
import { BasicGrammarChecker } from './basic-grammar';
import { DocumentMetricAnalyzer } from './metrics';
import { UnifiedSuggestion, SPELLING_SUB_CATEGORY } from '@/types/suggestions';
import { spellChecker } from './spellcheck';
import { createSuggestion } from '@/lib/editor/suggestion-factory';
import { getSchema } from '@tiptap/core';
import { serverEditorExtensions } from '@/lib/editor/tiptap-extensions.server';

const SPELLCHECK_RULE_ID = 'spelling/misspelling';

export interface DocumentMetrics {
  grammarScore: number;
  readingLevel: string;
  seoScore: number;
  wordCount: number;
  readingTime: string;
}

export class UnifiedAnalysisEngine {
  private seoAnalyzer: SEOAnalyzer;
  private styleAnalyzer: StyleAnalyzer;
  private basicGrammarChecker: BasicGrammarChecker;
  private metricAnalyzer: DocumentMetricAnalyzer;
  private isInitialized = false;

  constructor() {
    this.seoAnalyzer = new SEOAnalyzer();
    this.styleAnalyzer = new StyleAnalyzer();
    this.basicGrammarChecker = new BasicGrammarChecker();
    this.metricAnalyzer = new DocumentMetricAnalyzer();
  }

  async initialize() {
    if (this.isInitialized) return;
    await spellChecker.initialize();
    this.isInitialized = true;
    console.log('AnalysisEngine initialized');
  }

  // Tier 1: Instant checks (local, ~0-50ms) - E.g., Spelling
  runInstantChecks(doc: any): UnifiedSuggestion[] {
    if (!this.isInitialized || !doc) return [];
    return this.runSpellCheck(doc);
  }

  // Tier 1.5: Real-time checks (local, ~0-5ms) - E.g., single-word spellcheck
  runRealtimeSpellCheck(word: string, jsonDoc: any): UnifiedSuggestion[] {
    if (!this.isInitialized || !spellChecker.isReady() || !jsonDoc) return [];
  
    if (spellChecker.check(word)) {
      return [];
    }

    // Create a real Tiptap document from the incoming JSON
    const schema = getSchema(serverEditorExtensions);
    const doc = schema.nodeFromJSON(jsonDoc);
    const documentText = doc.textContent;
  
    // Find all occurrences of the misspelled word to create suggestions
    const suggestions: UnifiedSuggestion[] = [];
    doc.descendants((node: any, pos: number) => {
      if (!node.isText || !node.text) {
        return;
      }
  
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      let match;
      while ((match = regex.exec(node.text)) !== null) {
        const from = pos + match.index;
        const to = from + word.length;
        const suggested = spellChecker.suggest(word);
        
        suggestions.push(
          createSuggestion(
            from,
            to,
            word,
            documentText,
            'spelling',
            SPELLING_SUB_CATEGORY.MISSPELLING,
            SPELLCHECK_RULE_ID,
            'Spelling Error',
            `"${word}" may be misspelled.`,
            suggested.map(s => ({
              label: s,
              type: 'fix',
              value: s,
              handler: () => {}, // Placeholder
            })),
            'error'
          )
        );
      }
    });
    
    return suggestions;
  }

  // Tier 2: Smart checks (local, ~300-500ms) - E.g., Style, Basic Grammar
  runFastChecks(doc: any): UnifiedSuggestion[] {
    if (!this.isInitialized || !doc) return [];
    
    // Get document text once for all analyzers
    const documentText = doc.textContent;
    
    const styleSuggestions = this.styleAnalyzer.run(doc, documentText);
    const grammarSuggestions = this.basicGrammarChecker.run(doc, documentText);
    const spellingSuggestions = this.runSpellCheck(doc);
    
    const allSuggestions = [...styleSuggestions, ...grammarSuggestions, ...spellingSuggestions];
    
    console.log('[runFastChecks] Returning suggestions:', {
      style: styleSuggestions.length,
      grammar: grammarSuggestions.length,
      spelling: spellingSuggestions.length,
      total: allSuggestions.length,
      firstSuggestion: allSuggestions[0] ? {
        id: allSuggestions[0].id,
        category: allSuggestions[0].category,
        matchText: allSuggestions[0].matchText,
        hasPosition: !!allSuggestions[0].position
      } : null
    });
    
    return allSuggestions;
  }

  // Tier 3: Deep checks (API-driven, ~2000ms)
  async runDeepChecks(
    doc: any,
    documentMetadata: {
      title: string;
      metaDescription: string;
      targetKeyword: string;
      keywords: string[];
    }
  ): Promise<{ suggestions: UnifiedSuggestion[]; metrics: DocumentMetrics }> {
    if (!this.isInitialized || !doc) {
      return Promise.resolve({
        suggestions: [],
        metrics: {
          grammarScore: 0,
          readingLevel: 'N/A',
          seoScore: 0,
          wordCount: 0,
          readingTime: '0 min read',
        },
      });
    }

    const plainText = doc.textContent;

    // --- Run All Deep Analyzers ---
    const seoResult = this.seoAnalyzer.analyze({
      ...documentMetadata,
      content: doc.toJSON(), // Pass the raw JSON content
      plainText,
    });
    
    const metricsResult = this.metricAnalyzer.run(doc);
    
    const fastCheckSuggestions = this.runFastChecks(doc);
    const grammarScore = Math.max(0, 100 - fastCheckSuggestions.length * 5);
    
    const metrics: DocumentMetrics = {
      grammarScore,
      readingLevel: metricsResult.readingLevel,
      seoScore: Math.round(seoResult.score),
      wordCount: metricsResult.wordCount,
      readingTime: metricsResult.readingTime,
    };
    
    // The new SEO analyzer already returns UnifiedSuggestion objects.
    // We can use them directly.
    return { suggestions: seoResult.suggestions, metrics };
  }
  
  /**
   * @deprecated The `run` method is deprecated in favor of tiered execution
   * (e.g., `runInstantChecks`, `runFastChecks`). It is maintained for now
   * to avoid breaking existing implementations but will be removed.
   */
  run(doc: any): UnifiedSuggestion[] {
    if (!this.isInitialized || !doc) return [];
    
    // For now, we only run instant checks to maintain existing behavior.
    // This will be updated by the consuming hook.
    const spellingSuggestions = this.runInstantChecks(doc);
    return spellingSuggestions;
  }

  private runSpellCheck(doc: any): UnifiedSuggestion[] {
    if (!spellChecker.isReady()) return [];
    
    const suggestions: UnifiedSuggestion[] = [];
    const checkedWords = new Set<string>(); // Prevent duplicate checks for the same word
    const documentText = doc.textContent;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[runSpellCheck] Document text length:', documentText.length);
      console.log('[runSpellCheck] Document preview:', documentText.substring(0, 100) + '...');
    }

    doc.descendants((node: any, pos: number) => {
      if (!node.isText || !node.text) {
        return;
      }

      const words = node.text.matchAll(/\b[\w']+\b/g);
      for (const match of words) {
        const word = match[0];
        
        if (checkedWords.has(word) || spellChecker.check(word)) {
          checkedWords.add(word);
          continue;
        }
        
        checkedWords.add(word);
        const from = pos + match.index!;
        const to = from + word.length;
        const suggested = spellChecker.suggest(word);
        
        if (process.env.NODE_ENV === 'development') {
          const actualText = documentText.substring(from, to);
          console.log('[runSpellCheck] Creating suggestion for:', {
            word,
            from,
            to,
            pos,
            matchIndex: match.index,
            nodeText: node.text.substring(0, 50) + '...',
            actualTextAtPosition: actualText,
            matches: word === actualText
          });
        }
        
        suggestions.push(
          createSuggestion(
            from,
            to,
            word,
            documentText,
            'spelling',
            SPELLING_SUB_CATEGORY.MISSPELLING,
            SPELLCHECK_RULE_ID,
            'Spelling Error',
            `"${word}" may be misspelled.`,
            suggested.map(s => ({
              label: s,
              type: 'fix',
              value: s,
              handler: () => {}, // Placeholder
            })),
            'error'
          )
        );
      }
    });

    return suggestions;
  }
}