import { ReadabilityAnalyzer } from './readability';
import { SEOAnalyzer } from './seo';
import { StyleAnalyzer } from './style';
import { BasicGrammarChecker } from './basic-grammar';
import { UnifiedSuggestion } from '@/types/suggestions';
import { spellChecker } from './spellcheck';

// This will be expanded with local checkers in Phase 1
// For now, we only define the structure.

export class UnifiedAnalysisEngine {
  private readabilityAnalyzer: ReadabilityAnalyzer;
  private seoAnalyzer: SEOAnalyzer;
  private styleAnalyzer: StyleAnalyzer;
  private basicGrammarChecker: BasicGrammarChecker;
  private isInitialized = false;

  constructor() {
    this.readabilityAnalyzer = new ReadabilityAnalyzer();
    this.seoAnalyzer = new SEOAnalyzer();
    this.styleAnalyzer = new StyleAnalyzer();
    this.basicGrammarChecker = new BasicGrammarChecker();
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

  // Tier 2: Smart checks (local, ~300-500ms) - E.g., Style, Basic Grammar
  runFastChecks(doc: any): UnifiedSuggestion[] {
    if (!this.isInitialized || !doc) return [];
    const styleSuggestions = this.styleAnalyzer.run(doc);
    const grammarSuggestions = this.basicGrammarChecker.run(doc);
    return [...styleSuggestions, ...grammarSuggestions];
  }

  // Tier 3: Deep checks (API-driven, ~2000ms)
  async runDeepChecks(text: string, document: any) {
    // Phase 3: Will re-integrate LanguageTool here
    return Promise.resolve({
      suggestions: [],
      scores: {
        overall: 0,
        grammar: 0,
        readability: 0,
        seo: 0,
      }
    });
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

        suggestions.push({
          id: `spell-${from}-${word}`,
          category: 'spelling',
          severity: 'error',
          title: 'Spelling Error',
          message: `"${word}" may be misspelled.`,
          position: { start: from, end: to },
          context: { text: word },
          actions: suggested.map(s => ({
            label: s,
            type: 'fix',
            value: s,
            handler: () => {} // Placeholder
          }))
        });
      }
    });

    return suggestions;
  }
}