interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  textHash: string;
}

interface IndexedDBEntry {
  key: string;
  data: any;
  timestamp: number;
  ttl: number;
  textHash: string;
}

export class AnalysisCache {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private maxSize = 1000;
  private defaultTTL = 300000; // 5 minutes
  private dbName = 'WordWiseCache';
  private dbVersion = 1;
  private storeName = 'cache';
  private db: IDBDatabase | null = null;
  private dbReady = false;
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.initIndexedDB();
      // Cleanup expired entries periodically
      setInterval(() => this.cleanup(), 60000); // Every minute
    }
  }
  
  private async initIndexedDB(): Promise<void> {
    try {
      this.db = await this.openIndexedDB();
      this.dbReady = true;
      // Load frequently used items into memory
      await this.preloadCache();
    } catch (error) {
      console.warn('IndexedDB initialization failed, using memory cache only:', error);
      this.dbReady = false;
    }
  }
  
  set<T>(key: string, data: T, ttlSeconds?: number | string): void {
    const ttlNum = typeof ttlSeconds === 'string' ? parseInt(ttlSeconds) : (ttlSeconds || 300);
    const ttl = ttlNum * 1000; // Convert to ms
    
    // Implement LRU eviction
    if (this.memoryCache.size >= this.maxSize) {
      const oldestKey = this.findOldestKey();
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      textHash: this.generateTextHash(data),
    };
    
    this.memoryCache.set(key, entry);
    
    // Persist to IndexedDB asynchronously
    if (this.dbReady) {
      this.persistToIndexedDB(key, entry).catch(error => 
        console.warn('Failed to persist to IndexedDB:', error)
      );
    }
  }
  
  get<T>(key: string): T | null {
    // Try memory cache first
    const entry = this.memoryCache.get(key);
    
    if (entry) {
      // Check if expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        this.memoryCache.delete(key);
        this.removeFromIndexedDB(key);
        return null;
      }
      
      // Update hit count
      entry.hits++;
      return entry.data as T;
    }
    
    // If not in memory, try IndexedDB (returns promise, handled separately)
    if (this.dbReady) {
      this.loadFromIndexedDB(key).then(data => {
        if (data) {
          // Add back to memory cache for faster access
          this.memoryCache.set(key, {
            data: data.data,
            timestamp: data.timestamp,
            ttl: data.ttl,
            hits: 1,
            textHash: data.textHash,
          });
        }
      });
    }
    
    return null;
  }
  
  // Async version for when you can wait for IndexedDB
  async getAsync<T>(key: string): Promise<T | null> {
    // Try memory cache first
    const memoryResult = this.get<T>(key);
    if (memoryResult !== null) return memoryResult;
    
    // Try IndexedDB
    if (this.dbReady) {
      const dbEntry = await this.loadFromIndexedDB(key);
      if (dbEntry && (Date.now() - dbEntry.timestamp) < dbEntry.ttl) {
        // Add to memory cache
        this.memoryCache.set(key, {
          data: dbEntry.data,
          timestamp: dbEntry.timestamp,
          ttl: dbEntry.ttl,
          hits: 1,
          textHash: dbEntry.textHash,
        });
        return dbEntry.data as T;
      }
    }
    
    return null;
  }
  
  clear(): void {
    this.memoryCache.clear();
    if (this.dbReady) {
      this.clearIndexedDB().catch(error => 
        console.warn('Failed to clear IndexedDB:', error)
      );
    }
  }
  
  // Cleanup expired entries
  async cleanup(): Promise<void> {
    const now = Date.now();
    
    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.memoryCache.delete(key);
      }
    }
    
    // Clean IndexedDB
    if (this.dbReady && this.db) {
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();
        
        request.onsuccess = () => {
          const entries = request.result as IndexedDBEntry[];
          entries.forEach(entry => {
            if (now - entry.timestamp > entry.ttl) {
              store.delete(entry.key);
            }
          });
        };
      } catch (error) {
        console.warn('Failed to cleanup IndexedDB:', error);
      }
    }
  }
  
  private findOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    let lowestHits = Infinity;
    
    // Find entry with lowest hits and oldest timestamp
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.hits < lowestHits || 
          (entry.hits === lowestHits && entry.timestamp < oldestTime)) {
        oldestTime = entry.timestamp;
        lowestHits = entry.hits;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }
  
  private generateTextHash(data: any): string {
    const str = JSON.stringify(data).slice(0, 100);
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }
  
  private async openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }
  
  private async persistToIndexedDB(key: string, entry: CacheEntry<any>): Promise<void> {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const dbEntry: IndexedDBEntry = {
        key,
        data: entry.data,
        timestamp: entry.timestamp,
        ttl: entry.ttl,
        textHash: entry.textHash,
      };
      
      await new Promise((resolve, reject) => {
        const request = store.put(dbEntry);
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('Failed to persist to IndexedDB:', error);
    }
  }
  
  private async loadFromIndexedDB(key: string): Promise<IndexedDBEntry | null> {
    if (!this.db) return null;
    
    try {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('Failed to load from IndexedDB:', error);
      return null;
    }
  }
  
  private async removeFromIndexedDB(key: string): Promise<void> {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      store.delete(key);
    } catch (error) {
      console.warn('Failed to remove from IndexedDB:', error);
    }
  }
  
  private async clearIndexedDB(): Promise<void> {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('Failed to clear IndexedDB:', error);
    }
  }
  
  private async preloadCache(): Promise<void> {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      
      // Get 50 most recent entries
      const request = index.openCursor(null, 'prev');
      let count = 0;
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && count < 50) {
          const entry = cursor.value as IndexedDBEntry;
          
          // Only preload if not expired
          if (Date.now() - entry.timestamp < entry.ttl) {
            this.memoryCache.set(entry.key, {
              data: entry.data,
              timestamp: entry.timestamp,
              ttl: entry.ttl,
              hits: 0,
              textHash: entry.textHash,
            });
          }
          
          count++;
          cursor.continue();
        }
      };
    } catch (error) {
      console.warn('Failed to preload cache:', error);
    }
  }
  
  // Get cache statistics
  getStats() {
    const memorySize = this.memoryCache.size;
    let totalHits = 0;
    let avgAge = 0;
    
    for (const entry of this.memoryCache.values()) {
      totalHits += entry.hits;
      avgAge += Date.now() - entry.timestamp;
    }
    
    return {
      memorySize,
      totalHits,
      avgAge: memorySize > 0 ? Math.round(avgAge / memorySize / 1000) : 0, // in seconds
      dbReady: this.dbReady,
    };
  }
}

// Export singleton instance
export const analysisCache = new AnalysisCache();