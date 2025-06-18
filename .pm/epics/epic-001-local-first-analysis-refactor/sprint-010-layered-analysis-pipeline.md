# Sprint 010: Layered Analysis Pipeline

## Sprint Overview
**Duration**: 1.5 weeks  
**Priority**: P0 - Critical  
**Goal**: Build a flexible, performant analysis pipeline that supports multiple analysis layers with different performance characteristics

## Problem Statement
Current analysis system limitations:
- Monolithic analysis runs everything at once
- No way to prioritize fast vs slow checks
- Difficult to add new analyzers
- Not ready for AI integration
- Poor cancellation support

## Technical Design

### Core Architecture

#### 1. Analysis Layer Definition
```typescript
interface AnalysisLayer {
  name: string;                      // Unique identifier
  priority: number;                  // Execution order (lower = higher priority)
  debounceMs: number;               // Delay before execution
  concurrent: boolean;              // Can run in parallel with others
  requiredLayers?: string[];        // Dependencies on other layers
  
  // Analysis function
  analyze: (snapshot: DocumentSnapshot, context: AnalysisContext) => 
    Promise<SuggestionEvent[]> | Observable<SuggestionEvent[]>;
  
  // Configuration
  config: {
    maxRetries?: number;
    timeoutMs?: number;
    cacheResults?: boolean;
    cacheTTL?: number;
  };
  
  // Lifecycle hooks
  onStart?: () => void;
  onComplete?: (results: SuggestionEvent[]) => void;
  onError?: (error: Error) => void;
}

interface AnalysisContext {
  previousResults: Map<string, SuggestionEvent[]>;
  userPreferences: UserPreferences;
  documentMetadata: DocumentMetadata;
  abortSignal: AbortSignal;
}
```

#### 2. Pipeline Manager
```typescript
class AnalysisPipeline {
  private layers = new Map<string, AnalysisLayer>();
  private running = new Map<string, RunningAnalysis>();
  private resultCache = new LRUCache<string, CachedResult>();
  
  registerLayer(layer: AnalysisLayer) {
    this.validateLayer(layer);
    this.layers.set(layer.name, layer);
    this.sortLayersByPriority();
  }
  
  async runAnalysis(
    snapshot: DocumentSnapshot,
    options: AnalysisOptions = {}
  ): Promise<AnalysisResult> {
    const controller = new AbortController();
    const context = this.createContext(snapshot, controller.signal);
    
    // Cancel any running analysis
    this.cancelRunningAnalysis();
    
    // Group layers by execution strategy
    const groups = this.groupLayers(options);
    
    // Execute layer groups
    const results = new Map<string, SuggestionEvent[]>();
    
    for (const group of groups) {
      const groupResults = await this.executeGroup(
        group,
        snapshot,
        context,
        results
      );
      
      // Merge results
      groupResults.forEach((events, layerName) => {
        results.set(layerName, events);
      });
      
      // Check if cancelled
      if (controller.signal.aborted) break;
    }
    
    return {
      suggestions: this.flattenResults(results),
      metadata: this.extractMetadata(results),
      timing: this.getTimingInfo()
    };
  }
  
  private async executeGroup(
    layers: AnalysisLayer[],
    snapshot: DocumentSnapshot,
    context: AnalysisContext,
    previousResults: Map<string, SuggestionEvent[]>
  ): Promise<Map<string, SuggestionEvent[]>> {
    const canRunConcurrently = layers.every(l => l.concurrent);
    
    if (canRunConcurrently) {
      // Run in parallel
      const promises = layers.map(layer => 
        this.executeLayer(layer, snapshot, context)
      );
      
      const results = await Promise.allSettled(promises);
      return this.processResults(layers, results);
    } else {
      // Run sequentially
      const results = new Map<string, SuggestionEvent[]>();
      
      for (const layer of layers) {
        try {
          const events = await this.executeLayer(layer, snapshot, context);
          results.set(layer.name, events);
        } catch (error) {
          this.handleLayerError(layer, error);
        }
      }
      
      return results;
    }
  }
}
```

