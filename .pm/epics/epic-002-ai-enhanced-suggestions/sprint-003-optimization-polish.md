# Sprint 003: Optimization & Polish

**Epic**: 002 - AI-Enhanced Suggestions  
**Duration**: 5 days  
**Status**: Planning

## Sprint Goal
Optimize AI enhancement performance and costs, add user preferences UI, implement advanced caching strategies for both retext and AI results, and polish the entire enhancement experience with comprehensive monitoring that tracks both client-side and server-side performance.

## Key Features

### 1. Advanced Caching System

#### 1.1 Multi-Level Cache Strategy for Retext and AI Results
```typescript
// services/ai/advanced-cache.ts
import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';

export interface CacheEntry<T> {
  data: T;
  metadata: {
    created: number;
    hits: number;
    lastAccessed: number;
    size: number;
    source: 'ai' | 'retext' | 'hybrid';
    analysisType?: 'client' | 'server';
    processingTime?: number;
  };
}

export class AdvancedAICache {
  // L1: In-memory cache for hot data
  private l1Cache: LRUCache<string, CacheEntry<any>>;
  
  // L2: IndexedDB for persistent cache
  private l2CacheReady = false;
  
  // Retext analysis cache (client-side results)
  private retextCache: LRUCache<string, CacheEntry<any>>;
  
  // AI enhancement cache (server-side results)
  private aiEnhancementCache: LRUCache<string, CacheEntry<any>>;
  
  // Common fixes cache (pre-computed)
  private commonFixesCache = new Map<string, string>();
  
  // Document similarity cache
  private similarityCache = new Map<string, string[]>();
  
  constructor() {
    // L1 cache with size and TTL limits
    this.l1Cache = new LRUCache({
      max: 500, // max items
      maxSize: 50 * 1024 * 1024, // 50MB
      sizeCalculation: (value: CacheEntry<any>) => value.metadata.size,
      ttl: 1000 * 60 * 60, // 1 hour
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });
    
    // Dedicated retext cache with longer TTL (analysis doesn't change)
    this.retextCache = new LRUCache({
      max: 1000, // more items since retext results are smaller
      maxSize: 25 * 1024 * 1024, // 25MB
      sizeCalculation: (value: CacheEntry<any>) => value.metadata.size,
      ttl: 1000 * 60 * 60 * 24, // 24 hours
      updateAgeOnGet: true
    });
    
    // AI enhancement cache with shorter TTL
    this.aiEnhancementCache = new LRUCache({
      max: 200,
      maxSize: 25 * 1024 * 1024, // 25MB
      sizeCalculation: (value: CacheEntry<any>) => value.metadata.size,
      ttl: 1000 * 60 * 60, // 1 hour
      updateAgeOnGet: true
    });
    
    this.initializeL2Cache();
    this.preloadCommonFixes();
  }
  
  // Get with multi-level fallback and cache type awareness
  async get<T>(key: string, cacheType?: 'retext' | 'ai' | 'general'): Promise<T | null> {
    // Check appropriate cache based on type
    if (cacheType === 'retext') {
      const retextEntry = this.retextCache.get(key);
      if (retextEntry) {
        retextEntry.metadata.hits++;
        retextEntry.metadata.lastAccessed = Date.now();
        return retextEntry.data as T;
      }
    } else if (cacheType === 'ai') {
      const aiEntry = this.aiEnhancementCache.get(key);
      if (aiEntry) {
        aiEntry.metadata.hits++;
        aiEntry.metadata.lastAccessed = Date.now();
        return aiEntry.data as T;
      }
    }
    
    // Check L1 for general cache
    const l1Entry = this.l1Cache.get(key);
    if (l1Entry) {
      l1Entry.metadata.hits++;
      l1Entry.metadata.lastAccessed = Date.now();
      return l1Entry.data as T;
    }
    
    // Check L2
    if (this.l2CacheReady) {
      const l2Entry = await this.getFromL2<T>(key);
      if (l2Entry) {
        // Promote to appropriate cache
        if (l2Entry.metadata.source === 'retext') {
          this.retextCache.set(key, l2Entry);
        } else if (l2Entry.metadata.source === 'ai') {
          this.aiEnhancementCache.set(key, l2Entry);
        } else {
          this.l1Cache.set(key, l2Entry);
        }
        return l2Entry.data;
      }
    }
    
    return null;
  }
  
  // Set with intelligent placement and cache type routing
  async set<T>(key: string, data: T, options?: {
    ttl?: number;
    priority?: 'high' | 'normal' | 'low';
    source?: 'ai' | 'retext' | 'hybrid';
    analysisType?: 'client' | 'server';
    processingTime?: number;
  }): Promise<void> {
    const size = JSON.stringify(data).length;
    const entry: CacheEntry<T> = {
      data,
      metadata: {
        created: Date.now(),
        hits: 0,
        lastAccessed: Date.now(),
        size,
        source: options?.source || 'ai',
        analysisType: options?.analysisType,
        processingTime: options?.processingTime
      }
    };
    
    // Route to appropriate cache based on source
    if (options?.source === 'retext') {
      this.retextCache.set(key, entry, {
        ttl: options?.ttl
      });
    } else if (options?.source === 'ai') {
      this.aiEnhancementCache.set(key, entry, {
        ttl: options?.ttl
      });
    } else {
      this.l1Cache.set(key, entry, {
        ttl: options?.ttl
      });
    }
    
    // Set in L2 for persistence
    if (this.l2CacheReady && options?.priority !== 'low') {
      await this.setInL2(key, entry);
    }
  }
  
  // Preload common spelling/grammar fixes
  private async preloadCommonFixes(): Promise<void> {
    const commonErrors = [
      // Common spelling mistakes
      { from: 'teh', to: 'the' },
      { from: 'thier', to: 'their' },
      { from: 'recieve', to: 'receive' },
      { from: 'occured', to: 'occurred' },
      { from: 'seperate', to: 'separate' },
      { from: 'definately', to: 'definitely' },
      { from: 'accomodate', to: 'accommodate' },
      { from: 'acheive', to: 'achieve' },
      
      // Common grammar fixes
      { from: "it's", to: 'its', context: 'possessive' },
      { from: 'its', to: "it's", context: 'contraction' },
      { from: 'your', to: "you're", context: 'contraction' },
      { from: "you're", to: 'your', context: 'possessive' },
      { from: 'there', to: 'their', context: 'possessive' },
      { from: 'their', to: "they're", context: 'contraction' },
      
      // Style improvements
      { from: 'very unique', to: 'unique' },
      { from: 'in order to', to: 'to' },
      { from: 'due to the fact that', to: 'because' },
      { from: 'at this point in time', to: 'now' },
      { from: 'in the event that', to: 'if' }
    ];
    
    commonErrors.forEach(({ from, to, context }) => {
      const key = context ? `${from}:${context}` : from;
      this.commonFixesCache.set(key, to);
    });
    
    console.log(`[Cache] Preloaded ${commonErrors.length} common fixes`);
  }
  
  // Check if we have a common fix before calling AI
  getCommonFix(error: string, context?: string): string | null {
    const key = context ? `${error}:${context}` : error;
    return this.commonFixesCache.get(key) || null;
  }
  
  // Find similar documents for cross-document caching
  async findSimilarDocuments(
    documentHash: string,
    topic: string
  ): Promise<string[]> {
    const key = `${topic}:${documentHash.substring(0, 8)}`;
    
    if (this.similarityCache.has(key)) {
      return this.similarityCache.get(key)!;
    }
    
    // In a real implementation, this would query a vector database
    // For now, we'll use topic-based similarity
    const similar: string[] = [];
    
    this.l1Cache.forEach((value, cacheKey) => {
      if (cacheKey.includes(topic) && cacheKey !== documentHash) {
        similar.push(cacheKey);
      }
    });
    
    this.similarityCache.set(key, similar);
    return similar;
  }
  
  // Get cache statistics with separate tracking for retext and AI
  getStats(): CacheStats {
    const l1Stats = {
      size: this.l1Cache.size,
      maxSize: this.l1Cache.maxSize,
      itemCount: this.l1Cache.size,
      hitRate: this.calculateHitRate(this.l1Cache)
    };
    
    const retextStats = {
      size: this.retextCache.size,
      maxSize: this.retextCache.maxSize,
      itemCount: this.retextCache.size,
      hitRate: this.calculateHitRate(this.retextCache)
    };
    
    const aiStats = {
      size: this.aiEnhancementCache.size,
      maxSize: this.aiEnhancementCache.maxSize,
      itemCount: this.aiEnhancementCache.size,
      hitRate: this.calculateHitRate(this.aiEnhancementCache)
    };
    
    return {
      l1: l1Stats,
      retext: retextStats,
      ai: aiStats,
      commonFixes: this.commonFixesCache.size,
      totalMemoryUsage: (this.l1Cache.calculatedSize || 0) + 
                       (this.retextCache.calculatedSize || 0) + 
                       (this.aiEnhancementCache.calculatedSize || 0),
      cacheEfficiency: this.calculateEfficiency()
    };
  }
  
  private calculateHitRate(cache: LRUCache<string, CacheEntry<any>>): number {
    let totalHits = 0;
    let totalAccesses = 0;
    
    cache.forEach((entry) => {
      totalHits += entry.metadata.hits;
      totalAccesses += entry.metadata.hits + 1; // +1 for the initial set
    });
    
    return totalAccesses > 0 ? totalHits / totalAccesses : 0;
  }
  
  private calculateEfficiency(): number {
    // Efficiency based on hit rates across all caches and size utilization
    const l1HitRate = this.calculateHitRate(this.l1Cache);
    const retextHitRate = this.calculateHitRate(this.retextCache);
    const aiHitRate = this.calculateHitRate(this.aiEnhancementCache);
    
    const avgHitRate = (l1HitRate + retextHitRate + aiHitRate) / 3;
    
    const totalSize = (this.l1Cache.calculatedSize || 0) + 
                     (this.retextCache.calculatedSize || 0) + 
                     (this.aiEnhancementCache.calculatedSize || 0);
    const totalMaxSize = this.l1Cache.maxSize + 
                        this.retextCache.maxSize + 
                        this.aiEnhancementCache.maxSize;
    const sizeUtilization = totalSize / totalMaxSize;
    
    return (avgHitRate * 0.7 + sizeUtilization * 0.3);
  }
  
  // L2 Cache implementation (IndexedDB)
  private async initializeL2Cache(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const db = await this.openIndexedDB();
      this.l2CacheReady = true;
      
      // Clean old entries on startup
      await this.cleanL2Cache(db);
    } catch (error) {
      console.warn('[Cache] L2 cache initialization failed:', error);
      this.l2CacheReady = false;
    }
  }
  
  private async openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WordWiseAICache', 2);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('created', 'metadata.created');
          store.createIndex('source', 'metadata.source');
        }
      };
    });
  }
  
  private async getFromL2<T>(key: string): Promise<CacheEntry<T> | null> {
    const db = await this.openIndexedDB();
    const transaction = db.transaction(['cache'], 'readonly');
    const store = transaction.objectStore('cache');
    
    return new Promise((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }
  
  private async setInL2(key: string, entry: CacheEntry<any>): Promise<void> {
    const db = await this.openIndexedDB();
    const transaction = db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    
    store.put({ key, ...entry });
  }
  
  private async cleanL2Cache(db: IDBDatabase): Promise<void> {
    const transaction = db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    const index = store.index('created');
    
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    const range = IDBKeyRange.upperBound(cutoff);
    
    const request = index.openCursor(range);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      }
    };
  }
}

interface CacheStats {
  l1: {
    size: number;
    maxSize: number;
    itemCount: number;
    hitRate: number;
  };
  retext: {
    size: number;
    maxSize: number;
    itemCount: number;
    hitRate: number;
  };
  ai: {
    size: number;
    maxSize: number;
    itemCount: number;
    hitRate: number;
  };
  commonFixes: number;
  totalMemoryUsage: number;
  cacheEfficiency: number;
}
```

