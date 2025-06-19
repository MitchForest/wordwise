/**
 * @file services/analysis/basic-grammar.ts
 * @purpose Checks for basic grammar issues like capitalization, punctuation, and spacing
 * @modified 2024-12-28 - Updated to use text-based suggestions
 */
import { UnifiedSuggestion, GRAMMAR_SUB_CATEGORY } from '@/types/suggestions';
import { createSuggestion } from '@/lib/editor/suggestion-factory';

export interface BasicGrammarIssue {
  type: 'capitalization' | 'punctuation' | 'spacing' | 'grammar' | 'spelling';
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
    
    // Check missing apostrophes in contractions
    issues.push(...this.checkContractions(text));
    
    // Check common grammar confusions
    issues.push(...this.checkCommonConfusions(text));
    
    // Check article usage (a/an)
    issues.push(...this.checkArticles(text));
    
    // Check basic subject-verb agreement
    issues.push(...this.checkSubjectVerbAgreement(text));
    
    // Check common misspellings
    issues.push(...this.checkCommonMisspellings(text));
    
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
    
    // Check for lowercase "I" when used as a pronoun
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
  
  private checkContractions(text: string): BasicGrammarIssue[] {
    const issues: BasicGrammarIssue[] = [];
    
    const contractions = [
      { pattern: /\b(dont)\b/gi, fix: "don't" },
      { pattern: /\b(wont)\b/gi, fix: "won't" },
      { pattern: /\b(cant)\b/gi, fix: "can't" },
      { pattern: /\b(couldnt)\b/gi, fix: "couldn't" },
      { pattern: /\b(shouldnt)\b/gi, fix: "shouldn't" },
      { pattern: /\b(wouldnt)\b/gi, fix: "wouldn't" },
      { pattern: /\b(didnt)\b/gi, fix: "didn't" },
      { pattern: /\b(doesnt)\b/gi, fix: "doesn't" },
      { pattern: /\b(isnt)\b/gi, fix: "isn't" },
      { pattern: /\b(arent)\b/gi, fix: "aren't" },
      { pattern: /\b(wasnt)\b/gi, fix: "wasn't" },
      { pattern: /\b(werent)\b/gi, fix: "weren't" },
      { pattern: /\b(hasnt)\b/gi, fix: "hasn't" },
      { pattern: /\b(havent)\b/gi, fix: "haven't" },
      { pattern: /\b(hadnt)\b/gi, fix: "hadn't" },
      { pattern: /\b(thats)\b/gi, fix: "that's" },
      { pattern: /\b(whats)\b/gi, fix: "what's" },
      { pattern: /\b(wheres)\b/gi, fix: "where's" },
      { pattern: /\b(theres)\b/gi, fix: "there's" },
      { pattern: /\b(heres)\b/gi, fix: "here's" },
      { pattern: /\b(lets)\b/gi, fix: "let's" },
      { pattern: /\b(im)\b/gi, fix: "I'm" },
      { pattern: /\b(ive)\b/gi, fix: "I've" },
      { pattern: /\b(ill)\b/gi, fix: "I'll" },
      { pattern: /\b(id)\b/gi, fix: "I'd" },
      { pattern: /\b(youre)\b/gi, fix: "you're" },
      { pattern: /\b(youve)\b/gi, fix: "you've" },
      { pattern: /\b(youll)\b/gi, fix: "you'll" },
      { pattern: /\b(youd)\b/gi, fix: "you'd" },
      { pattern: /\b(hes)\b/gi, fix: "he's" },
      { pattern: /\b(shes)\b/gi, fix: "she's" },
      { pattern: /\b(theyre)\b/gi, fix: "they're" },
      { pattern: /\b(theyve)\b/gi, fix: "they've" },
      { pattern: /\b(theyll)\b/gi, fix: "they'll" },
      { pattern: /\b(theyd)\b/gi, fix: "they'd" },
      { pattern: /\b(weve)\b/gi, fix: "we've" }
    ];
    
    contractions.forEach(({ pattern, fix }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        issues.push({
          type: 'punctuation',
          position: match.index,
          length: match[0].length,
          message: `Missing apostrophe in contraction`,
          suggestions: [fix],
          autoApplicable: true
        });
      }
    });
    
