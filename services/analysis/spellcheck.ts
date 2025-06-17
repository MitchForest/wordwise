export interface SpellCheckResult {
  word: string;
  position: number;
  length: number;
  suggestions: string[];
  type: 'spelling';
}

export class SpellChecker {
  private cache: Map<string, { correct: boolean; suggestions: string[] }> = new Map();
  private customWords: Set<string> = new Set([
    'api', 'url', 'json', 'css', 'html', 'javascript', 'typescript',
    'react', 'nextjs', 'nodejs', 'npm', 'git', 'github', 'gitlab',
    'frontend', 'backend', 'fullstack', 'ui', 'ux', 'seo', 'cms',
    'wordpress', 'blog', 'blogging', 'async', 'await', 'const', 'let'
  ]);
  
  async init(): Promise<void> {
    // No initialization needed for API-based approach
  }
  
  addCustomWords(words: string[]): void {
    words.forEach(word => {
      this.customWords.add(word.toLowerCase());
      // Also add capitalized version
      const capitalized = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      this.customWords.add(capitalized);
    });
  }
  
  async check(text: string): Promise<SpellCheckResult[]> {
    await this.init();
    
    const results: SpellCheckResult[] = [];
    const wordRegex = /\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b/g;
    const words: Array<{ word: string; position: number }> = [];
    let match;
    
    // Extract all words with positions
    while ((match = wordRegex.exec(text)) !== null) {
      const word = match[0];
      const position = match.index;
      
      // Skip if word is too short or is a number
      if (word.length <= 2 || /^\d+$/.test(word)) continue;
      
      words.push({ word, position });
    }
    
    // Check all words in batch
    const wordList = words.map(w => w.word);
    const checkedWords = await this.checkWords(wordList);
    
    // Build results
    for (const { word, position } of words) {
      const result = checkedWords.get(word);
      if (result && !result.correct) {
        results.push({
          word,
          position,
          length: word.length,
          suggestions: result.suggestions,
          type: 'spelling'
        });
      }
    }
    
    return results;
  }
  
  private async checkWords(words: string[]): Promise<Map<string, { correct: boolean; suggestions: string[] }>> {
    const results = new Map<string, { correct: boolean; suggestions: string[] }>();
    
    // Check cache first
    const uncachedWords: string[] = [];
    for (const word of words) {
      if (this.cache.has(word)) {
        results.set(word, this.cache.get(word)!);
      } else if (this.isLocallyCorrect(word)) {
        const result = { correct: true, suggestions: [] };
        results.set(word, result);
        this.cache.set(word, result);
      } else {
        uncachedWords.push(word);
      }
    }
    
    // Check uncached words via API
    if (uncachedWords.length > 0) {
      try {
        const response = await fetch('/api/spellcheck', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ words: uncachedWords })
        });
        
        if (response.ok) {
          const data = await response.json();
          for (const [word, result] of Object.entries(data.results)) {
            results.set(word, result as { correct: boolean; suggestions: string[] });
            this.cache.set(word, result as { correct: boolean; suggestions: string[] });
          }
        }
      } catch (error) {
        console.error('Spellcheck API error:', error);
        // Fallback: mark as correct to avoid false positives
        for (const word of uncachedWords) {
          results.set(word, { correct: true, suggestions: [] });
        }
      }
    }
    
    return results;
  }
  
  private isLocallyCorrect(word: string): boolean {
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
  
  private isCamelCase(word: string): boolean {
    return /^[a-z]+(?:[A-Z][a-z]*)*$/.test(word) || /^[A-Z][a-z]+(?:[A-Z][a-z]*)*$/.test(word);
  }
  
  private checkCamelCase(word: string): boolean {
    // Split camelCase word into parts
    const parts = word.split(/(?=[A-Z])/).filter(part => part.length > 0);
    
    // Check each part
    return parts.every(part => {
      const lower = part.toLowerCase();
      return this.customWords.has(lower) || lower.length <= 2;
    });
  }
  
  // Get word count for text
  getWordCount(text: string): number {
    const words = text.match(/\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b/g);
    return words ? words.length : 0;
  }
}