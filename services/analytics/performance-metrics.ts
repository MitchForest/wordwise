/**
 * @file services/analytics/performance-metrics.ts
 * @purpose Track and report performance metrics for the retext migration
 * @created 2024-12-28
 */

export class PerformanceMetrics {
  private static metrics: Map<string, number[]> = new Map();
  
  /**
   * @purpose Track analysis time for performance monitoring
   * @param source - Source of analysis (retext or server)
   * @param duration - Time taken in milliseconds
   * @param suggestionCount - Number of suggestions found
   */
  static trackAnalysisTime(source: 'retext' | 'server', duration: number, suggestionCount: number) {
    const key = `${source}_analysis`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    this.metrics.get(key)!.push(duration);
    
    // Keep only last 100 measurements
    if (this.metrics.get(key)!.length > 100) {
      this.metrics.get(key)!.shift();
    }
    
    console.log(`[Performance] ${source}: ${duration.toFixed(2)}ms for ${suggestionCount} suggestions`);
    
    // Send to analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'analysis_performance', {
        event_category: 'Retext Migration',
        source,
        duration: Math.round(duration),
        suggestion_count: suggestionCount,
        suggestions_per_ms: suggestionCount / duration
      });
    }
  }
  
  /**
   * @purpose Get average analysis time for a source
   * @param source - Source to get average for
   * @returns Average time in milliseconds
   */
  static getAverageTime(source: 'retext' | 'server'): number {
    const key = `${source}_analysis`;
    const times = this.metrics.get(key) || [];
    
    if (times.length === 0) return 0;
    
    return times.reduce((a, b) => a + b, 0) / times.length;
  }
  
  /**
   * @purpose Log performance summary to console
   */
  static logSummary() {
    console.log('[Performance Summary]');
    console.log(`Retext average: ${this.getAverageTime('retext').toFixed(2)}ms`);
    console.log(`Server average: ${this.getAverageTime('server').toFixed(2)}ms`);
    
    const retextAvg = this.getAverageTime('retext');
    const serverAvg = this.getAverageTime('server');
    
    if (retextAvg > 0 && serverAvg > 0) {
      const improvement = ((serverAvg - retextAvg) / serverAvg * 100).toFixed(1);
      console.log(`Performance improvement: ${improvement}%`);
    }
  }
  
  /**
   * @purpose Reset all metrics
   */
  static reset() {
    this.metrics.clear();
  }
} 