/**
 * @file services/analysis/engine.ts
 * @purpose This is the main analysis orchestrator. It initializes and runs all the
 * different analysis services (spelling, grammar, style, seo, metrics) in different
 * tiers based on their performance characteristics (real-time, fast, deep). It is
 * consumed by the `useUnifiedAnalysis` hook.
 */
import { SEOAnalyzer } from './seo';
import { StyleAnalyzer } from './style';
import { BasicGrammarChecker } from './basic-grammar';
import { DocumentMetricAnalyzer } from './metrics';
import { UnifiedSuggestion } from '@/types/suggestions';
import { spellChecker } from './spellcheck';
import { createSuggestion } from '@/lib/editor/suggestion-factory';
import { getSchema } from '@tiptap/core';
import { serverEditorExtensions } from '@/lib/editor/tiptap-extensions.server';

export interface DocumentMetrics {
  overallScore: number;
  grammarScore: number;
  readabilityScore: number;
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
            'spelling',
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
    const styleSuggestions = this.styleAnalyzer.run(doc);
    const grammarSuggestions = this.basicGrammarChecker.run(doc);
    return [...styleSuggestions, ...grammarSuggestions];
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
          overallScore: 0,
          grammarScore: 0,
          readabilityScore: 0,
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
    
    const overallScore = Math.round(
      seoResult.score * 0.4 + metricsResult.readabilityScore * 0.4 + grammarScore * 0.2
    );

    const metrics: DocumentMetrics = {
      overallScore,
      grammarScore,
      readabilityScore: metricsResult.readabilityScore,
      seoScore: Math.round(seoResult.score),
      wordCount: metricsResult.wordCount,
      readingTime: metricsResult.readingTime,
    };
    
    // Convert SEO issues into UnifiedSuggestion format
    const seoSuggestions: UnifiedSuggestion[] = seoResult.issues.map((issue, index) => {
      // Find a more specific suggestion if available
      const detailedSuggestion = seoResult.suggestions.find(s => s.toLowerCase().includes(issue.split(' ')[0].toLowerCase()));

      return createSuggestion(
        0, 0, // SEO suggestions are document-level, no specific position
        'seo',
        'seo',
        'SEO Improvement',
        detailedSuggestion || issue,
        [], // No automated actions for SEO suggestions yet
        'suggestion'
      );
    });

    return { suggestions: seoSuggestions, metrics };
  }
  
  private convertFleschKincaidToScore(fk: number | null): number {
    if (fk === null || isNaN(fk)) return 0;
    if (fk > 100) return 100;
    if (fk < 0) return 0;
    return Math.round(fk);
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

        suggestions.push(
          createSuggestion(
            from,
            to,
            word,
            'spelling',
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