    return issues;
  }
  
  private checkCommonConfusions(text: string): BasicGrammarIssue[] {
    const issues: BasicGrammarIssue[] = [];
    let match;
    
    // Its vs It's
    const itsPattern = /\b(its)\s+(a|an|the|was|is|been|being|going|coming)\b/gi;
    while ((match = itsPattern.exec(text)) !== null) {
      issues.push({
        type: 'grammar',
        position: match.index,
        length: 3,
        message: `"Its" should be "it's" (it is) in this context`,
        suggestions: ["it's"],
        autoApplicable: true
      });
    }
    
    // Your vs You're
    const yourPattern = /\b(your)\s+(going|coming|being|doing|making|taking|welcome|right|wrong|here|there)\b/gi;
    while ((match = yourPattern.exec(text)) !== null) {
      issues.push({
        type: 'grammar',
        position: match.index,
        length: 4,
        message: `"Your" should be "you're" (you are) in this context`,
        suggestions: ["you're"],
        autoApplicable: true
      });
    }
    
    // Their/There/They're
    const theirPattern = /\b(their)\s+(is|are|was|were|will|would|should|could)\b/gi;
    while ((match = theirPattern.exec(text)) !== null) {
      issues.push({
        type: 'grammar',
        position: match.index,
        length: 5,
        message: `"Their" should be "there" in this context`,
        suggestions: ["there"],
        autoApplicable: true
      });
    }
    
    // Then vs Than
    const thanPattern = /\b(more|less|better|worse|rather|other)\s+then\b/gi;
    while ((match = thanPattern.exec(text)) !== null) {
      const thenIndex = match.index + match[0].lastIndexOf('then');
      issues.push({
        type: 'grammar',
        position: thenIndex,
        length: 4,
        message: `"Then" should be "than" for comparisons`,
        suggestions: ["than"],
        autoApplicable: true
      });
    }
    
    return issues;
  }
  
  private checkArticles(text: string): BasicGrammarIssue[] {
    const issues: BasicGrammarIssue[] = [];
    let match;
    
    // "a" before vowel sounds
    const aVowelPattern = /\b(a)\s+([aeiou]|hour|honest|heir)/gi;
    while ((match = aVowelPattern.exec(text)) !== null) {
      issues.push({
        type: 'grammar',
        position: match.index,
        length: 1,
        message: `Use "an" before vowel sounds`,
        suggestions: ["an"],
        autoApplicable: true
      });
    }
    
    // "an" before consonant sounds
    const anConsonantPattern = /\b(an)\s+([bcdfghjklmnpqrstvwxyz]|[Uu]ni|[Ee]u|[Oo]ne)/gi;
    while ((match = anConsonantPattern.exec(text)) !== null) {
      // Skip if it's a vowel sound (like "an hour")
      const nextWord = match[2].toLowerCase();
      if (nextWord === 'hour' || nextWord === 'honest' || nextWord === 'heir') continue;
      
      issues.push({
        type: 'grammar',
        position: match.index,
        length: 2,
        message: `Use "a" before consonant sounds`,
        suggestions: ["a"],
        autoApplicable: true
      });
    }
    
    return issues;
  }
  
  private checkSubjectVerbAgreement(text: string): BasicGrammarIssue[] {
    const issues: BasicGrammarIssue[] = [];
    
    const patterns = [
      { pattern: /\b(he|she|it)\s+(are)\b/gi, fix: "is", message: "Use 'is' with singular subjects" },
      { pattern: /\b(they|we)\s+(is)\b/gi, fix: "are", message: "Use 'are' with plural subjects" },
      { pattern: /\b(he|she|it)\s+(were)\b/gi, fix: "was", message: "Use 'was' with singular subjects" },
      { pattern: /\b(they|we)\s+(was)\b/gi, fix: "were", message: "Use 'were' with plural subjects" },
      { pattern: /\b(he|she|it)\s+(have)\b/gi, fix: "has", message: "Use 'has' with singular subjects" },
      { pattern: /\b(they|we)\s+(has)\b/gi, fix: "have", message: "Use 'have' with plural subjects" },
      { pattern: /\b(he|she|it)\s+(do)\b/gi, fix: "does", message: "Use 'does' with singular subjects" },
      { pattern: /\b(they|we)\s+(does)\b/gi, fix: "do", message: "Use 'do' with plural subjects" },
    ];
    
    patterns.forEach(({ pattern, fix, message }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const verbStart = match.index + match[1].length + 1;
        const verbLength = match[2].length;
        
        issues.push({
          type: 'grammar',
          position: verbStart,
          length: verbLength,
          message,
          suggestions: [fix],
          autoApplicable: true
        });
      }
    });
    
    return issues;
  }
  
  private checkCommonMisspellings(text: string): BasicGrammarIssue[] {
    const issues: BasicGrammarIssue[] = [];
    
    const commonErrors = [
      { pattern: /\b(alot)\b/gi, fix: "a lot" },
      { pattern: /\b(everytime)\b/gi, fix: "every time" },
      { pattern: /\b(noone)\b/gi, fix: "no one" },
      { pattern: /\b(definately)\b/gi, fix: "definitely" },
      { pattern: /\b(recieve)\b/gi, fix: "receive" },
      { pattern: /\b(beleive)\b/gi, fix: "believe" },
      { pattern: /\b(acheive)\b/gi, fix: "achieve" },
      { pattern: /\b(seperate)\b/gi, fix: "separate" },
      { pattern: /\b(occured)\b/gi, fix: "occurred" },
      { pattern: /\b(untill)\b/gi, fix: "until" },
      { pattern: /\b(therefor)\b/gi, fix: "therefore" },
      { pattern: /\b(accomodate)\b/gi, fix: "accommodate" },
      { pattern: /\b(occassion)\b/gi, fix: "occasion" }
    ];
    
    commonErrors.forEach(({ pattern, fix }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        issues.push({
          type: 'spelling',
          position: match.index,
          length: match[0].length,
          message: `Common misspelling`,
          suggestions: [fix],
          autoApplicable: true
        });
      }
    });
    
    return issues;
  }

  /**
   * Run grammar checks on document
   * @purpose Main entry point for grammar analysis
   * @modified 2024-12-28 - Fixed position calculation for text nodes
   */
  run(doc: any, documentText: string): UnifiedSuggestion[] {
    const suggestions: UnifiedSuggestion[] = [];
    
    // VALIDATE: Document structure
    if (!doc || !doc.descendants) {
      console.warn('[BasicGrammarChecker] Invalid document structure');
      return suggestions;
    }

    // Traverse document nodes
    doc.descendants((node: any, pos: number) => {
      // Only process text nodes
      if (!node.isText || !node.text) return;
      
      const text = node.text;
      
      // IMPORTANT: In ProseMirror, the `pos` parameter is the position BEFORE the node
      // For text nodes, we need to add 1 to get to the actual text content
      // This is because ProseMirror positions count node boundaries
      const textStartPos = pos;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[BasicGrammarChecker] Processing text node:', {
          nodeText: text,
          nodePos: pos,
          textStartPos,
          documentTextAtPos: documentText.substring(pos, pos + text.length),
          // Check what's actually at this position
          charAtPos: documentText[pos],
          charAtPosPlus1: documentText[pos + 1],
        });
      }

      // Basic grammar checks (capitalization, punctuation, spacing)
      const basicIssues = this.check(text);
      basicIssues.forEach((issue) => {
        const from = pos + issue.position;
        const to = from + issue.length;
        const errorText = text.substring(issue.position, issue.position + issue.length);
        
        // Map issue type to appropriate sub-category
        let subCategory: any;
        switch (issue.type) {
          case 'capitalization':
            subCategory = GRAMMAR_SUB_CATEGORY.CAPITALIZATION;
            break;
          case 'punctuation':
            // Check if it's a contraction issue
            if (issue.message.includes('apostrophe')) {
              subCategory = GRAMMAR_SUB_CATEGORY.CONTRACTION;
            } else {
              subCategory = GRAMMAR_SUB_CATEGORY.PUNCTUATION;
            }
            break;
          case 'spacing':
            subCategory = GRAMMAR_SUB_CATEGORY.SPACING;
            break;
          case 'grammar':
            // Check the specific grammar issue type
            if (issue.message.includes('a/an') || issue.message.includes('"an"') || issue.message.includes('"a"')) {
              subCategory = GRAMMAR_SUB_CATEGORY.ARTICLE_USAGE;
            } else if (issue.message.includes('subject')) {
              subCategory = GRAMMAR_SUB_CATEGORY.SUBJECT_VERB_AGREEMENT;
            } else {
              subCategory = GRAMMAR_SUB_CATEGORY.COMMON_CONFUSION;
            }
            break;
          case 'spelling':
            subCategory = GRAMMAR_SUB_CATEGORY.COMMON_MISSPELLING;
            break;
          default:
            subCategory = GRAMMAR_SUB_CATEGORY.REPEATED_WORD;
        }
        
        const ruleId = `grammar/${subCategory}`;
        
        suggestions.push(
          createSuggestion(
            from,
            to,
            errorText,
            documentText,
            'grammar',
            subCategory,
            ruleId,
            `${issue.type.charAt(0).toUpperCase() + issue.type.slice(1)} Issue`,
            issue.message,
            issue.suggestions.map(s => ({
              label: `Change to "${s}"`,
              type: 'fix',
              value: s,
              handler: () => {},
            })),
            'warning'
          )
        );
      });

      // Repeated word check
      const repeatedWordRegex = /\b(\w+)\s+\1\b/gi;
      const REPEATED_WORD_RULE_ID = 'grammar/repeated-word';
      let match;
      while ((match = repeatedWordRegex.exec(text)) !== null) {
        const repeatedWord = match[1];
        const from = pos + match.index;
        const to = from + match[0].length;

        if (process.env.NODE_ENV === 'development') {
          console.log('[BasicGrammarChecker] Repeated word found:', {
            repeatedWord,
            fullMatch: match[0],
            matchIndex: match.index,
            nodePos: pos,
            nodeText: node.text,
            from,
            to,
            calculatedLength: to - from,
            actualLength: match[0].length,
            documentTextAtPosition: documentText.substring(from, to)
          });
        }

        suggestions.push(
          createSuggestion(
            from,
            to,
            match[0],
            documentText,
            'grammar',
            GRAMMAR_SUB_CATEGORY.REPEATED_WORD,
            REPEATED_WORD_RULE_ID,
            'Repeated Word',
            `The word "${repeatedWord}" is repeated.`,
            [
              {
                label: `Remove repetition`,
                type: 'fix',
                value: repeatedWord,
                handler: () => {},
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