#### 1.2 Cross-Document Cache Sharing for Retext and AI Results
```typescript
// services/ai/cache-sharing.ts
export class CrossDocumentCacheManager {
  private topicClusters = new Map<string, Set<string>>();
  private documentTopics = new Map<string, string>();
  private retextResultSharing = new Map<string, Set<string>>(); // Track retext result sharing
  
  // Register a document with its topic
  registerDocument(documentId: string, topic: string): void {
    this.documentTopics.set(documentId, topic);
    
    const cluster = this.topicClusters.get(topic) || new Set();
    cluster.add(documentId);
    this.topicClusters.set(topic, cluster);
  }
  
  // Find related documents for cache sharing
  findRelatedDocuments(documentId: string): string[] {
    const topic = this.documentTopics.get(documentId);
    if (!topic) return [];
    
    const cluster = this.topicClusters.get(topic) || new Set();
    return Array.from(cluster).filter(id => id !== documentId);
  }
  
  // Generate shareable cache key
  generateShareableKey(
    baseKey: string,
    topic: string,
    isShareable: boolean
  ): string {
    if (!isShareable) return baseKey;
    
    // Create a topic-specific key that can be shared
    const topicHash = createHash('sha256').update(topic).digest('hex').substring(0, 8);
    return `shared:${topicHash}:${baseKey}`;
  }
  
  // Check if a suggestion is shareable across documents
  isSuggestionShareable(suggestion: UnifiedSuggestion, isRetextResult: boolean): boolean {
    // Retext results are more shareable since they're rule-based
    if (isRetextResult) {
      // All retext spelling and grammar checks are shareable
      if (['spelling', 'grammar'].includes(suggestion.category)) return true;
      // Basic style checks from retext are also shareable
      if (suggestion.category === 'style' && 
          ['passive-voice', 'weasel-words', 'redundancy'].includes(suggestion.subCategory)) {
        return true;
      }
    }
    
    // AI-enhanced suggestions shareability
    // Style and general grammar suggestions are often shareable
    if (suggestion.category === 'style') return true;
    if (suggestion.category === 'grammar' && 
        !['proper-noun', 'context-specific'].includes(suggestion.subCategory)) {
      return true;
    }
    
    // Spelling suggestions for common words are shareable
    if (suggestion.category === 'spelling' && 
        suggestion.context.text.length > 4) {
      return true;
    }
    
    return false;
  }
}
```

