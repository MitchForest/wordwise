interface CacheEntry<T> {
  data: T;
  timestamp: number;
  textHash: string;
}

export class AnalysisCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  private generateHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  get<T>(key: string, text: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    // Check if text changed
    const currentHash = this.generateHash(text);
    if (entry.textHash !== currentHash) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set<T>(key: string, data: T, text: string): void {
    const textHash = this.generateHash(text);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      textHash,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
      }
    }
  }
}

export const analysisCache = new AnalysisCache();

// Clean up cache every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    analysisCache.cleanup();
  }, 10 * 60 * 1000);
} 