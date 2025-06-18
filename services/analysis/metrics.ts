/**
 * @file services/analysis/metrics.ts
 * @purpose This service is responsible for calculating quantitative metrics about the document,
 * such as readability, word count, and reading time. It is orchestrated by the
 * UnifiedAnalysisEngine and provides data for the EditorStatusBar.
 * @modified 2024-07-26 - Replaced Readability/JSDOM with `text-statistics` for a more
 * accurate Flesch-Kincaid grade level calculation.
 */
import readingTime from 'reading-time';
import textStatistics from 'text-statistics';

export interface DocumentMetricsSet {
  readingLevel: string;
  wordCount: number;
  readingTime: string;
}

export class DocumentMetricAnalyzer {
  public run(doc: any): DocumentMetricsSet {
    if (!doc || !doc.textContent) {
      return {
        readingLevel: 'N/A',
        wordCount: 0,
        readingTime: '0 min read',
      };
    }

    const plainText = doc.textContent;
    const stats = textStatistics(plainText);
    const wordCount = stats.wordCount();

    // We now use Flesch-Kincaid Grade Level for a more concrete metric.
    const gradeLevel = stats.fleschKincaidGradeLevel();

    return {
      readingLevel: `Grade ${Math.round(gradeLevel)}`,
      wordCount,
      readingTime: readingTime(plainText).text,
    };
  }
} 