### 2. Cost Optimization

#### 2.1 Advanced Provider Management and Model Selection
```typescript
// services/ai/provider-registry.ts
import { experimental_createProviderRegistry as createProviderRegistry } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';

export class AIProviderManager {
  private registry = createProviderRegistry({
    openai,
    anthropic, // Fallback provider
  });
  
  // Model selection based on task complexity and user tier
  selectModel(params: {
    taskType: 'simple' | 'moderate' | 'complex';
    userTier: 'free' | 'premium' | 'enterprise';
    suggestionCategory?: string;
    retryCount?: number;
  }): string {
    const { taskType, userTier, suggestionCategory, retryCount = 0 } = params;
    
    // Retry logic - use fallback provider after failures
    if (retryCount > 2) {
      return 'anthropic:claude-3-haiku'; // Fast, cheap fallback
    }
    
    // User tier based selection
    if (userTier === 'free') {
      return 'openai:gpt-3.5-turbo';
    }
    
    // Task complexity based selection
    const modelMap = {
      simple: {
        spelling: 'openai:gpt-3.5-turbo',
        grammar: 'openai:gpt-3.5-turbo',
        style: 'openai:gpt-4o-mini',
        seo: 'openai:gpt-4o-mini'
      },
      moderate: {
        spelling: 'openai:gpt-4o-mini',
        grammar: 'openai:gpt-4o-mini',
        style: 'openai:gpt-4o',
        seo: 'openai:gpt-4o'
      },
      complex: {
        spelling: 'openai:gpt-4o',
        grammar: 'openai:gpt-4o',
        style: 'openai:gpt-4o',
        seo: 'openai:gpt-4o'
      }
    };
    
    if (suggestionCategory && modelMap[taskType][suggestionCategory]) {
      return modelMap[taskType][suggestionCategory];
    }
    
    // Default based on tier
    return userTier === 'enterprise' ? 'openai:gpt-4o' : 'openai:gpt-4o-mini';
  }
  
  getModel(modelId: string) {
    return this.registry.languageModel(modelId);
  }
  
  // Estimate task complexity based on suggestion types (only for AI-needed suggestions)
  estimateComplexity(suggestions: UnifiedSuggestion[]): 'simple' | 'moderate' | 'complex' {
    // Filter out suggestions that retext already handles well
    const aiNeededSuggestions = suggestions.filter(s => 
      !this.isHandledByRetext(s) || this.needsAIEnhancement(s)
    );
    
    if (aiNeededSuggestions.length === 0) return 'simple';
    
    const complexityScores = aiNeededSuggestions.map(s => {
      // Simple: basic spelling, grammar
      if (['spelling', 'basic-grammar'].includes(s.subCategory)) return 1;
      
      // Moderate: style, advanced grammar
      if (['style', 'advanced-grammar', 'clarity'].includes(s.subCategory)) return 2;
      
      // Complex: context-dependent, SEO, tone
      if (['context', 'seo-optimization', 'tone'].includes(s.subCategory)) return 3;
      
      return 2; // Default moderate
    });
    
    const avgScore = complexityScores.reduce((a, b) => a + b, 0) / complexityScores.length;
    
    if (avgScore <= 1.5) return 'simple';
    if (avgScore <= 2.5) return 'moderate';
    return 'complex';
  }
  
  // Check if suggestion is already well-handled by retext
  private isHandledByRetext(suggestion: UnifiedSuggestion): boolean {
    // Retext handles these categories well
    const retextCategories = [
      'spelling-basic',
      'grammar-basic',
      'passive-voice',
      'weasel-words',
      'redundancy',
      'repeated-words'
    ];
    
    return retextCategories.includes(suggestion.subCategory);
  }
  
  // Check if retext suggestion needs AI enhancement
  private needsAIEnhancement(suggestion: UnifiedSuggestion): boolean {
    // These need AI for better context and explanations
    const needsEnhancement = [
      'style',
      'clarity',
      'tone',
      'seo-optimization',
      'complex-grammar'
    ];
    
    return needsEnhancement.includes(suggestion.category) ||
           needsEnhancement.includes(suggestion.subCategory);
  }
}

#### 2.2 Enhanced Token Counter with AI SDK Integration
```typescript
// services/ai/token-counter.ts
import { encoding_for_model } from 'tiktoken';

