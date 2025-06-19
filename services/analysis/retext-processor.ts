/**
 * @file services/analysis/retext-processor.ts
 * @purpose Client-side text analysis using retext plugins with progressive loading
 * @created 2024-12-28
 */

import { unified } from 'unified';
import retextEnglish from 'retext-english';
import type { VFile } from 'vfile';

export class RetextProcessor {
  private spellProcessor: any;
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
      // Core plugins loaded immediately
      const [
        { default: retextRepeatedWords },
        { default: retextSentenceSpacing },
        { default: retextIndefiniteArticle }
      ] = await Promise.all([
        import('retext-repeated-words'),
        import('retext-sentence-spacing'),
        import('retext-indefinite-article')
      ]);
      
      // Instant checks (0ms) - temporarily skip spell checking
      this.spellProcessor = unified()
        .use(retextEnglish)
        .use(retextRepeatedWords)
        .use(retextSentenceSpacing)
        .use(retextIndefiniteArticle);
      
      // Style checks loaded after 100ms (progressive enhancement)
      setTimeout(async () => {
        try {
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
            .use(retextEquality);
            
          console.log('[Retext] Style processor initialized');
        } catch (error) {
          console.error('[Retext] Failed to load style plugins:', error);
        }
      }, 100);
      
      this.isInitialized = true;
      console.log('[Retext] Core processor initialized');
    } catch (error) {
      console.error('[Retext] Initialization failed:', error);
      this.initPromise = null;
      throw error;
    }
  }
  
  async runSpellCheck(text: string): Promise<VFile['messages']> {
    if (!this.isInitialized) await this.initialize();
    if (!this.spellProcessor) return [];
    
    try {
      const file = await this.spellProcessor.process(text);
      return file.messages;
    } catch (error) {
      console.error('[Retext] Spell check error:', error);
      return [];
    }
  }
  
  async runStyleCheck(text: string): Promise<VFile['messages']> {
    if (!this.isInitialized) await this.initialize();
    if (!this.styleProcessor) return []; // Graceful degradation
    
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
    this.spellProcessor = null;
    this.styleProcessor = null;
    this.isInitialized = false;
    this.initPromise = null;
  }
}

export const retextProcessor = new RetextProcessor(); 