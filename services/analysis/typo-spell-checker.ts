/**
 * @file services/analysis/typo-spell-checker.ts
 * @purpose Browser-compatible spell checking using Typo.js
 * @created 2024-12-28
 */

// @ts-ignore - typo-js doesn't have types
import Typo from 'typo-js';
import { UnifiedSuggestion } from '@/types/suggestions';

export class TypoSpellChecker {
  private typo: Typo | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  
  async initialize() {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this._initialize();
    return this.initPromise;
  }
  
  private async _initialize() {
    try {
      // Load US English dictionary files from CDN
      const [affData, dicData] = await Promise.all([
        fetch('https://cdn.jsdelivr.net/npm/typo-js@1.2.5/dictionaries/en_US/en_US.aff').then(r => r.text()),
        fetch('https://cdn.jsdelivr.net/npm/typo-js@1.2.5/dictionaries/en_US/en_US.dic').then(r => r.text())
      ]);
      
      this.typo = new Typo('en_US', affData, dicData);
      this.isInitialized = true;
      console.log('[TypoSpellChecker] Initialized successfully');
    } catch (error) {
      console.error('[TypoSpellChecker] Failed to initialize:', error);
      throw error;
    }
  }
  
  check(word: string): boolean {
    if (!this.isInitialized || !this.typo) return true; // Assume correct if not ready
    return this.typo.check(word);
  }
  
  suggest(word: string): string[] {
    if (!this.isInitialized || !this.typo) return [];
    return this.typo.suggest(word) || [];
  }
  
  /**
   * Analyze text and return spelling suggestions in UnifiedSuggestion format
   */
  analyzeText(text: string): UnifiedSuggestion[] {
    if (!this.isInitialized || !this.typo) return [];
    
    const suggestions: UnifiedSuggestion[] = [];
    const customWords = new Set([
      'blog', 'blogging', 'blogger', 'SEO', 'SERP', 'CMS', 'API',
      'URL', 'URLs', 'UI', 'UX', 'metadata', 'permalink',
      'TipTap', 'WordWise', 'Next.js', 'TypeScript', 'JavaScript',
      'Vercel', 'Tailwind', 'Drizzle', 'Shadcn', 'js', 'css'
    ]);
    
    // Find all words in the text
    const wordRegex = /\b[a-zA-Z]+\b/g;
    let match;
    
    while ((match = wordRegex.exec(text)) !== null) {
      const word = match[0];
      const position = match.index;
      
      // Skip custom dictionary words
      if (customWords.has(word.toLowerCase())) continue;
      
      // Check if word is misspelled
      if (!this.check(word)) {
        const corrections = this.suggest(word);
        
        suggestions.push({
          id: `typo-spell-${word.toLowerCase()}-${position}`,
          category: 'spelling' as const,
          subCategory: 'misspelling' as any,
          ruleId: 'typo-js/misspelling' as any,
          title: 'Spelling Error',
          message: `"${word}" may be misspelled.`,
          severity: 'error' as const,
          matchText: word,
          context: {
            text: word,
            before: text.slice(Math.max(0, position - 20), position),
            after: text.slice(position + word.length, position + word.length + 20)
          },
          position: {
            start: position,
            end: position + word.length
          },
          originalFrom: position,
          originalTo: position + word.length,
          actions: corrections.slice(0, 5).map(correction => ({
            type: 'fix' as const,
            label: correction,
            value: correction,
            handler: () => {} // Placeholder handler
          }))
        });
      }
    }
    
    return suggestions;
  }
  
  cleanup() {
    this.typo = null;
    this.isInitialized = false;
    this.initPromise = null;
  }
}

export const typoSpellChecker = new TypoSpellChecker();