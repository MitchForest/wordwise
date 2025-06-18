import { UnifiedSuggestion } from '@/types/suggestions';
import { createSuggestion } from '@/lib/editor/suggestion-factory';

export interface BasicGrammarIssue {
  type: 'capitalization' | 'punctuation' | 'spacing';
  position: number;
  length: number;
  message: string;
  suggestions: string[];
  autoApplicable: boolean;
}

export class BasicGrammarChecker {
  /**
   * Check for basic grammar issues like capitalization, punctuation, and spacing
   */
  check(text: string): BasicGrammarIssue[] {
    const issues: BasicGrammarIssue[] = [];
    
    // Check capitalization after sentence-ending punctuation
    issues.push(...this.checkCapitalization(text));
    
    // Check punctuation issues
    issues.push(...this.checkPunctuation(text));
    
    // Check spacing issues
    issues.push(...this.checkSpacing(text));
    
    return issues;
  }
  
  private checkCapitalization(text: string): BasicGrammarIssue[] {
    const issues: BasicGrammarIssue[] = [];
    
    // Check for lowercase after sentence-ending punctuation
    const sentenceEndPattern = /([.!?])\s+([a-z])/g;
    let match;
    
    while ((match = sentenceEndPattern.exec(text)) !== null) {
      const lowercaseLetter = match[2];
      const position = match.index + match[0].lastIndexOf(lowercaseLetter);
      
      issues.push({
        type: 'capitalization',
        position,
        length: 1,
        message: `Sentence should start with a capital letter`,
        suggestions: [lowercaseLetter.toUpperCase()],
        autoApplicable: true
      });
    }
    
    // Check for lowercase at the beginning of the text
    if (text.length > 0 && /^[a-z]/.test(text)) {
      issues.push({
        type: 'capitalization',
        position: 0,
        length: 1,
        message: `First letter should be capitalized`,
        suggestions: [text[0].toUpperCase()],
        autoApplicable: true
      });
    }
    
    // Check for lowercase "I" when used as pronoun
    const iPattern = /\bi\b/g;
    while ((match = iPattern.exec(text)) !== null) {
      issues.push({
        type: 'capitalization',
        position: match.index,
        length: 1,
        message: `"I" should be capitalized when used as a pronoun`,
        suggestions: ['I'],
        autoApplicable: true
      });
    }
    
    return issues;
  }
  
  private checkPunctuation(text: string): BasicGrammarIssue[] {
    const issues: BasicGrammarIssue[] = [];
    
    // Check for double punctuation
    const doublePunctuationPattern = /([.!?,;:])\1+/g;
    let match;
    
    while ((match = doublePunctuationPattern.exec(text)) !== null) {
      issues.push({
        type: 'punctuation',
        position: match.index,
        length: match[0].length,
        message: `Remove duplicate punctuation`,
        suggestions: [match[1]],
        autoApplicable: true
      });
    }
    
    // Don't check for missing period - too aggressive and annoying
    // Users know when they're done with a sentence
    
    // Check for space before punctuation (except ellipsis)
    const spacePunctuationPattern = /\s+([.!?,;:])/g;
    while ((match = spacePunctuationPattern.exec(text)) !== null) {
      // Skip if it's part of an ellipsis
      if (match[1] === '.' && text[match.index - 1] === '.') continue;
      
      issues.push({
        type: 'punctuation',
        position: match.index,
        length: match[0].length,
        message: `Remove space before punctuation`,
        suggestions: [match[1]],
        autoApplicable: true
      });
    }
    
    return issues;
  }
  
  private checkSpacing(text: string): BasicGrammarIssue[] {
    const issues: BasicGrammarIssue[] = [];
    
    // Check for multiple spaces
    const multipleSpacesPattern = /  +/g;
    let match;
    
    while ((match = multipleSpacesPattern.exec(text)) !== null) {
      issues.push({
        type: 'spacing',
        position: match.index,
        length: match[0].length,
        message: `Remove extra spaces`,
        suggestions: [' '],
        autoApplicable: true
      });
    }
    
    // Check for missing space after punctuation (except decimal points and ellipsis)
    const missingSpacePattern = /([.!?,;:])([A-Za-z])/g;
    while ((match = missingSpacePattern.exec(text)) !== null) {
      // Skip decimal numbers
      if (match[1] === '.' && /\d/.test(text[match.index - 1])) continue;
      
      // Skip ellipsis
      if (match[1] === '.' && text[match.index - 1] === '.') continue;
      
      issues.push({
        type: 'spacing',
        position: match.index,
        length: 2, // Include punctuation and following letter
        message: `Add space after punctuation`,
        suggestions: [match[1] + ' ' + match[2]],
        autoApplicable: true
      });
    }
    
    return issues;
  }

  public run(doc: any): UnifiedSuggestion[] {
    if (!doc || !doc.content) {
      return [];
    }

    const suggestions: UnifiedSuggestion[] = [];

    doc.descendants((node: any, pos: number) => {
      if (!node.isText || !node.text) {
        return;
      }

      const text = node.text;
      
      // Basic grammar checks (capitalization, punctuation, spacing)
      const basicIssues = this.check(text);
      basicIssues.forEach((issue) => {
        const from = pos + issue.position;
        const to = from + issue.length;
        const errorText = text.substring(issue.position, issue.position + issue.length);
        
        suggestions.push(
          createSuggestion(
            from,
            to,
            errorText,
            'grammar',
            `${issue.type.charAt(0).toUpperCase() + issue.type.slice(1)} Issue`,
            issue.message,
            issue.suggestions.map(s => ({
              label: `Change to "${s}"`,
              type: 'fix',
              value: s,
              handler: () => {}, // Placeholder
            })),
            'warning'
          )
        );
      });

      // Repeated word check
      const repeatedWordRegex = /\b(\w+)\s+\1\b/gi;
      let match;
      while ((match = repeatedWordRegex.exec(text)) !== null) {
        const repeatedWord = match[1];
        const from = pos + match.index;
        const to = from + match[0].length;

        suggestions.push(
          createSuggestion(
            from,
            to,
            match[0],
            'grammar',
            'Repeated Word',
            `The word "${repeatedWord}" is repeated.`,
            [
              {
                label: `Remove repetition`,
                type: 'fix',
                value: repeatedWord,
                handler: () => {}, // Placeholder
              },
            ],
            'warning'
          )
        );
      }
    });

    return suggestions;
  }
}