export class TokenCounter {
  private aiOnlySuggestions = new Set<string>(); // Track which suggestions need AI
  private encoders = new Map<string, any>();
  
  // Get encoder for specific model
  private getEncoder(model: string) {
    if (!this.encoders.has(model)) {
      // Map provider models to tiktoken models
      const modelMap: Record<string, string> = {
        'gpt-4o': 'gpt-4',
        'gpt-4o-mini': 'gpt-4',
        'gpt-3.5-turbo': 'gpt-3.5-turbo',
        'claude-3-haiku': 'claude-3-haiku',
        'claude-3-sonnet': 'claude-3-sonnet'
      };
      
      const baseModel = model.split(':')[1] || model;
      const tiketokenModel = modelMap[baseModel] || 'gpt-4';
      this.encoders.set(model, encoding_for_model(tiketokenModel));
    }
    return this.encoders.get(model);
  }
  
  // Count tokens for a prompt (only for AI-enhanced suggestions)
  countTokens(text: string, model = 'gpt-4o', isAIOnly = false): number {
    if (!isAIOnly) return 0; // Don't count tokens for retext-only suggestions
    const encoder = this.getEncoder(model);
    return encoder.encode(text).length;
  }
  
  // Track suggestions that need AI enhancement
  markAsAINeeded(suggestionId: string): void {
    this.aiOnlySuggestions.add(suggestionId);
  }
  
  // Check if suggestion needs AI
  needsAI(suggestionId: string): boolean {
    return this.aiOnlySuggestions.has(suggestionId);
  }
  
  // Enhanced cost estimation with actual token usage from AI SDK
  estimateCost(
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    },
    model: string
  ): number {
    const pricing: Record<string, { prompt: number; completion: number }> = {
      'openai:gpt-4o': {
        prompt: 0.005, // $5 per 1M tokens
        completion: 0.015 // $15 per 1M tokens
      },
      'openai:gpt-4o-mini': {
        prompt: 0.00015, // $0.15 per 1M tokens
        completion: 0.0006 // $0.60 per 1M tokens
      },
      'openai:gpt-3.5-turbo': {
        prompt: 0.0005,
        completion: 0.0015
      },
      'anthropic:claude-3-haiku': {
        prompt: 0.00025,
        completion: 0.00125
      }
    };
    
    const modelPricing = pricing[model] || pricing['openai:gpt-4o'];
    const promptCost = (usage.promptTokens / 1_000_000) * modelPricing.prompt;
    const completionCost = (usage.completionTokens / 1_000_000) * modelPricing.completion;
    
    return promptCost + completionCost;
  }
  
  // Track token usage with AI SDK callbacks
  createUsageTracker() {
    let totalUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      callCount: 0
    };
    
    return {
      onFinish: (usage: any, model: string) => {
        totalUsage.promptTokens += usage.promptTokens || 0;
        totalUsage.completionTokens += usage.completionTokens || 0;
        totalUsage.totalTokens += usage.totalTokens || 0;
        totalUsage.totalCost += this.estimateCost(usage, model);
        totalUsage.callCount++;
      },
      getUsage: () => totalUsage,
      reset: () => {
        totalUsage = {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          totalCost: 0,
          callCount: 0
        };
      }
    };
  }
  
  // Optimize prompt to reduce tokens
  optimizePrompt(prompt: string, maxTokens: number, model = 'gpt-4o'): string {
    const currentTokens = this.countTokens(prompt, model);
    
    if (currentTokens <= maxTokens) return prompt;
    
    // Optimization strategies
    let optimized = prompt;
    
    // 1. Remove redundant whitespace
    optimized = optimized.replace(/\s+/g, ' ').trim();
    
    // 2. Shorten example text
    optimized = optimized.replace(/(".{50,}")/g, (match) => {
      return match.substring(0, 50) + '..."';
    });
    
    // 3. Remove less important context
    if (this.countTokens(optimized, model) > maxTokens) {
      const lines = optimized.split('\n');
      const priorityLines = lines.filter(line => 
        !line.includes('Focus on:') && 
        !line.includes('Pay special attention')
      );
      optimized = priorityLines.join('\n');
    }
    
    // 4. Use compression techniques
    if (this.countTokens(optimized, model) > maxTokens) {
      // Remove examples if present
      optimized = optimized.replace(/Example:.*?(?=\n\n|\n[A-Z]|$)/gs, '');
      
      // Compress lists
      optimized = optimized.replace(/^\s*[-•]\s*/gm, '- ');
    }
    
    return optimized;
  }
}
```

#### 2.3 Batch Optimization Service
```typescript
// services/ai/batch-optimizer.ts
export class BatchOptimizer {
  private tokenCounter = new TokenCounter();
  private maxBatchTokens = 8000; // Safe limit for GPT-4
  
  // Intelligently batch suggestions to minimize API calls
  optimizeBatches(
    suggestions: UnifiedSuggestion[],
    context: DocumentContext,
    retextResults: Map<string, any> // Results from client-side retext analysis
  ): UnifiedSuggestion[][] {
    // Filter out suggestions already handled by retext
    const aiNeededSuggestions = suggestions.filter(s => {
      const retextResult = retextResults.get(s.id);
      // Only send to AI if retext didn't provide a good fix or needs enhancement
      return !retextResult || this.needsAIEnhancement(s, retextResult);
    });
    // Sort by priority (errors > warnings > suggestions)
    const sorted = [...aiNeededSuggestions].sort((a, b) => {
      const priority = { error: 0, warning: 1, suggestion: 2, info: 3 };
      return priority[a.severity] - priority[b.severity];
    });
    
    const batches: UnifiedSuggestion[][] = [];
    let currentBatch: UnifiedSuggestion[] = [];
    let currentTokens = this.getBasePromptTokens(context);
    
    for (const suggestion of sorted) {
      const suggestionTokens = this.estimateSuggestionTokens(suggestion);
      
      if (currentTokens + suggestionTokens > this.maxBatchTokens && currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentTokens = this.getBasePromptTokens(context);
      }
      
      currentBatch.push(suggestion);
      currentTokens += suggestionTokens;
    }
    
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }
    
