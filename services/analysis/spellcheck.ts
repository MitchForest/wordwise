import type { Dictionary } from 'nspell';

export interface SpellCheckResult {
  word: string;
  position: number;
  length: number;
  suggestions: string[];
  type: 'spelling';
}

export class SpellChecker {
  private dictionary: Dictionary | null = null;
  private initialized = false;
  private customWords: Set<string> = new Set();
  
  async init(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Dynamic imports for better code splitting
      const [nspell, dict] = await Promise.all([
        import('nspell'),
        import('dictionary-en')
      ]);
      
      // Create dictionary instance
      this.dictionary = nspell.default(dict.default);
      
      // Add common technical terms
      this.addCustomWords([
        'api', 'url', 'json', 'css', 'html', 'javascript', 'typescript',
        'react', 'nextjs', 'nodejs', 'npm', 'git', 'github', 'gitlab',
        'frontend', 'backend', 'fullstack', 'ui', 'ux', 'seo', 'cms',
        'wordpress', 'blog', 'blogging', 'async', 'await', 'const', 'let'
      ]);
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize spell checker:', error);
      throw new Error('Spell checker initialization failed');
    }
  }
  
  addCustomWords(words: string[]): void {
    words.forEach(word => {
      this.customWords.add(word.toLowerCase());
      this.dictionary?.add(word.toLowerCase());
      // Also add capitalized version
      const capitalized = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      this.dictionary?.add(capitalized);
    });
  }
  
  async check(text: string): Promise<SpellCheckResult[]> {
    await this.init();
    
    if (!this.dictionary) return [];
    
    const results: SpellCheckResult[] = [];
    const wordRegex = /\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b/g;
    let match;
    
    while ((match = wordRegex.exec(text)) !== null) {
      const word = match[0];
      const position = match.index;
      
      // Skip if word is too short or is a number
      if (word.length <= 2 || /^\d+$/.test(word)) continue;
      
      // Check if word is spelled correctly
      if (!this.isCorrect(word)) {
        const suggestions = this.getSuggestions(word);
        
        results.push({
          word,
          position,
          length: word.length,
          suggestions: suggestions.slice(0, 3), // Limit to 3 suggestions
          type: 'spelling'
        });
      }
    }
    
    return results;
  }
  
  private isCorrect(word: string): boolean {
    if (!this.dictionary) return true;
    
    // Check original word
    if (this.dictionary.correct(word)) return true;
    
    // Check lowercase version
    if (this.dictionary.correct(word.toLowerCase())) return true;
    
    // Check if it's in custom words
    if (this.customWords.has(word.toLowerCase())) return true;
    
    // Check if it's an acronym (all caps)
    if (word === word.toUpperCase() && word.length <= 5) return true;
    
    // Check camelCase or PascalCase
    if (this.isCamelCase(word)) {
      return this.checkCamelCase(word);
    }
    
    return false;
  }
  
  private getSuggestions(word: string): string[] {
    if (!this.dictionary) return [];
    
    const suggestions: string[] = [];
    
    // Get suggestions for original word
    suggestions.push(...this.dictionary.suggest(word));
    
    // If word is capitalized, also get suggestions for lowercase
    if (word[0] === word[0].toUpperCase()) {
      const lowerSuggestions = this.dictionary.suggest(word.toLowerCase());
      // Capitalize suggestions
      suggestions.push(...lowerSuggestions.map((s: string) => 
        s.charAt(0).toUpperCase() + s.slice(1)
      ));
    }
    
    // Remove duplicates and return unique suggestions
    return [...new Set(suggestions)];
  }
  
  private isCamelCase(word: string): boolean {
    return /^[a-z]+(?:[A-Z][a-z]*)*$/.test(word) || /^[A-Z][a-z]+(?:[A-Z][a-z]*)*$/.test(word);
  }
  
  private checkCamelCase(word: string): boolean {
    // Split camelCase word into parts
    const parts = word.split(/(?=[A-Z])/).filter(part => part.length > 0);
    
    // Check each part
    return parts.every(part => {
      const lower = part.toLowerCase();
      return this.dictionary?.correct(lower) || this.customWords.has(lower) || lower.length <= 2;
    });
  }
  
  // Get word count for text
  getWordCount(text: string): number {
    const words = text.match(/\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b/g);
    return words ? words.length : 0;
  }
}