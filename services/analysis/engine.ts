import { ReadabilityAnalyzer } from './readability';
import { SEOAnalyzer } from './seo';
import { StyleAnalyzer } from './style';
import { UnifiedSuggestion } from '@/types/suggestions';
import { spellChecker } from './spellcheck';

// This will be expanded with local checkers in Phase 1
// For now, we only define the structure.

export class UnifiedAnalysisEngine {
  private readabilityAnalyzer: ReadabilityAnalyzer;
  private seoAnalyzer: SEOAnalyzer;
  private styleAnalyzer: StyleAnalyzer;
  private isInitialized = false;

  constructor() {
    this.readabilityAnalyzer = new ReadabilityAnalyzer();
    this.seoAnalyzer = new SEOAnalyzer();
    this.styleAnalyzer = new StyleAnalyzer();
  }

  async initialize() {
    if (this.isInitialized) return;
    await spellChecker.initialize();
    this.isInitialized = true;
    console.log('AnalysisEngine initialized');
  }

  // Tier 1: Instant checks (local, ~0-50ms)
  async runInstantChecks(text: string) {
    // Phase 1: Will implement nspell for spell checking here
    return Promise.resolve([]);
  }

  // Tier 2: Smart checks (local, ~300-500ms)
  async runSmartChecks(text: string) {
    // Phase 2: Will implement write-good for style checking here
    return Promise.resolve([]);
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

  run(doc: any): UnifiedSuggestion[] {
    if (!this.isInitialized || !doc) return [];
    
    const spellingSuggestions = this.runSpellCheck(doc);
    // In the future, other analyses will be added here and their results merged.

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