/**
 * @file services/analytics/performance-metrics.ts
 * @purpose Track analysis performance for production monitoring
 * @created 2024-12-28
 */

export class PerformanceMetrics {
  private static metrics: Map<string, number[]> = new Map();
  
  /**
   * Track analysis performance
   */
  static trackAnalysisTime(source: 'retext' | 'server', duration: number, suggestionCount: number) {
    // Only track retext performance now (server is just SEO/fallback)
    if (source === 'retext') {
      const key = 'retext_analysis';
      
      if (!this.metrics.has(key)) {
        this.metrics.set(key, []);
      }
      
      this.metrics.get(key)!.push(duration);
      
      // Keep only last 50 measurements for memory efficiency
      if (this.metrics.get(key)!.length > 50) {
        this.metrics.get(key)!.shift();
      }
      
      // Log slow analysis (>100ms is concerning for retext)
      if (duration > 100) {
        console.warn(`[Performance] Slow retext analysis: ${duration.toFixed(2)}ms for ${suggestionCount} suggestions`);
      }
    }
  }
  
  /**
   * Get average retext analysis time
   */
  static getAverageTime(): number {
    const times = this.metrics.get('retext_analysis') || [];
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }
  
  /**
   * Log performance summary
   */
  static logSummary() {
    const avg = this.getAverageTime();
    if (avg > 0) {
      console.log(`[Performance] Retext average: ${avg.toFixed(2)}ms`);
    }
  }
} 