// Using 'any' for the instance type to avoid all import issues.
type NspellInstance = any;

export interface SpellCheckResult {
  word: string;
  position: number;
  length: number;
  suggestions: string[];
  type: 'spelling';
}

class SpellCheckerService {
  private spell: NspellInstance | null = null;
  private initPromise: Promise<void> | null = null;
  private customWords = new Set<string>();

  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      // Dynamic import for nspell
      const { default: nspell } = await import('nspell');
      
      // Fetch dictionary from CDN to bypass Webpack's module resolution
      const dictionaryResponse = await fetch('https://unpkg.com/dictionary-en@4.0.0/index.dic');
      const dictionaryText = await dictionaryResponse.text();
      const affResponse = await fetch('https://unpkg.com/dictionary-en@4.0.0/index.aff');
      const affText = await affResponse.text();
      
      const dictionary = {
        dic: dictionaryText,
        aff: affText
      };

      this.spell = nspell(dictionary);

      const customWords = [
        'blog', 'blogging', 'blogger', 'SEO', 'SERP', 'CMS', 'API',
        'URL', 'URLs', 'UI', 'UX', 'metadata', 'permalink',
        'TipTap', 'WordWise', 'Next.js'
      ];
      customWords.forEach(word => {
        this.spell!.add(word);
        this.customWords.add(word.toLowerCase());
      });
      console.log('SpellChecker initialized successfully');
    } catch (error) {
      console.error('Failed to initialize spell checker:', error);
      this.initPromise = null;
      throw error;
    }
  }

  isReady(): boolean {
    return this.spell !== null;
  }

  private shouldSkipWord(word: string): boolean {
    if (this.customWords.has(word.toLowerCase())) return true;
    if (word.startsWith('http://') || word.startsWith('https://')) return true;
    if (word.includes('@')) return true;
    if (/\d/.test(word)) return true;
    if (word.length < 3) return true;
    if (/[A-Z]/.test(word.slice(1)) || word.includes('_')) return true;
    return false;
  }

  check(word: string): boolean {
    if (!this.spell || this.shouldSkipWord(word)) return true;
    return this.spell.correct(word);
  }

  suggest(word: string, limit: number = 5): string[] {
    if (!this.spell || this.shouldSkipWord(word)) return [];
    const suggestions = this.spell.suggest(word);
    return suggestions.slice(0, limit);
  }

  addWord(word: string): void {
    if (this.spell) {
      this.spell.add(word);
    }
    this.customWords.add(word.toLowerCase());
  }
}

export const spellChecker = new SpellCheckerService();