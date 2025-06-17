// Client-side spell checker that doesn't require Node.js APIs
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
    'wordpress', 'blog', 'blogging', 'async', 'await', 'const', 'let',
    'vercel', 'tailwind', 'prisma', 'postgresql', 'mongodb', 'tiptap',
    'prosemirror', 'contenteditable', 'wysiwyg', 'markdown', 'mdx'
  ]);
  
  // Common misspellings and corrections
  private commonMisspellings: Map<string, string[]> = new Map([
    ['teh', ['the']],
    ['recieve', ['receive']],
    ['occurence', ['occurrence']],
    ['seperate', ['separate']],
    ['definately', ['definitely']],
    ['occured', ['occurred']],
    ['untill', ['until']],
    ['wich', ['which']],
    ['doesnt', ["doesn't"]],
    ['dont', ["don't"]],
    ['wont', ["won't"]],
    ['cant', ["can't"]],
    ['wouldnt', ["wouldn't"]],
    ['couldnt', ["couldn't"]],
    ['shouldnt', ["shouldn't"]],
    ['havent', ["haven't"]],
    ['hasnt', ["hasn't"]],
    ['hadnt', ["hadn't"]],
    ['isnt', ["isn't"]],
    ['arent', ["aren't"]],
    ['wasnt', ["wasn't"]],
    ['werent', ["weren't"]],
    ['youre', ["you're"]],
    ['theyre', ["they're"]],
    ['theyve', ["they've"]],
    ['youve', ["you've"]],
    ['weve', ["we've"]],
    ['ive', ["I've"]],
    ['im', ["I'm"]],
    ['id', ["I'd"]],
    ['whats', ["what's"]],
    ['thats', ["that's"]],
    ['heres', ["here's"]],
    ['theres', ["there's"]],
    ['wheres', ["where's"]],
    ['whos', ["who's"]],
    ['lets', ["let's"]],
    ['its', ["it's", "its"]], // both are valid depending on context
    ['alot', ['a lot']],
    ['noone', ['no one']],
    ['atleast', ['at least']],
    ['infact', ['in fact']],
    ['incase', ['in case']],
    ['eachother', ['each other']],
  ]);
  
  async init(): Promise<void> {
    // No initialization needed for this approach
  }
  
  addCustomWords(words: string[]): void {
    words.forEach(word => {
      this.customWords.add(word.toLowerCase());
      const capitalized = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      this.customWords.add(capitalized);
    });
  }
  
  async check(text: string): Promise<SpellCheckResult[]> {
    const results: SpellCheckResult[] = [];
    
    // First, check for split words (e.g., "Wha tdo")
    const splitWordResults = this.checkSplitWords(text);
    results.push(...splitWordResults);
    
    // Then check individual words
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
        
        if (suggestions.length > 0) {
          results.push({
            word,
            position,
            length: word.length,
            suggestions: suggestions.slice(0, 3),
            type: 'spelling'
          });
        }
      }
    }
    
    return results;
  }
  
  private isCorrect(word: string): boolean {
    // Check if it's in custom words
    if (this.customWords.has(word.toLowerCase())) return true;
    
    // Check if it's an acronym (all caps)
    if (word === word.toUpperCase() && word.length <= 5) return true;
    
    // Check camelCase or PascalCase
    if (this.isCamelCase(word)) {
      return this.checkCamelCase(word);
    }
    
    // Check if it's a known misspelling
    if (this.commonMisspellings.has(word.toLowerCase())) {
      return false;
    }
    
    // For now, we'll only flag known misspellings
    // In a real implementation, you'd check against a dictionary
    return true;
  }
  
  private getSuggestions(word: string): string[] {
    const wordLower = word.toLowerCase();
    
    // Check common misspellings
    if (this.commonMisspellings.has(wordLower)) {
      const suggestions = this.commonMisspellings.get(wordLower)!;
      
      // Preserve original capitalization
      if (word[0] === word[0].toUpperCase()) {
        return suggestions.map(s => 
          s.charAt(0).toUpperCase() + s.slice(1)
        );
      }
      
      return suggestions;
    }
    
    // Generate suggestions based on common patterns
    const suggestions: string[] = [];
    
    // Check for missing apostrophe
    if (wordLower.endsWith('nt') && !word.includes("'")) {
      const base = word.slice(0, -2);
      suggestions.push(base + "n't");
    }
    
    if (wordLower.endsWith('re') && !word.includes("'")) {
      const base = word.slice(0, -2);
      suggestions.push(base + "'re");
    }
    
    if (wordLower.endsWith('ve') && !word.includes("'")) {
      const base = word.slice(0, -2);
      suggestions.push(base + "'ve");
    }
    
    if (wordLower.endsWith('ll') && !word.includes("'")) {
      const base = word.slice(0, -2);
      suggestions.push(base + "'ll");
    }
    
    return suggestions;
  }
  
  private checkSplitWords(text: string): SpellCheckResult[] {
    const results: SpellCheckResult[] = [];
    
    // Common words that might be accidentally split
    const commonSplitWords = new Map([
      ['wha t', 'what'],
      ['tha t', 'that'],
      ['thi s', 'this'],
      ['wit h', 'with'],
      ['fro m', 'from'],
      ['hav e', 'have'],
      ['som e', 'some'],
      ['lik e', 'like'],
      ['whe n', 'when'],
      ['whe re', 'where'],
      ['the re', 'there'],
      ['the y', 'they'],
      ['the ir', 'their'],
      ['wou ld', 'would'],
      ['cou ld', 'could'],
      ['sho uld', 'should'],
      ['abo ut', 'about'],
      ['beca use', 'because'],
      ['befo re', 'before'],
      ['afte r', 'after'],
    ]);
    
    // Look for patterns like "Wha tdo" or "wha t do"
    const splitPattern = /\b([a-zA-Z]{2,3})\s+([a-zA-Z]{1,4})\b/g;
    let match;
    
    while ((match = splitPattern.exec(text)) !== null) {
      const combined = (match[1] + match[2]).toLowerCase();
      const withSpace = (match[1] + ' ' + match[2]).toLowerCase();
      
      // Check if the split version matches a known split
      if (commonSplitWords.has(withSpace)) {
        const suggestion = commonSplitWords.get(withSpace)!;
        
        // Preserve capitalization
        let fixedSuggestion = suggestion;
        if (match[1][0] === match[1][0].toUpperCase()) {
          fixedSuggestion = suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
        }
        
        results.push({
          word: match[0],
          position: match.index,
          length: match[0].length,
          suggestions: [fixedSuggestion],
          type: 'spelling'
        });
      }
      // Check if combining would make a valid word
      else if (this.isValidWord(combined)) {
        let suggestion = combined;
        
        // Preserve capitalization
        if (match[1][0] === match[1][0].toUpperCase()) {
          suggestion = combined.charAt(0).toUpperCase() + combined.slice(1);
        }
        
        results.push({
          word: match[0],
          position: match.index,
          length: match[0].length,
          suggestions: [suggestion],
          type: 'spelling'
        });
      }
    }
    
    return results;
  }
  
  private isValidWord(word: string): boolean {
    // Check if it's a custom word
    if (this.customWords.has(word.toLowerCase())) return true;
    
    // Check against common English words
    const commonWords = new Set([
      'what', 'that', 'this', 'with', 'from', 'have', 'some', 'like',
      'when', 'where', 'there', 'they', 'their', 'would', 'could', 'should',
      'about', 'because', 'before', 'after', 'think', 'know', 'want', 'need',
      'make', 'take', 'give', 'find', 'tell', 'call', 'good', 'first',
      'last', 'long', 'great', 'little', 'other', 'right', 'high', 'different',
      'small', 'large', 'next', 'early', 'young', 'important', 'public',
      'person', 'year', 'week', 'company', 'system', 'program', 'question',
      'work', 'government', 'number', 'night', 'point', 'home', 'water',
      'room', 'mother', 'area', 'money', 'story', 'fact', 'month', 'book',
      'house', 'problem', 'information', 'power', 'country', 'change', 'interest'
    ]);
    
    return commonWords.has(word.toLowerCase());
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