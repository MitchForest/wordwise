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
  private apiUrl = 'https://api.languagetoolplus.com/v2/check';
  private apiKey = process.env.NEXT_PUBLIC_LANGUAGETOOL_API_KEY;

  async check(text: string): Promise<GrammarError[]> {
    // For Phase 1, we'll use a mock implementation if no API key is provided
    if (!this.apiKey) {
      return this.mockCheck(text);
    }

    try {
      const params = new URLSearchParams({
        text,
        language: 'en-US',
        apiKey: this.apiKey,
      });

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await response.json();
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
      return [];
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
    const errors: GrammarError[] = [];
    
    // Simple mock: find common errors
    const commonErrors = [
      { pattern: /\bteh\b/gi, message: 'Possible spelling mistake found.', replacement: 'the' },
      { pattern: /\byour\s+welcome\b/gi, message: 'Did you mean "you\'re welcome"?', replacement: "you're welcome" },
      { pattern: /\bits\s+a\s+good\b/gi, message: 'Consider using "it\'s" (contraction).', replacement: "it's a good" },
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
          category: 'Grammar',
          severity: 'warning',
        });
      }
    });

    return errors;
  }
} 