    console.log(`[Batch Optimizer] Created ${batches.length} batches from ${aiNeededSuggestions.length} AI-needed suggestions (filtered from ${suggestions.length} total)`);
    
    return batches;
  }
  
  // Check if suggestion needs AI enhancement beyond retext
  private needsAIEnhancement(suggestion: UnifiedSuggestion, retextResult: any): boolean {
    // If retext has no fix, definitely needs AI
    if (!retextResult.fix) return true;
    
    // Complex categories need AI for better context
    const complexCategories = ['style', 'clarity', 'tone', 'seo'];
    if (complexCategories.includes(suggestion.category)) return true;
    
    // If confidence is low, use AI for improvement
    if (retextResult.confidence && retextResult.confidence < 0.7) return true;
    
    return false;
  }
  
  private getBasePromptTokens(context: DocumentContext): number {
    const basePrompt = `Document context: ${context.title} ${context.firstParagraph}`;
    return this.tokenCounter.countTokens(basePrompt) + 500; // Buffer for system prompt
  }
  
  private estimateSuggestionTokens(suggestion: UnifiedSuggestion): number {
    const text = `${suggestion.id} ${suggestion.message} ${suggestion.matchText}`;
    return this.tokenCounter.countTokens(text) + 50; // Buffer for response
  }
  
  // Deduplicate similar suggestions before sending to AI
  deduplicateSuggestions(suggestions: UnifiedSuggestion[]): {
    unique: UnifiedSuggestion[];
    duplicates: Map<string, string[]>; // original ID -> duplicate IDs
  } {
    const unique: UnifiedSuggestion[] = [];
    const duplicates = new Map<string, string[]>();
    const seen = new Map<string, UnifiedSuggestion>();
    
    for (const suggestion of suggestions) {
      const key = `${suggestion.category}:${suggestion.subCategory}:${suggestion.matchText}`;
      const existing = seen.get(key);
      
      if (existing) {
        const dups = duplicates.get(existing.id) || [];
        dups.push(suggestion.id);
        duplicates.set(existing.id, dups);
      } else {
        seen.set(key, suggestion);
        unique.push(suggestion);
      }
    }
    
    return { unique, duplicates };
  }
}
```

### 3. User Preferences UI

#### 3.1 AI Preferences Component
```typescript
// components/settings/AIPreferences.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Sparkles, Zap, Shield, DollarSign, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface AIPreferences {
  enabled: boolean;
  enhancementLevel: 'minimal' | 'balanced' | 'aggressive';
  confidenceThreshold: number;
  categories: {
    spelling: boolean;
    grammar: boolean;
    style: boolean;
    seo: boolean;
  };
  retextSettings: {
    enabled: boolean;
    runOnClient: boolean;
    cacheResults: boolean;
    rules: {
      spelling: boolean;
      grammar: boolean;
      style: boolean;
      clarity: boolean;
    };
  };
  costSaving: boolean;
  shareCache: boolean;
}

