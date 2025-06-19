/**
 * @file services/analysis/engine.ts
 * @purpose This is the main analysis orchestrator, now focused on SEO analysis and
 * document metrics after the retext migration. Basic checks (spelling, grammar, style)
 * are now handled client-side by retext for instant feedback.
 * @modified 2024-12-28 - Retext migration: removed basic checks, kept SEO/metrics
 */
import { SEOAnalyzer } from './seo';
import { DocumentMetricAnalyzer } from './metrics';
import { UnifiedSuggestion } from '@/types/suggestions';

export interface DocumentMetrics {
  grammarScore: number;
  readingLevel: string;
  seoScore: number;
  wordCount: number;
  readingTime: string;
}

export class UnifiedAnalysisEngine {
  private seoAnalyzer: SEOAnalyzer;
  private metricAnalyzer: DocumentMetricAnalyzer;
  private isInitialized = false;

  constructor() {
    this.seoAnalyzer = new SEOAnalyzer();
    this.metricAnalyzer = new DocumentMetricAnalyzer();
  }

  async initialize() {
    if (this.isInitialized) return;
    // No longer need spell checker initialization - handled client-side by retext
    this.isInitialized = true;
    console.log('AnalysisEngine initialized (retext migration)');
  }

  // Fallback method for when client-side retext analysis fails
  async runFallbackAnalysis(doc: any): Promise<UnifiedSuggestion[]> {
    // This method is called when client-side retext fails
    // For now, return empty array - could integrate external API like LanguageTool
    console.log('[Engine] Running fallback analysis (retext client failed)');
    
    // TODO: Implement external service fallback (e.g., LanguageTool API)
    // if needed for critical deployments
    
    return [];
  }

  // Keep only runDeepChecks for SEO/metrics - basic checks now handled client-side
  async runDeepChecks(
    doc: any,
    documentMetadata: {
      title: string;
      metaDescription: string;
      targetKeyword: string;
      keywords: string[];
    }
  ): Promise<{ suggestions: UnifiedSuggestion[]; metrics: DocumentMetrics }> {
    if (!this.isInitialized || !doc) {
      return Promise.resolve({
        suggestions: [],
        metrics: {
          grammarScore: 100, // Client calculates this now via retext
          readingLevel: 'N/A',
          seoScore: 0,
          wordCount: 0,
          readingTime: '0 min read',
        },
      });
    }

    const plainText = doc.textContent;

    // Run SEO analysis
    const seoResult = this.seoAnalyzer.analyze({
      ...documentMetadata,
      content: doc.toJSON(),
      plainText,
    });
    
    // Run document metrics
    const metricsResult = this.metricAnalyzer.run(doc);
    
    const metrics: DocumentMetrics = {
      grammarScore: 100, // Client calculates this now via retext
      readingLevel: metricsResult.readingLevel,
      seoScore: Math.round(seoResult.score),
      wordCount: metricsResult.wordCount,
      readingTime: metricsResult.readingTime,
    };
    
    return { suggestions: seoResult.suggestions, metrics };
  }
}