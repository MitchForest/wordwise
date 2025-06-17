import keywordExtractor from 'keyword-extractor';
import stringSimilarity from 'string-similarity';
import type { SEOAnalysisResult } from '@/types/suggestions';

export class SEOAnalyzer {
  private readonly optimalValues = {
    titleLength: { min: 50, max: 60 },
    metaLength: { min: 150, max: 160 },
    keywordDensity: { min: 1, max: 2 },
    minWords: 300,
    minHeadings: 3,
    minParagraphs: 3,
  };

  analyze(document: {
    title: string;
    metaDescription: string;
    content: any; // Tiptap JSON
    plainText: string;
    targetKeyword: string;
    keywords: string[];
  }): SEOAnalysisResult {
    const result: SEOAnalysisResult = {
      score: 0,
      breakdown: {
        title: 0,
        meta: 0,
        content: 0,
        structure: 0,
      },
      issues: [],
      suggestions: [],
      keywordAnalysis: {
        density: 0,
        distribution: 'sparse',
        relatedKeywords: [],
      },
    };

    // Title Analysis (25 points)
    result.breakdown.title = this.analyzeTitle(document, result);
    
    // Meta Description Analysis (25 points)
    result.breakdown.meta = this.analyzeMeta(document, result);
    
    // Content Analysis (30 points)
    result.breakdown.content = this.analyzeContent(document, result);
    
    // Structure Analysis (20 points)
    result.breakdown.structure = this.analyzeStructure(document, result);
    
    // Calculate total score
    result.score = Object.values(result.breakdown).reduce((sum, score) => sum + score, 0);
    
    // Generate keyword analysis
    result.keywordAnalysis = this.analyzeKeywords(document);
    
    // Generate suggestions based on issues
    result.suggestions = this.generateSuggestions(result.issues, document);
    
    return result;
  }

  private analyzeTitle(doc: any, result: SEOAnalysisResult): number {
    let score = 0;
    
    // Length check (10 points)
    if (doc.title.length < this.optimalValues.titleLength.min) {
      result.issues.push(`Title too short (${doc.title.length} chars, need 50+)`);
    } else if (doc.title.length > this.optimalValues.titleLength.max) {
      result.issues.push(`Title too long (${doc.title.length} chars, max 60)`);
    } else {
      score += 10;
    }
    
    // Keyword presence (10 points)
    if (doc.targetKeyword && doc.title.toLowerCase().includes(doc.targetKeyword.toLowerCase())) {
      score += 10;
      
      // Bonus for keyword at start (5 points)
      if (doc.title.toLowerCase().startsWith(doc.targetKeyword.toLowerCase())) {
        score += 5;
      }
    } else if (doc.targetKeyword) {
      result.issues.push('Target keyword missing from title');
    }
    
    return score;
  }

  private analyzeMeta(doc: any, result: SEOAnalysisResult): number {
    let score = 0;
    
    // Length check (10 points)
    if (!doc.metaDescription) {
      result.issues.push('Missing meta description');
    } else if (doc.metaDescription.length < this.optimalValues.metaLength.min) {
      result.issues.push(`Meta description too short (${doc.metaDescription.length} chars)`);
    } else if (doc.metaDescription.length > this.optimalValues.metaLength.max) {
      result.issues.push(`Meta description too long (${doc.metaDescription.length} chars)`);
    } else {
      score += 10;
    }
    
    // Keyword presence (10 points)
    if (doc.metaDescription && doc.targetKeyword && 
        doc.metaDescription.toLowerCase().includes(doc.targetKeyword.toLowerCase())) {
      score += 10;
    } else if (doc.targetKeyword && doc.metaDescription) {
      result.issues.push('Target keyword missing from meta description');
    }
    
    // Call to action (5 points)
    const ctaWords = ['learn', 'discover', 'find out', 'get', 'read'];
    if (doc.metaDescription && ctaWords.some(word => doc.metaDescription.toLowerCase().includes(word))) {
      score += 5;
    }
    
    return score;
  }