export function AIPreferencesSettings({ userId }: { userId: string }) {
  const [preferences, setPreferences] = useState<AIPreferences>({
    enabled: true,
    enhancementLevel: 'balanced',
    confidenceThreshold: 0.7,
    categories: {
      spelling: true,
      grammar: true,
      style: true,
      seo: true
    },
    retextSettings: {
      enabled: true,
      runOnClient: true,
      cacheResults: true,
      rules: {
        spelling: true,
        grammar: true,
        style: true,
        clarity: true
      }
    },
    costSaving: true,
    shareCache: true
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    // Load preferences
    fetch(`/api/user/ai-preferences/${userId}`)
      .then(r => r.json())
      .then(data => setPreferences(data))
      .catch(console.error);
  }, [userId]);
  
  const savePreferences = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/user/ai-preferences/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });
      
      if (response.ok) {
        toast({
          title: 'Preferences saved',
          description: 'Your AI enhancement preferences have been updated.'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Main Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI Enhancement
          </CardTitle>
          <CardDescription>
            Use AI to improve writing suggestions and detect complex issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="ai-enabled">Enable AI Enhancement</Label>
            <Switch
              id="ai-enabled"
              checked={preferences.enabled}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, enabled: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Enhancement Level */}
      <Card className={!preferences.enabled ? 'opacity-50' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Enhancement Level
          </CardTitle>
          <CardDescription>
            Control how aggressively AI enhances suggestions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Minimal</span>
              <span>Balanced</span>
              <span>Aggressive</span>
            </div>
            <Slider
              value={[preferences.enhancementLevel === 'minimal' ? 0 : 
                     preferences.enhancementLevel === 'balanced' ? 1 : 2]}
              onValueChange={([value]) => {
                const levels = ['minimal', 'balanced', 'aggressive'] as const;
                setPreferences(prev => ({ 
                  ...prev, 
                  enhancementLevel: levels[value] 
                }));
              }}
              max={2}
              step={1}
              disabled={!preferences.enabled}
            />
          </div>
          
          <div className="text-sm text-muted-foreground">
            {preferences.enhancementLevel === 'minimal' && 
              'Only enhance suggestions that have no fixes'}
            {preferences.enhancementLevel === 'balanced' && 
              'Enhance all suggestions with contextual improvements'}
            {preferences.enhancementLevel === 'aggressive' && 
              'Maximum enhancement with style and clarity improvements'}
          </div>
        </CardContent>
      </Card>
      
      {/* Confidence Threshold */}
      <Card className={!preferences.enabled ? 'opacity-50' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            Confidence Threshold
          </CardTitle>
          <CardDescription>
            Only show AI suggestions above this confidence level
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Minimum Confidence</Label>
              <span className="text-sm text-muted-foreground">
                {Math.round(preferences.confidenceThreshold * 100)}%
              </span>
            </div>
            <Slider
              value={[preferences.confidenceThreshold]}
              onValueChange={([value]) => 
                setPreferences(prev => ({ 
                  ...prev, 
                  confidenceThreshold: value 
                }))
              }
              max={1}
              min={0.5}
              step={0.05}
              disabled={!preferences.enabled}
            />
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="w-4 h-4" />
            <span>Higher threshold means fewer but more accurate suggestions</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Category Selection */}
      <Card className={!preferences.enabled ? 'opacity-50' : ''}>
        <CardHeader>
          <CardTitle>Enhancement Categories</CardTitle>
          <CardDescription>
            Choose which types of suggestions to enhance with AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(preferences.categories).map(([category, enabled]) => (
            <div key={category} className="flex items-center justify-between">
              <Label htmlFor={`cat-${category}`} className="capitalize">
                {category}
              </Label>
              <Switch
                id={`cat-${category}`}
                checked={enabled}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({
                    ...prev,
                    categories: { ...prev.categories, [category]: checked }
                  }))
                }
                disabled={!preferences.enabled}
              />
            </div>
          ))}
        </CardContent>
      </Card>
      
      {/* Retext Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            Retext Analysis Settings
          </CardTitle>
          <CardDescription>
            Configure client-side text analysis with retext
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="retext-enabled">Enable Retext Analysis</Label>
            <Switch
              id="retext-enabled"
              checked={preferences.retextSettings.enabled}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({
                  ...prev,
                  retextSettings: { ...prev.retextSettings, enabled: checked }
                }))
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="run-client">Run on Client</Label>
              <p className="text-sm text-muted-foreground">
                Analyze text locally for faster results
              </p>
            </div>
            <Switch
              id="run-client"
              checked={preferences.retextSettings.runOnClient}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({
                  ...prev,
                  retextSettings: { ...prev.retextSettings, runOnClient: checked }
                }))
              }
              disabled={!preferences.retextSettings.enabled}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="cache-retext">Cache Retext Results</Label>
              <p className="text-sm text-muted-foreground">
                Store analysis results for performance
              </p>
            </div>
            <Switch
              id="cache-retext"
              checked={preferences.retextSettings.cacheResults}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({
                  ...prev,
                  retextSettings: { ...prev.retextSettings, cacheResults: checked }
                }))
              }
              disabled={!preferences.retextSettings.enabled}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Retext Rules</Label>
            {Object.entries(preferences.retextSettings.rules).map(([rule, enabled]) => (
              <div key={rule} className="flex items-center justify-between pl-4">
                <Label htmlFor={`retext-${rule}`} className="capitalize text-sm">
                  {rule}
                </Label>
                <Switch
                  id={`retext-${rule}`}
                  checked={enabled}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({
                      ...prev,
                      retextSettings: {
                        ...prev.retextSettings,
                        rules: { ...prev.retextSettings.rules, [rule]: checked }
                      }
                    }))
                  }
                  disabled={!preferences.retextSettings.enabled}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Cost Optimization */}
      <Card className={!preferences.enabled ? 'opacity-50' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Cost Optimization
          </CardTitle>
          <CardDescription>
            Settings to reduce AI usage costs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="cost-saving">Enable Cost Saving Mode</Label>
              <p className="text-sm text-muted-foreground">
                Use aggressive caching and batching
              </p>
            </div>
            <Switch
              id="cost-saving"
              checked={preferences.costSaving}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, costSaving: checked }))
              }
              disabled={!preferences.enabled}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="share-cache">Share Cache Across Documents</Label>
              <p className="text-sm text-muted-foreground">
                Reuse enhancements for similar content
              </p>
            </div>
            <Switch
              id="share-cache"
              checked={preferences.shareCache}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, shareCache: checked }))
              }
              disabled={!preferences.enabled}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Save Button */}
      <Button 
        onClick={savePreferences} 
        disabled={saving}
        className="w-full"
      >
        {saving ? 'Saving...' : 'Save Preferences'}
      </Button>
    </div>
  );
}
```

#### 3.2 AI Preferences API
```typescript
// app/api/user/ai-preferences/[userId]/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userAIPreferences } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.id !== params.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const prefs = await db.query.userAIPreferences.findFirst({
      where: eq(userAIPreferences.userId, params.userId)
    });
    
    // Return defaults if no preferences exist
    if (!prefs) {
      return NextResponse.json({
        enabled: true,
        enhancementLevel: 'balanced',
        confidenceThreshold: 0.7,
        categories: {
          spelling: true,
          grammar: true,
          style: true,
          seo: true
        },
        retextSettings: {
          enabled: true,
          runOnClient: true,
          cacheResults: true,
          rules: {
            spelling: true,
            grammar: true,
            style: true,
            clarity: true
          }
        },
        costSaving: true,
        shareCache: true
      });
    }
    
    return NextResponse.json(prefs.preferences);
  } catch (error) {
    console.error('[AI Preferences API] Error:', error);
    return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.id !== params.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const preferences = await request.json();
    
    await db
      .insert(userAIPreferences)
      .values({
        userId: params.userId,
        preferences,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: userAIPreferences.userId,
        set: {
          preferences,
          updatedAt: new Date()
        }
      });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AI Preferences API] Error:', error);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}
```

### 4. Performance Monitoring

#### 4.1 Enhanced AI Performance Monitor with AI SDK Integration
```typescript
// services/ai/performance-monitor.ts
import { APICallError } from 'ai';
import { TokenCounter } from './token-counter';
import { AIProviderManager } from './provider-registry';

export interface AIPerformanceMetrics {
  apiLatency: number[];
  cacheHitRate: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
    byModel: Record<string, { prompt: number; completion: number; calls: number }>;
  };
  costEstimate: number;
  costByModel: Record<string, number>;
  enhancementQuality: {
    accepted: number;
    rejected: number;
    modified: number;
  };
  errorRate: number;
  errorsByType: Record<string, number>;
  finishReasons: Record<string, number>;
  retextMetrics: {
    clientProcessingTime: number[];
    serverProcessingTime: number[];
    cacheHitRate: number;
    suggestionsHandled: number;
    suggestionsNeedingAI: number;
  };
}

export class AIPerformanceMonitor {
  private metrics: AIPerformanceMetrics = {
    apiLatency: [],
    cacheHitRate: 0,
    tokenUsage: { 
      prompt: 0, 
      completion: 0, 
      total: 0,
      byModel: {}
    },
    costEstimate: 0,
    costByModel: {},
    enhancementQuality: { accepted: 0, rejected: 0, modified: 0 },
    errorRate: 0,
    errorsByType: {},
    finishReasons: {},
    retextMetrics: {
      clientProcessingTime: [],
      serverProcessingTime: [],
      cacheHitRate: 0,
      suggestionsHandled: 0,
      suggestionsNeedingAI: 0
    }
  };
  
