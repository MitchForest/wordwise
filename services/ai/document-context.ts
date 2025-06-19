/**
 * @file services/ai/document-context.ts
 * @purpose Extract context from documents for AI enhancement, including title,
 * paragraphs, topic detection, and tone analysis
 * @created 2024-12-28
 */

import { Node } from '@tiptap/pm/model';
import { UnifiedSuggestion } from '@/types/suggestions';

export interface DocumentContext {
  title: string;
  firstParagraph: string;
  detectedTopic?: string;
  detectedTone?: string;
  targetKeyword?: string;
  metaDescription?: string;
  surroundingParagraphs?: Map<string, string>; // suggestionId -> paragraph
}

export class DocumentContextExtractor {
  /**
   * @purpose Extract comprehensive context from a ProseMirror document
   * @param doc - The ProseMirror document node
   * @param suggestions - Array of suggestions to map to paragraphs
   * @returns DocumentContext object with extracted information
   */
  extract(doc: Node, suggestions: UnifiedSuggestion[]): DocumentContext {
    const text = doc.textContent;
    const paragraphs = this.extractParagraphs(doc);
    
    return {
      title: this.extractTitle(doc),
      firstParagraph: paragraphs[0] || '',
      detectedTopic: this.detectTopic(text),
      detectedTone: this.detectTone(text),
      surroundingParagraphs: this.mapSuggestionsToParagraphs(suggestions, doc)
    };
  }
  
  /**
   * @purpose Extract all paragraph text from the document
   * @param doc - The ProseMirror document
   * @returns Array of paragraph strings
   */
  private extractParagraphs(doc: Node): string[] {
    const paragraphs: string[] = [];
    doc.descendants((node) => {
      if (node.type.name === 'paragraph' && node.textContent.trim()) {
        paragraphs.push(node.textContent);
      }
    });
    return paragraphs;
  }
  
  /**
   * @purpose Extract the first H1 heading as the document title
   * @param doc - The ProseMirror document
   * @returns The document title or empty string
   */
  private extractTitle(doc: Node): string {
    let title = '';
    doc.descendants((node) => {
      if (node.type.name === 'heading' && node.attrs.level === 1 && !title) {
        title = node.textContent;
        return false; // Stop traversing once we find the first H1
      }
    });
    return title;
  }
  
  /**
   * @purpose Detect the main topic of the document using simple word frequency
   * @param text - The full document text
   * @returns The detected topic or 'general'
   */
  private detectTopic(text: string): string {
    // Simple topic detection - can be enhanced later
    const words = text.toLowerCase().split(/\s+/);
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'as', 'by', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'their', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'some', 'any', 'few', 'more', 'most', 'other', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'from', 'about', 'between', 'under']);
    const meaningfulWords = words.filter(w => w.length > 4 && !commonWords.has(w));
    
    // Count word frequencies
    const wordCounts = meaningfulWords.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Find the most common meaningful word
    const topWord = Object.entries(wordCounts)
      .sort(([, a], [, b]) => b - a)[0];
    
    return topWord ? topWord[0] : 'general';
  }
  
  /**
   * @purpose Detect the tone of the document (formal/casual/neutral)
   * @param text - The full document text
   * @returns The detected tone
   */
  private detectTone(text: string): string {
    // Simple tone detection based on word patterns
    const formalIndicators = [
      'therefore', 'however', 'furthermore', 'consequently', 'nevertheless',
      'moreover', 'nonetheless', 'accordingly', 'hence', 'thus',
      'whereas', 'whereby', 'wherein', 'thereafter', 'notwithstanding'
    ];
    
    const casualIndicators = [
      "i'm", "you're", "we're", "it's", "don't", "won't", "can't",
      "didn't", "wasn't", "weren't", "haven't", "hasn't", "hadn't",
      "wouldn't", "couldn't", "shouldn't", "gonna", "wanna", "gotta",
      "yeah", "yep", "nope", "ok", "okay", "hey", "hi", "bye"
    ];
    
    const lowerText = text.toLowerCase();
    const formalCount = formalIndicators.filter(w => lowerText.includes(w)).length;
    const casualCount = casualIndicators.filter(w => lowerText.includes(w)).length;
    
    // Calculate tone based on indicator density
    const wordCount = text.split(/\s+/).length;
    const formalDensity = formalCount / wordCount;
    const casualDensity = casualCount / wordCount;
    
    if (formalDensity > 0.01) return 'formal';
    if (casualDensity > 0.02) return 'casual';
    return 'neutral';
  }
  
  /**
   * @purpose Map each suggestion to its containing paragraph
   * @param suggestions - Array of suggestions to map
   * @param doc - The ProseMirror document
   * @returns Map of suggestion ID to paragraph text
   */
  private mapSuggestionsToParagraphs(
    suggestions: UnifiedSuggestion[],
    doc: Node
  ): Map<string, string> {
    const map = new Map<string, string>();
    
    suggestions.forEach(suggestion => {
      if (suggestion.originalFrom !== undefined) {
        // Find the paragraph containing this position
        let currentPos = 0;
        doc.descendants((node, pos) => {
          if (node.type.name === 'paragraph') {
            const nodeEnd = pos + node.nodeSize;
            if (suggestion.originalFrom! >= pos && suggestion.originalFrom! < nodeEnd) {
              map.set(suggestion.id, node.textContent);
              return false; // Stop traversing for this suggestion
            }
          }
        });
      }
    });
    
    return map;
  }
} 