  private analyzeContent(doc: any, result: SEOAnalysisResult): number {
    let score = 0;
    const words = doc.plainText.split(/\s+/).filter((w: string) => w.length > 0);
    
    // Word count (10 points)
    if (words.length < this.optimalValues.minWords) {
      result.issues.push(`Content too short (${words.length} words, need 300+)`);
    } else {
      score += 10;
    }
    
    // Keyword density (10 points)
    if (doc.targetKeyword) {
      const keywordCount = (doc.plainText.toLowerCase().match(new RegExp(doc.targetKeyword.toLowerCase(), 'g')) || []).length;
      const density = (keywordCount / words.length) * 100;
      
      if (density < this.optimalValues.keywordDensity.min) {
        result.issues.push(`Keyword density too low (${density.toFixed(1)}%, target 1-2%)`);
      } else if (density > this.optimalValues.keywordDensity.max) {
        result.issues.push(`Keyword density too high (${density.toFixed(1)}%, target 1-2%)`);
      } else {
        score += 10;
      }
    }
    
    // Keywords usage (10 points)
    if (doc.keywords && doc.keywords.length > 0) {
      const foundKeywords = doc.keywords.filter((kw: string) => 
        doc.plainText.toLowerCase().includes(kw.toLowerCase())
      );
      score += Math.min(10, foundKeywords.length * 3);
    }
    
    return score;
  }

  private analyzeStructure(doc: any, result: SEOAnalysisResult): number {
    let score = 0;
    
    // Parse Tiptap JSON content
    const headings = this.countNodesOfType(doc.content, 'heading');
    if (headings < this.optimalValues.minHeadings) {
      result.issues.push(`Need more headings (${headings} found, need 3+)`);
    } else {
      score += 10;
    }
    
    // Paragraphs
    const paragraphs = this.countNodesOfType(doc.content, 'paragraph');
    if (paragraphs < this.optimalValues.minParagraphs) {
      result.issues.push('Add more paragraphs for better structure');
    } else {
      score += 5;
    }
    
    // Lists
    const lists = this.countNodesOfType(doc.content, 'bulletList') + 
                  this.countNodesOfType(doc.content, 'orderedList');
    if (lists > 0) {
      score += 5;
    } else {
      result.suggestions.push('Consider adding lists for better scannability');
    }
    
    return score;
  }

  private countNodesOfType(content: any, type: string): number {
    if (!content || !content.content) return 0;
    let count = 0;
    
    const traverse = (node: any) => {
      if (node.type === type) count++;
      if (node.content) {
        node.content.forEach(traverse);
      }
    };
    
    traverse(content);
    return count;
  }

  private analyzeKeywords(doc: any): any {
    const words = doc.plainText.split(/\s+/).filter((w: string) => w.length > 0);
    const keywordCount = doc.targetKeyword ? 
      (doc.plainText.toLowerCase().match(new RegExp(doc.targetKeyword.toLowerCase(), 'g')) || []).length : 0;
    const density = words.length > 0 ? (keywordCount / words.length) * 100 : 0;
    
    // Extract related keywords
    const extracted = keywordExtractor.extract(doc.plainText, {
      language: 'english',
      remove_digits: true,
      return_changed_case: true,
      remove_duplicates: true,
    });
    
    // Find similar keywords
    const relatedKeywords = doc.targetKeyword ? 
      extracted
        .filter((word: string) => stringSimilarity.compareTwoStrings(word, doc.targetKeyword) > 0.3)
        .slice(0, 10) : [];
    
    // Check distribution
    const sentences = doc.plainText.split(/[.!?]+/);
    const keywordSentences = doc.targetKeyword ?
      sentences.filter((s: string) => 
        s.toLowerCase().includes(doc.targetKeyword.toLowerCase())
      ) : [];
    const distribution = sentences.length > 0 ? keywordSentences.length / sentences.length : 0;
    
    return {
      density,
      distribution: distribution > 0.3 ? 'clustered' : distribution > 0.1 ? 'good' : 'sparse',
      relatedKeywords,
    };
  }

  private generateSuggestions(issues: string[], doc: any): string[] {
    const suggestions = [];
    
    if (issues.some(i => i.includes('keyword missing from title'))) {
      suggestions.push(`Try: "${doc.targetKeyword} - ${doc.title}"`);
    }
    
    if (issues.some(i => i.includes('density too low'))) {
      suggestions.push('Add keyword naturally in introduction and conclusion');
    }
    
    if (issues.some(i => i.includes('Need more headings'))) {
      suggestions.push('Break content into sections with H2/H3 headings');
    }
    
    return suggestions;
  }
} 