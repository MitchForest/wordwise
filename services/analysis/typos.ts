export interface TypoResult {
  original: string;
  suggestion: string;
  position: number;
  length: number;
  type: 'typo';
  confidence: number;
}

export class TypoCorrector {
  private commonTypos: Map<string, string>;
  private doubleLetterPatterns: Set<string>;
  
  constructor() {
    // Common typos and their corrections
    this.commonTypos = new Map([
      // Common misspellings
      ['teh', 'the'],
      ['recieve', 'receive'],
      ['acheive', 'achieve'],
      ['definately', 'definitely'],
      ['occured', 'occurred'],
      ['seperate', 'separate'],
      ['untill', 'until'],
      ['wich', 'which'],
      ['accomodate', 'accommodate'],
      ['occassion', 'occasion'],
      
      // Common word confusions
      ['loose', 'lose'], // context-dependent
      ['there', 'their'], // context-dependent
      ['your', "you're"], // context-dependent
      ['its', "it's"], // context-dependent
      
      // Technical typos
      ['fucntion', 'function'],
      ['funtion', 'function'],
      ['cosnt', 'const'],
      ['conts', 'const'],
      ['improt', 'import'],
      ['retrun', 'return'],
      ['flase', 'false'],
      ['ture', 'true'],
      ['nulll', 'null'],
      ['udpate', 'update'],
      ['delelte', 'delete'],
      
      // Double letter typos
      ['occassionally', 'occasionally'],
      ['tommorrow', 'tomorrow'],
      ['neccessary', 'necessary'],
      ['dissappoint', 'disappoint'],
      ['embarass', 'embarrass'],
    ]);
    
    // Patterns where double letters are commonly mistyped
    this.doubleLetterPatterns = new Set([
      'cc', 'ff', 'll', 'mm', 'nn', 'pp', 'rr', 'ss', 'tt'
    ]);
  }
  
  async check(text: string): Promise<TypoResult[]> {
    const results: TypoResult[] = [];
    
    // Check for common typos
    for (const [typo, correction] of this.commonTypos) {
      const regex = new RegExp(`\\b${typo}\\b`, 'gi');
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        results.push({
          original: match[0],
          suggestion: this.preserveCase(match[0], correction),
          position: match.index,
          length: match[0].length,
          type: 'typo',
          confidence: 0.9
        });
      }
    }
    
    // Check for repeated words
    const repeatedResults = this.checkRepeatedWords(text);
    results.push(...repeatedResults);
    
    // Check for transposed letters
    const transposedResults = this.checkTransposedLetters(text);
    results.push(...transposedResults);
    
    // Sort by position
    return results.sort((a, b) => a.position - b.position);
  }
  
  private checkRepeatedWords(text: string): TypoResult[] {
    const results: TypoResult[] = [];
    const wordRegex = /\b(\w+)\s+\1\b/gi;
    let match;
    
    while ((match = wordRegex.exec(text)) !== null) {
      const word = match[1];
      
      // Skip intentional repetitions like "very very"
      const intentionalRepetitions = ['very', 'really', 'so', 'no'];
      if (intentionalRepetitions.includes(word.toLowerCase())) continue;
      
      results.push({
        original: match[0],
        suggestion: word,
        position: match.index,
        length: match[0].length,
        type: 'typo',
        confidence: 0.95
      });
    }
    
    return results;
  }
  
  private checkTransposedLetters(text: string): TypoResult[] {
    const results: TypoResult[] = [];
    const commonTranspositions = [
      { pattern: /\bfro\b/gi, correction: 'for' },
      { pattern: /\btaht\b/gi, correction: 'that' },
      { pattern: /\bwaht\b/gi, correction: 'what' },
      { pattern: /\bwehn\b/gi, correction: 'when' },
      { pattern: /\btihng\b/gi, correction: 'thing' },
      { pattern: /\bthier\b/gi, correction: 'their' },
      { pattern: /\bfreind\b/gi, correction: 'friend' },
      { pattern: /\bbeacuse\b/gi, correction: 'because' },
    ];
    
    for (const { pattern, correction } of commonTranspositions) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        results.push({
          original: match[0],
          suggestion: this.preserveCase(match[0], correction),
          position: match.index,
          length: match[0].length,
          type: 'typo',
          confidence: 0.85
        });
      }
    }
    
    return results;
  }
  
  private preserveCase(original: string, suggestion: string): string {
    // All uppercase
    if (original === original.toUpperCase()) {
      return suggestion.toUpperCase();
    }
    
    // First letter uppercase
    if (original[0] === original[0].toUpperCase()) {
      return suggestion.charAt(0).toUpperCase() + suggestion.slice(1).toLowerCase();
    }
    
    // Default to lowercase
    return suggestion.toLowerCase();
  }
  
  // Check if a word might be a typo based on keyboard layout
  isLikelyTypo(word: string): boolean {
    // Check for unlikely letter combinations
    const unlikelyCombos = [
      'qw', 'qe', 'qr', 'qt', 'qy', 'qu', 'qi', 'qo', 'qp',
      'wq', 'wr', 'ws', 'wx', 'wz',
      'xz', 'xc', 'xv', 'xb', 'xn', 'xm',
      'zx', 'zc', 'zv', 'zb', 'zn', 'zm'
    ];
    
    const lowerWord = word.toLowerCase();
    for (const combo of unlikelyCombos) {
      if (lowerWord.includes(combo)) return true;
    }
    
    // Check for too many consonants in a row (more than 4)
    if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(word)) return true;
    
    // Check for patterns that rarely occur in English
    if (/([a-z])\1{2,}/i.test(word)) return true; // Same letter 3+ times
    
    return false;
  }
}