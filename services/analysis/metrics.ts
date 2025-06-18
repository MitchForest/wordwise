/**
 * @file services/analysis/metrics.ts
 * @purpose This service is responsible for calculating quantitative metrics about the document,
 * such as readability, word count, and reading time. It is orchestrated by the
 * UnifiedAnalysisEngine and provides data for the EditorStatusBar.
 */
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import readingTime from 'reading-time';
import { generateHTML } from '@tiptap/html';
import { serverEditorExtensions } from '@/lib/editor/tiptap-extensions.server';

export interface DocumentMetricsSet {
  readabilityScore: number;
  wordCount: number;
  readingTime: string;
}

export class DocumentMetricAnalyzer {
  public run(doc: any): DocumentMetricsSet {
    if (!doc) {
      return {
        readabilityScore: 0,
        wordCount: 0,
        readingTime: '0 min read',
      };
    }

    const plainText = doc.textContent;
    const wordCount = plainText.split(/\s+/).filter(Boolean).length;

    // Readability Analysis
    const html = generateHTML(doc.toJSON(), serverEditorExtensions);
    const dom = new JSDOM(html);
    const reader = new Readability(dom.window.document);
    const readabilityResult = reader.parse();
    // Type definitions for readability are missing fleschKincaid, so we cast to any
    const readabilityScore = readabilityResult ? this.convertFleschKincaidToScore((readabilityResult as any).fleschKincaid) : 0;

    return {
      readabilityScore,
      wordCount,
      readingTime: readingTime(plainText).text,
    };
  }

  private convertFleschKincaidToScore(fk: number | null): number {
    if (fk === null || isNaN(fk)) return 0;
    if (fk > 100) return 100;
    if (fk < 0) return 0;
    return Math.round(fk);
  }
} 