#### 3. Built-in Analysis Layers
```typescript
// Instant spelling check (0ms debounce)
const instantSpellingLayer: AnalysisLayer = {
  name: 'instant-spelling',
  priority: 1,
  debounceMs: 0,
  concurrent: true,
  
  analyze: async (snapshot, context) => {
    if (context.abortSignal.aborted) return [];
    
    const word = extractLastWord(snapshot);
    if (!word || word.length < 3) return [];
    
    return spellChecker.checkWord(word, snapshot);
  },
  
  config: {
    cacheResults: true,
    cacheTTL: 3600000 // 1 hour
  }
};

// Fast local analysis (400ms debounce)
const fastLocalLayer: AnalysisLayer = {
  name: 'fast-local',
  priority: 2,
  debounceMs: 400,
  concurrent: true,
  
  analyze: async (snapshot, context) => {
    const [spelling, grammar, style] = await Promise.all([
      spellChecker.checkDocument(snapshot),
      grammarChecker.analyze(snapshot),
      styleChecker.analyze(snapshot)
    ]);
    
    return [...spelling, ...grammar, ...style];
  },
  
  config: {
    timeoutMs: 5000,
    maxRetries: 2
  }
};

// Deep analysis (800ms debounce)
const deepAnalysisLayer: AnalysisLayer = {
  name: 'deep-analysis',
  priority: 3,
  debounceMs: 800,
  concurrent: false,
  
  analyze: async (snapshot, context) => {
    const { documentMetadata } = context;
    
    const [seo, readability] = await Promise.all([
      seoAnalyzer.analyze(snapshot, documentMetadata),
      readabilityAnalyzer.analyze(snapshot)
    ]);
    
    return [...seo, ...readability];
  },
  
  config: {
    cacheResults: true,
    cacheTTL: 300000 // 5 minutes
  }
};

// AI contextual analysis (1500ms debounce) - Future
const aiContextualLayer: AnalysisLayer = {
  name: 'ai-contextual',
  priority: 4,
  debounceMs: 1500,
  concurrent: false,
  requiredLayers: ['fast-local'], // Needs basic analysis first
  
  analyze: async (snapshot, context) => {
    if (!context.userPreferences.aiEnabled) return [];
    
    const previousErrors = context.previousResults.get('fast-local') || [];
    return aiService.analyzeContext(snapshot, previousErrors);
  },
  
  config: {
    timeoutMs: 10000,
    maxRetries: 1,
    cacheResults: true,
    cacheTTL: 600000 // 10 minutes
  }
};
```

## Implementation Tasks

### Phase 1: Core Pipeline (Days 1-3)
- [ ] Create `services/analysis/pipeline/` directory structure
- [ ] Implement `AnalysisLayer` interface and types
- [ ] Build `AnalysisPipeline` class with basic functionality
- [ ] Add layer validation and dependency resolution
- [ ] Create execution strategies (concurrent/sequential)

### Phase 2: Layer Implementation (Days 4-6)
- [ ] Refactor existing analyzers into layers
- [ ] Implement caching with LRU cache
- [ ] Add retry logic with exponential backoff
- [ ] Create abort/cancellation support
- [ ] Build timing and performance tracking

### Phase 3: Advanced Features (Days 7-9)
- [ ] Implement layer dependencies
- [ ] Add conditional layer execution
- [ ] Create dynamic layer registration
- [ ] Build result merging strategies
- [ ] Add progress reporting

### Phase 4: Integration & Testing (Days 10-11)
- [ ] Integrate with suggestion streams
- [ ] Update `useUnifiedAnalysis` hook
- [ ] Create comprehensive test suite
- [ ] Performance benchmarking
- [ ] Documentation and examples

## Performance Optimizations

