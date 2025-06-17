import readability from 'text-readability';
import readingTime from 'reading-time';
import type { ReadabilityResult } from '@/types/suggestions';

export class ReadabilityAnalyzer {
  analyze(text: string, targetGradeLevel: number = 8): ReadabilityResult {
    if (!text || text.trim().length === 0) {
      return this.emptyResult();
    }

    const result: ReadabilityResult = {
      score: 0,
      gradeLevel: 0,
      readingTime: 0,
      metrics: {
        fleschScore: 0,
        avgSentenceLength: 0,
        avgWordLength: 0,
        syllableCount: 0,
        complexWords: 0,
        sentences: 0,
        words: 0,
      },
      issues: [],
      suggestions: [],
    };

    try {
      // Calculate readability scores
      result.score = readability.fleschReadingEase(text);
      result.gradeLevel = readability.fleschKincaidGrade(text);
      
      // Reading time
      const timeStats = readingTime(text);
      result.readingTime = Math.ceil(timeStats.minutes);
      
      // Detailed metrics
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const words = text.split(/\s+/).filter(w => w.length > 0);
      
      result.metrics = {
        fleschScore: result.score,
        avgSentenceLength: words.length / sentences.length,
        avgWordLength: text.replace(/\s/g, '').length / words.length,
        syllableCount: this.countSyllables(text),
        complexWords: this.countComplexWords(words),
        sentences: sentences.length,
        words: words.length,
      };
      
      // Generate issues and suggestions
      this.generateFeedback(result, targetGradeLevel);
      
    } catch (error) {
      console.error('Readability analysis failed:', error);
      result.issues.push('Unable to analyze readability');
    }
    
    return result;
  }

  private generateFeedback(result: ReadabilityResult, targetGradeLevel: number) {
    // Grade level feedback
    if (result.gradeLevel > targetGradeLevel + 2) {
      result.issues.push(`Reading level too high (Grade ${Math.round(result.gradeLevel)})`);
      result.suggestions.push('Use shorter sentences and simpler words');
    } else if (result.gradeLevel < targetGradeLevel - 2) {
      result.issues.push(`Reading level too low (Grade ${Math.round(result.gradeLevel)})`);
      result.suggestions.push('Consider adding more detail and variety');
    }
    
    // Sentence length feedback
    if (result.metrics.avgSentenceLength > 20) {
      result.issues.push('Sentences are too long on average');
      result.suggestions.push('Break long sentences into shorter ones');
    }
    
    // Flesch score interpretation
    if (result.score < 30) {
      result.issues.push('Very difficult to read');
    } else if (result.score < 50) {
      result.issues.push('Fairly difficult to read');
    } else if (result.score < 60) {
      result.issues.push('Plain English - OK for most readers');
    }
    // 60-70 is ideal, 70+ might be too simple
    
    // Complex words
    const complexWordRatio = result.metrics.complexWords / result.metrics.words;
    if (complexWordRatio > 0.15) {
      result.issues.push('Too many complex words');
      result.suggestions.push('Replace complex words with simpler alternatives');
    }
  }

  private countSyllables(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    return words.reduce((count, word) => {
      return count + this.syllablesInWord(word);
    }, 0);
  }

  private syllablesInWord(word: string): number {
    word = word.replace(/[^a-z]/g, '');
    let count = 0;
    let previousWasVowel = false;
    
    for (let i = 0; i < word.length; i++) {
      const isVowel = /[aeiou]/.test(word[i]);
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }
    
    // Adjust for silent e
    if (word.endsWith('e')) {
      count--;
    }
    
    // Ensure at least one syllable
    return Math.max(1, count);
  }

  private countComplexWords(words: string[]): number {
    return words.filter(word => this.syllablesInWord(word) >= 3).length;
  }

  private emptyResult(): ReadabilityResult {
    return {
      score: 0,
      gradeLevel: 0,
      readingTime: 0,
      metrics: {
        fleschScore: 0,
        avgSentenceLength: 0,
        avgWordLength: 0,
        syllableCount: 0,
        complexWords: 0,
        sentences: 0,
        words: 0,
      },
      issues: ['No content to analyze'],
      suggestions: [],
    };
  }
} 