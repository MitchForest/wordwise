interface LanguageToolMatch {
  message: string;
  shortMessage?: string;
  replacements: Array<{ value: string }>;
  offset: number;
  length: number;
  context: {
    text: string;
    offset: number;
    length: number;
  };
  rule: {
    id: string;
    category: {
      id: string;
      name: string;
    };
  };
}

export interface GrammarError {
  id: string;
  message: string;
  shortMessage: string;
  offset: number;
  length: number;
  replacements: Array<{ value: string }>;
  category: string;
  severity: 'critical' | 'warning' | 'suggestion';
}

export class LanguageToolService {
  private apiUrl = `${process.env.NEXT_PUBLIC_LANGUAGETOOL_ENDPOINT || 'https://api.languagetoolplus.com/v2/'}check`;
  private apiKey = process.env.NEXT_PUBLIC_LANGUAGETOOL_API_KEY;

  async check(text: string): Promise<GrammarError[]> {
    // For Phase 1, we'll use a mock implementation if no API key is provided
    if (!this.apiKey) {
      return this.mockCheck(text);
    }

    console.log('Using real LanguageTool API with key:', this.apiKey);
    
    try {
      const params = new URLSearchParams({
        text,
        language: 'en-US',
      });

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: params.toString(),
      });

      if (!response.ok) {
        console.error('LanguageTool API error:', response.status, await response.text());
        throw new Error(`LanguageTool API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('LanguageTool API response:', data);
      
      const matches: LanguageToolMatch[] = data.matches || [];
      
      return matches.map(match => ({
        id: `${match.offset}-${match.length}`,
        message: match.message,
        shortMessage: match.shortMessage || match.message,
        offset: match.offset,
        length: match.length,
        replacements: match.replacements.slice(0, 3),
        category: match.rule.category.name,
        severity: this.getSeverity(match.rule.category.id),
      }));
    } catch (error) {
      console.error('LanguageTool API error:', error);
      // Fall back to mock if API fails
      return this.mockCheck(text);
    }
  }

  private getSeverity(categoryId: string): 'critical' | 'warning' | 'suggestion' {
    switch (categoryId.toLowerCase()) {
      case 'typos':
      case 'misspelling':
        return 'critical';
      case 'grammar':
        return 'warning';
      default:
        return 'suggestion';
    }
  }

  // Mock implementation for development/demo
  private mockCheck(text: string): GrammarError[] {
    console.log('LanguageTool mockCheck called with:', text);
    const errors: GrammarError[] = [];
    
    // Simple mock: find common errors (spelling and grammar)
    const commonErrors = [
      // Spelling errors
      { pattern: /\bnme\b/gi, message: 'Possible spelling mistake found.', replacement: 'name', category: 'TYPOS' },
      { pattern: /\bwrtng\b/gi, message: 'Possible spelling mistake found.', replacement: 'writing', category: 'TYPOS' },
      { pattern: /\bteh\b/gi, message: 'Possible spelling mistake found.', replacement: 'the', category: 'TYPOS' },
      { pattern: /\brecieve\b/gi, message: 'Possible spelling mistake found.', replacement: 'receive', category: 'TYPOS' },
      { pattern: /\boccured\b/gi, message: 'Possible spelling mistake found.', replacement: 'occurred', category: 'TYPOS' },
      { pattern: /\bseperate\b/gi, message: 'Possible spelling mistake found.', replacement: 'separate', category: 'TYPOS' },
      { pattern: /\bdefinately\b/gi, message: 'Possible spelling mistake found.', replacement: 'definitely', category: 'TYPOS' },
      { pattern: /\bwritting\b/gi, message: 'Possible spelling mistake found.', replacement: 'writing', category: 'TYPOS' },
      { pattern: /\bmispelled\b/gi, message: 'Possible spelling mistake found.', replacement: 'misspelled', category: 'TYPOS' },
      { pattern: /\bincorect\b/gi, message: 'Possible spelling mistake found.', replacement: 'incorrect', category: 'TYPOS' },
      { pattern: /\bgrammer\b/gi, message: 'Possible spelling mistake found.', replacement: 'grammar', category: 'TYPOS' },
      // Grammar errors
      { pattern: /\byour\s+welcome\b/gi, message: 'Did you mean "you\'re welcome"?', replacement: "you're welcome", category: 'GRAMMAR' },
      { pattern: /\bits\s+a\s+good\b/gi, message: 'Consider using "it\'s" (contraction).', replacement: "it's a good", category: 'GRAMMAR' },
      { pattern: /\bcould\s+of\b/gi, message: 'Did you mean "could have"?', replacement: 'could have', category: 'GRAMMAR' },
      { pattern: /\bwould\s+of\b/gi, message: 'Did you mean "would have"?', replacement: 'would have', category: 'GRAMMAR' },
      { pattern: /\b(you)\s+\1\b/gi, message: 'Repeated word found.', replacement: 'you', category: 'GRAMMAR' },
      { pattern: /\bTheir\s+is\b/g, message: 'Did you mean "There is"?', replacement: 'There is', category: 'GRAMMAR' },
    ];

    commonErrors.forEach((errorDef, index) => {
      let match;
      while ((match = errorDef.pattern.exec(text)) !== null) {
        errors.push({
          id: `mock-${index}-${match.index}`,
          message: errorDef.message,
          shortMessage: errorDef.message,
          offset: match.index,
          length: match[0].length,
          replacements: [{ value: errorDef.replacement }],
          category: errorDef.category,
          severity: errorDef.category === 'TYPOS' ? 'critical' : 'warning',
        });
      }
    });

    console.log('LanguageTool mockCheck found errors:', errors);
    return errors;
  }
} 