  private metricsWindow = 100; // Keep last 100 measurements
  private tokenCounter = new TokenCounter();
  private providerManager = new AIProviderManager();
  
  // Enhanced API call tracking with AI SDK callbacks
  createCallbacks(model: string) {
    const startTime = Date.now();
    
    return {
      onStart: () => {
        console.log(`[AI Monitor] Starting ${model} call`);
      },
      
      onFinish: ({ usage, finishReason }: any) => {
        const latency = Date.now() - startTime;
        
        // Track latency
        this.metrics.apiLatency.push(latency);
        if (this.metrics.apiLatency.length > this.metricsWindow) {
          this.metrics.apiLatency.shift();
        }
        
        // Track token usage
        if (usage) {
          this.trackTokenUsage(usage, model);
        }
        
        // Track finish reasons
        this.metrics.finishReasons[finishReason] = 
          (this.metrics.finishReasons[finishReason] || 0) + 1;
        
        console.log(`[AI Monitor] ${model} completed in ${latency}ms`, {
          tokens: usage?.totalTokens,
          finishReason,
          cost: this.tokenCounter.estimateCost(usage, model)
        });
      },
      
      onError: (error: unknown) => {
        this.trackError(error, model);
      }
    };
  }
  
  // Track token usage with model breakdown
  trackTokenUsage(
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    },
    model: string
  ): void {
    // Update total usage
    this.metrics.tokenUsage.prompt += usage.promptTokens;
    this.metrics.tokenUsage.completion += usage.completionTokens;
    this.metrics.tokenUsage.total += usage.totalTokens;
    
    // Update per-model usage
    if (!this.metrics.tokenUsage.byModel[model]) {
      this.metrics.tokenUsage.byModel[model] = {
        prompt: 0,
        completion: 0,
        calls: 0
      };
    }
    
    this.metrics.tokenUsage.byModel[model].prompt += usage.promptTokens;
    this.metrics.tokenUsage.byModel[model].completion += usage.completionTokens;
    this.metrics.tokenUsage.byModel[model].calls++;
    
    // Update cost tracking
    const cost = this.tokenCounter.estimateCost(usage, model);
    this.metrics.costEstimate += cost;
    this.metrics.costByModel[model] = (this.metrics.costByModel[model] || 0) + cost;
  }
  
  // Enhanced error tracking
  trackError(error: unknown, model: string): void {
    this.metrics.errorRate++;
    
    if (APICallError.isAPICallError(error)) {
      const errorType = `${error.statusCode}_${error.type || 'unknown'}`;
      this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;
      
      // Log specific error details
      console.error(`[AI Monitor] API Error on ${model}:`, {
        status: error.statusCode,
        type: error.type,
        message: error.message,
        isRetryable: error.isRetryable,
        model
      });
      
      // Track rate limit errors separately
      if (error.statusCode === 429) {
        this.metrics.errorsByType['rate_limit'] = (this.metrics.errorsByType['rate_limit'] || 0) + 1;
      }
    } else {
      this.metrics.errorsByType['unknown'] = (this.metrics.errorsByType['unknown'] || 0) + 1;
    }
  }
  
  // Track cache performance
  trackCacheHit(hit: boolean): void {
    // Simple moving average for cache hit rate
    const alpha = 0.1; // Smoothing factor
    const currentHit = hit ? 1 : 0;
    this.metrics.cacheHitRate = 
      alpha * currentHit + (1 - alpha) * this.metrics.cacheHitRate;
  }
  
  // Track enhancement quality
  trackEnhancementFeedback(
    action: 'accepted' | 'rejected' | 'modified'
  ): void {
    this.metrics.enhancementQuality[action]++;
  }
  
  // Track retext performance
  trackRetextPerformance(params: {
    processingTime: number;
    location: 'client' | 'server';
    suggestionsCount: number;
    aiNeededCount: number;
    cacheHit: boolean;
  }): void {
    const { processingTime, location, suggestionsCount, aiNeededCount, cacheHit } = params;
    
    if (location === 'client') {
      this.metrics.retextMetrics.clientProcessingTime.push(processingTime);
      if (this.metrics.retextMetrics.clientProcessingTime.length > this.metricsWindow) {
        this.metrics.retextMetrics.clientProcessingTime.shift();
      }
    } else {
      this.metrics.retextMetrics.serverProcessingTime.push(processingTime);
      if (this.metrics.retextMetrics.serverProcessingTime.length > this.metricsWindow) {
        this.metrics.retextMetrics.serverProcessingTime.shift();
      }
    }
    
    this.metrics.retextMetrics.suggestionsHandled += suggestionsCount;
    this.metrics.retextMetrics.suggestionsNeedingAI += aiNeededCount;
    
    // Update cache hit rate
    const alpha = 0.1;
    const hit = cacheHit ? 1 : 0;
    this.metrics.retextMetrics.cacheHitRate = 
      alpha * hit + (1 - alpha) * this.metrics.retextMetrics.cacheHitRate;
  }
  
  // Get current metrics
  getMetrics(): AIPerformanceMetrics & {
    avgLatency: number;
    acceptanceRate: number;
    avgRetextClientTime: number;
    avgRetextServerTime: number;
    retextVsAIRatio: number;
  } {
    const avgLatency = this.metrics.apiLatency.length > 0
      ? this.metrics.apiLatency.reduce((a, b) => a + b, 0) / this.metrics.apiLatency.length
      : 0;
    
    const totalFeedback = 
      this.metrics.enhancementQuality.accepted +
      this.metrics.enhancementQuality.rejected +
      this.metrics.enhancementQuality.modified;
    
    const acceptanceRate = totalFeedback > 0
      ? this.metrics.enhancementQuality.accepted / totalFeedback
      : 0;
    
    const avgRetextClientTime = this.metrics.retextMetrics.clientProcessingTime.length > 0
      ? this.metrics.retextMetrics.clientProcessingTime.reduce((a, b) => a + b, 0) / 
        this.metrics.retextMetrics.clientProcessingTime.length
      : 0;
    
    const avgRetextServerTime = this.metrics.retextMetrics.serverProcessingTime.length > 0
      ? this.metrics.retextMetrics.serverProcessingTime.reduce((a, b) => a + b, 0) / 
        this.metrics.retextMetrics.serverProcessingTime.length
      : 0;
    
    const retextVsAIRatio = this.metrics.retextMetrics.suggestionsHandled > 0
      ? (this.metrics.retextMetrics.suggestionsHandled - this.metrics.retextMetrics.suggestionsNeedingAI) / 
        this.metrics.retextMetrics.suggestionsHandled
      : 0;
    
    return {
      ...this.metrics,
      avgLatency,
      acceptanceRate,
      avgRetextClientTime,
      avgRetextServerTime,
      retextVsAIRatio
    };
  }
  
  // Reset metrics
  reset(): void {
    this.metrics = {
      apiLatency: [],
      cacheHitRate: 0,
      tokenUsage: { prompt: 0, completion: 0, total: 0, byModel: {} },
      costEstimate: 0,
      costByModel: {},
      enhancementQuality: { accepted: 0, rejected: 0, modified: 0 },
      errorRate: 0,
      errorsByType: {},
      finishReasons: {},
      retextMetrics: {
        clientProcessingTime: [],
        serverProcessingTime: [],
        cacheHitRate: 0,
        suggestionsHandled: 0,
        suggestionsNeedingAI: 0
      }
    };
  }
  
  // Export metrics for analytics
  exportMetrics(): string {
    const data = {
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics(),
      system: {
        cacheStats: new AdvancedAICache().getStats(),
        uptime: process.uptime()
      }
    };
    
    return JSON.stringify(data, null, 2);
  }
}