### Smart Caching
```typescript
class LayerCache {
  private cache = new LRUCache<string, CachedResult>({
    max: 100,
    ttl: 1000 * 60 * 5, // 5 minutes default
    updateAgeOnGet: true
  });
  
  getCacheKey(layer: AnalysisLayer, snapshot: DocumentSnapshot): string {
    return `${layer.name}:${snapshot.checksum}:${snapshot.version}`;
  }
  
  async getOrCompute<T>(
    key: string,
    compute: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && !this.isStale(cached)) {
      return cached.value;
    }
    
    const value = await compute();
    this.cache.set(key, { value, timestamp: Date.now() }, { ttl });
    return value;
  }
}
```

### Progressive Results
```typescript
class ProgressiveAnalysisPipeline extends AnalysisPipeline {
  runProgressive(
    snapshot: DocumentSnapshot
  ): Observable<ProgressiveAnalysisResult> {
    return new Observable(observer => {
      const results = new Map<string, SuggestionEvent[]>();
      let completedLayers = 0;
      
      const updateProgress = (layerName: string, events: SuggestionEvent[]) => {
        results.set(layerName, events);
        completedLayers++;
        
        observer.next({
          suggestions: this.flattenResults(results),
          progress: completedLayers / this.layers.size,
          completedLayers: Array.from(results.keys()),
          isComplete: completedLayers === this.layers.size
        });
      };
      
      // Run analysis with progress updates
      this.runAnalysis(snapshot, { onLayerComplete: updateProgress })
        .then(() => observer.complete())
        .catch(err => observer.error(err));
    });
  }
}
```

## Testing Strategy

### Unit Tests
```typescript
describe('AnalysisPipeline', () => {
  it('should respect layer priorities', async () => {
    const pipeline = new AnalysisPipeline();
    const executionOrder: string[] = [];
    
    pipeline.registerLayer({
      name: 'low-priority',
      priority: 10,
      analyze: async () => {
        executionOrder.push('low');
        return [];
      }
    });
    
    pipeline.registerLayer({
      name: 'high-priority',
      priority: 1,
      analyze: async () => {
        executionOrder.push('high');
        return [];
      }
    });
    
    await pipeline.runAnalysis(mockSnapshot);
    expect(executionOrder).toEqual(['high', 'low']);
  });
  
  it('should cancel running analysis', async () => {
    const pipeline = new AnalysisPipeline();
    let cancelled = false;
    
    pipeline.registerLayer({
      name: 'slow',
      analyze: async (_, context) => {
        await delay(1000);
        cancelled = context.abortSignal.aborted;
        return [];
      }
    });
    
    const promise = pipeline.runAnalysis(mockSnapshot);
    await delay(100);
    pipeline.cancelAnalysis();
    
    await promise;
    expect(cancelled).toBe(true);
  });
});
```

### Performance Tests
```typescript
describe('Pipeline Performance', () => {
  it('should cache results effectively', async () => {
    const pipeline = new AnalysisPipeline();
    let analyzeCount = 0;
    
    pipeline.registerLayer({
      name: 'cached',
      analyze: async () => {
        analyzeCount++;
        return generateMockSuggestions(100);
      },
      config: { cacheResults: true }
    });
    
    // First run
    const start1 = performance.now();
    await pipeline.runAnalysis(mockSnapshot);
    const time1 = performance.now() - start1;
    
    // Second run (should be cached)
    const start2 = performance.now();
    await pipeline.runAnalysis(mockSnapshot);
    const time2 = performance.now() - start2;
    
    expect(analyzeCount).toBe(1);
    expect(time2).toBeLessThan(time1 * 0.1); // 90% faster
  });
});
```

## Success Criteria
- [ ] All layers execute in priority order
- [ ] Proper cancellation of running analysis
- [ ] < 5ms overhead per layer
- [ ] 80%+ cache hit rate for repeated analysis
- [ ] Zero memory leaks

## Risks & Mitigations
- **Risk**: Complex dependency management
  - **Mitigation**: Topological sort, cycle detection
- **Risk**: Performance overhead
  - **Mitigation**: Aggressive caching, lazy evaluation
- **Risk**: Difficult debugging
  - **Mitigation**: Comprehensive logging, visualization tools

## Next Sprint Preview
Sprint 011 will focus on UI optimization including virtualization, progressive rendering, and smooth animations for the suggestion system. 