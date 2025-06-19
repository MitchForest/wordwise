/**
 * @file services/analysis/retext-processor.ts
 * @purpose Client-side text analysis using retext plugins with progressive loading
 * @created 2024-12-28
 */

import { unified } from 'unified';
import retextEnglish from 'retext-english';
import retextStringify from 'retext-stringify';
import type { VFile } from 'vfile';

export class RetextProcessor {
  private grammarProcessor: any;
  private styleProcessor: any;
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
      // Core plugins loaded immediately (browser-compatible)
      const [
        { default: retextRepeatedWords },
        { default: retextSentenceSpacing },
        { default: retextIndefiniteArticle }
      ] = await Promise.all([
        import('retext-repeated-words'),
        import('retext-sentence-spacing'),
        import('retext-indefinite-article')
      ]);
      
      // Grammar processor (spell checking handled separately by Typo.js)
      this.grammarProcessor = unified()
        .use(retextEnglish)
        .use(retextRepeatedWords)
        .use(retextSentenceSpacing)
        .use(retextIndefiniteArticle)
        .use(retextStringify);
      
      // Style checks are also loaded, but can be run separately
      const [
        { default: retextPassive },
        { default: retextSimplify },
        { default: retextQuotes },
        { default: retextContractions },
        { default: retextReadability },
        { default: retextEquality }
      ] = await Promise.all([
        import('retext-passive'),
        import('retext-simplify'),
        import('retext-quotes'),
        import('retext-contractions'),
        import('retext-readability'),
        import('retext-equality')
      ]);
        
      this.styleProcessor = unified()
        .use(retextEnglish)
        .use(retextPassive)
        .use(retextSimplify)
        .use(retextQuotes)
        .use(retextContractions, { straight: true })
        .use(retextReadability, {
          age: 16, // Target reading age
          minWords: 5 // Min words per sentence for analysis
        })
        .use(retextEquality)
        .use(retextStringify);
            
      this.isInitialized = true;
      console.log('[Retext] All processors initialized');
    } catch (error) {
      console.error('[Retext] Initialization failed:', error);
      this.initPromise = null;
      throw error;
    }
  }
  
  async runGrammarCheck(text: string): Promise<VFile['messages']> {
    await this.initialize();

    try {
      if (!this.grammarProcessor) {
        console.warn('[Retext] Grammar processor not available, skipping check.');
        return [];
      }
      
      const file = await this.grammarProcessor.process(text);
      return file.messages || [];
    } catch (error) {
      console.error('[Retext] Grammar check error:', error);
      return [];
    }
  }
  
  async runStyleCheck(text: string): Promise<VFile['messages']> {
    await this.initialize();
    
    if (!this.styleProcessor) {
      console.warn('[Retext] Style processor not available, skipping check.');
      return []; 
    }
    
    try {
      const file = await this.styleProcessor.process(text);
      return file.messages;
    } catch (error) {
      console.error('[Retext] Style check error:', error);
      return [];
    }
  }
  
  // Cleanup method for memory management
  cleanup() {
    this.grammarProcessor = null;
    this.styleProcessor = null;
    this.isInitialized = false;
    this.initPromise = null;
  }
}

export const retextProcessor = new RetextProcessor(); 