/**
 * @file services/analysis/retext-cache.ts
 * @purpose Client-side cache for retext analysis results
 * @created 2024-12-28
 */

import { UnifiedSuggestion } from '@/types/suggestions';

export class RetextCache {
  private cache = new Map<string, { 
    suggestions: UnifiedSuggestion[],
    timestamp: number 
  }>();
  private maxAge = 5 * 60 * 1000; // 5 minutes
  private maxSize = 100; // Maximum cache entries
  
  /**
   * @purpose Generate cache key from text and check type
   * @param text - Document text (limited to first 1000 chars)
   * @param checkType - Type of check (spell/style)
   * @returns Cache key string
   */
  generateKey(text: string, checkType: string): string {
    // Simple hash for client-side
    let hash = 0;
    const str = `${checkType}-${text.slice(0, 1000)}`; // Limit text length
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
  
  /**
   * @purpose Get cached suggestions if available and not expired
   * @param key - Cache key
   * @returns Cached suggestions or null
   */
  get(key: string): UnifiedSuggestion[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.suggestions;
  }
  
  /**
   * @purpose Store suggestions in cache
   * @param key - Cache key
   * @param suggestions - Suggestions to cache
   */
  set(key: string, suggestions: UnifiedSuggestion[]): void {
    // Limit cache size
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, {
      suggestions,
      timestamp: Date.now()
    });
  }
  
  /**
   * @purpose Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * @purpose Get cache statistics
   * @returns Cache stats object
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0 // Would need to track hits/misses for accurate rate
    };
  }
} 