// Global instance
export const aiPerformanceMonitor = new AIPerformanceMonitor();
```

#### 4.2 Monitoring Dashboard Component
```typescript
// components/admin/AIMonitoringDashboard.tsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Activity, DollarSign, Zap, TrendingUp } from 'lucide-react';

export function AIMonitoringDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/admin/ai-metrics');
        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Update every 5s
    
    return () => clearInterval(interval);
  }, []);
  
  if (loading) return <div>Loading metrics...</div>;
  if (!metrics) return <div>Failed to load metrics</div>;
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Latency
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(metrics.avgLatency)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              API response time
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cache Hit Rate
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(metrics.cacheHitRate * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Requests served from cache
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Est. Cost Today
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics.costEstimate.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on token usage
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Acceptance Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(metrics.acceptanceRate * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              AI suggestions accepted
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Retext vs AI
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(metrics.retextVsAIRatio * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Handled by retext alone
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Latency Chart */}
      <Card>
        <CardHeader>
          <CardTitle>API Latency Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metrics.latencyHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="latency" 
                stroke="#8884d8" 
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Retext Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Retext Analysis Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={[
              ...metrics.retextMetrics.clientProcessingTime.map((time, i) => ({
                index: i,
                client: time,
                server: metrics.retextMetrics.serverProcessingTime[i] || null
              }))
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="index" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="client" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Client"
              />
              <Line 
                type="monotone" 
                dataKey="server" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Server"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Token Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Token Usage Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[
              { name: 'Prompt', tokens: metrics.tokenUsage.prompt },
              { name: 'Completion', tokens: metrics.tokenUsage.completion }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="tokens" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 5. Database Schema Updates

```sql
-- migrations/add_ai_preferences.sql
CREATE TABLE IF NOT EXISTS user_ai_preferences (
  user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{
    "enabled": true,
    "enhancementLevel": "balanced",
    "confidenceThreshold": 0.7,
    "categories": {
      "spelling": true,
      "grammar": true,
      "style": true,
      "seo": true
    },
    "costSaving": true,
    "shareCache": true
  }',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add AI metrics table for monitoring
CREATE TABLE IF NOT EXISTS ai_metrics (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  metrics JSONB NOT NULL,
  user_id TEXT REFERENCES user(id),
  document_id TEXT
);

CREATE INDEX idx_ai_metrics_timestamp ON ai_metrics(timestamp);
CREATE INDEX idx_ai_metrics_user ON ai_metrics(user_id);
```

## Testing Plan

### Performance Tests
```typescript
// tests/performance/ai-cache.test.ts
describe('AI Cache Performance', () => {
  it('should achieve > 80% hit rate for repeated content', () => {
    // Test cache hit rate
  });
  
  it('should handle 1000+ cache entries efficiently', () => {
    // Test cache scalability
  });
  
  it('should share cache across similar documents', () => {
    // Test cross-document caching
  });
});

// tests/performance/batch-optimization.test.ts
describe('Batch Optimization', () => {
  it('should reduce API calls by 50%+ through batching', () => {
    // Test batch efficiency
  });
  
  it('should respect token limits', () => {
    // Test token counting
  });
});
```

## Success Metrics

- [ ] Cache hit rate > 80% for typical usage (both retext and AI)
- [ ] API costs reduced by 70%+ through retext filtering and optimization
- [ ] Average API latency < 500ms for AI calls
- [ ] Client-side retext processing < 100ms for typical documents
- [ ] Retext handles 60%+ of suggestions without AI
- [ ] User preferences UI intuitive and responsive
- [ ] Monitoring dashboard tracks both retext and AI performance
- [ ] Memory usage stays under 100MB including retext caches
- [ ] Cross-document cache sharing working for both analysis types

## Dependencies

- [ ] LRU cache library installed
- [ ] tiktoken for token counting
- [ ] Database migrations for preferences
- [ ] Monitoring API endpoints created
- [ ] Admin access control implemented

## Implementation Order

1. **Day 1**: Advanced caching system with retext/AI separation
2. **Day 2**: Cost optimization with retext filtering and batching
3. **Day 3**: User preferences UI with retext settings
4. **Day 4**: Performance monitoring for both systems
5. **Day 5**: Integration testing and polish

## Notes

- Monitor memory usage closely with separate retext and AI caches
- Client-side retext performance is critical for user experience
- Consider rate limiting for admin monitoring endpoints
- Plan for cache warming strategies for both analysis types
- Document cost optimization through retext pre-filtering
- Track client vs server performance to optimize deployment
- Consider adding export functionality for metrics
- Ensure retext cache persistence across sessions 