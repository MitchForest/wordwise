import writeGood from 'write-good';
import type { StyleResult, StyleIssue } from '@/types/suggestions';

export class StyleAnalyzer {
  analyze(text: string): StyleResult {
    const suggestions = writeGood(text) || [];
    
    const result: StyleResult = {
      issues: [],
      suggestions: [],
      metrics: {
        passiveVoiceCount: 0,
        adverbCount: 0,
        clicheCount: 0,
        weaselWordCount: 0,
      },
    };

    // Process write-good suggestions
    suggestions.forEach((suggestion: any) => {
      const issue: StyleIssue = {
        index: suggestion.index,
        offset: suggestion.offset,
        reason: suggestion.reason,
        type: this.categorizeIssue(suggestion.reason),
      };
      
      // Add specific suggestions based on type
      issue.suggestions = this.getSuggestionsForIssue(issue.type, text, suggestion);
      
      result.issues.push(issue);
      
      // Update metrics
      switch (issue.type) {
        case 'passive':
          result.metrics.passiveVoiceCount++;
          break;
        case 'adverb':
          result.metrics.adverbCount++;
          break;
        case 'cliche':
          result.metrics.clicheCount++;
          break;
        case 'weasel':
          result.metrics.weaselWordCount++;
          break;
      }
    });

    // Generate overall suggestions
    result.suggestions = this.generateOverallSuggestions(result.metrics, text);
    
    return result;
  }

  private categorizeIssue(reason: string): StyleIssue['type'] {
    if (reason.includes('passive voice')) return 'passive';
    if (reason.includes('lexical illusion')) return 'lexical-illusion';
    if (reason.includes('So at the start')) return 'so-start';
    if (reason.includes('adverb')) return 'adverb';
    if (reason.includes('cliche')) return 'cliche';
    if (reason.includes('weasel')) return 'weasel';
    return 'weasel'; // default
  }

  private getSuggestionsForIssue(type: StyleIssue['type'], text: string, suggestion: any): string[] {
    const suggestions = [];
    
    switch (type) {
      case 'passive':
        suggestions.push('Consider using active voice');
        suggestions.push('Restructure: [subject] + [verb] + [object]');
        break;
        
      case 'adverb':
        suggestions.push('Use a stronger verb instead');
        suggestions.push('Remove if unnecessary');
        break;
        
      case 'cliche':
        suggestions.push('Use original phrasing');
        suggestions.push('Be more specific');
        break;
        
      case 'weasel':
        suggestions.push('Be more specific');
        suggestions.push('Provide concrete details');
        break;
    }
    
    return suggestions;
  }

  private generateOverallSuggestions(metrics: any, text: string): string[] {
    const suggestions = [];
    
    if (metrics.passiveVoiceCount > 2) {
      suggestions.push(`${metrics.passiveVoiceCount} uses of passive voice - aim for active voice`);
    }
    
    if (metrics.adverbCount > 5) {
      suggestions.push('Consider reducing adverb usage for stronger writing');
    }
    
    if (metrics.clicheCount > 0) {
      suggestions.push('Replace clichés with fresh, original language');
    }
    
    if (metrics.weaselWordCount > 3) {
      suggestions.push('Replace vague words with specific details');
    }
    
    return suggestions;
  }
} 