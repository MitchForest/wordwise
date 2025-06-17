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
  private apiUrl = '/api/languagetool'; // Use our proxy endpoint

  constructor() {
    console.log('LanguageToolService initialized');
  }

  async check(text: string): Promise<GrammarError[]> {
    // Skip during SSR
    if (typeof window === 'undefined') {
      return [];
    }
    
    // Skip empty text
    if (!text || text.trim().length === 0) {
      return [];
    }

    console.log('Checking text with LanguageTool API proxy');
    
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
        },
        body: params.toString(),
      }).catch(err => {
        console.error('Fetch error:', err);
        throw new Error(`Network error: ${err.message}`);
      });

      if (!response.ok) {
        console.error('LanguageTool API error:', response.status, await response.text());
        throw new Error(`LanguageTool API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('LanguageTool API response:', data);
      console.log('LanguageTool matches count:', data.matches?.length || 0);
      
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
      // Return empty array on error - no fallback to mock
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

} 