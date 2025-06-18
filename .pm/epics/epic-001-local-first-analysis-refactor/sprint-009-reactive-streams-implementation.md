# Sprint 009: Reactive Streams Implementation

## Sprint Overview
**Duration**: 1 week  
**Priority**: P0 - Critical  
**Goal**: Implement RxJS-based reactive streams for efficient suggestion state management and UI updates

## Problem Statement
Current suggestion management causes:
- Unnecessary re-renders when suggestions don't actually change
- Race conditions between different analysis tiers
- Difficult state synchronization
- Poor performance with many suggestions

## Technical Design

### Core Components

#### 1. Suggestion Stream Architecture
```typescript
class SuggestionStream {
  // Core streams
  private events$ = new BehaviorSubject<SuggestionEvent[]>([]);
  private documentVersion$ = new BehaviorSubject<number>(0);
  private documentContent$ = new BehaviorSubject<Node | null>(null);
  
  // Derived streams
  public validSuggestions$: Observable<ValidatedSuggestion[]>;
  public suggestionsByCategory$: Observable<Map<string, ValidatedSuggestion[]>>;
  public metrics$: Observable<DocumentMetrics>;
  public hasChanges$: Observable<boolean>;
  
  constructor(
    private positionResolver: PositionResolver,
    private metricsCalculator: MetricsCalculator
  ) {
    this.setupStreams();
  }
  
  private setupStreams() {
    // Valid suggestions with resolved positions
    this.validSuggestions$ = combineLatest([
      this.events$,
      this.documentVersion$,
      this.documentContent$
    ]).pipe(
      debounceTime(50), // Batch rapid updates
      map(([events, version, doc]) => this.validateAndResolve(events, version, doc)),
      distinctUntilChanged(this.suggestionsEqual),
      shareReplay(1)
    );
    
    // Grouped by category for filtering
    this.suggestionsByCategory$ = this.validSuggestions$.pipe(
      map(suggestions => this.groupByCategory(suggestions)),
      shareReplay(1)
    );
    
    // Real-time metrics
    this.metrics$ = combineLatest([
      this.validSuggestions$,
      this.documentContent$
    ]).pipe(
      map(([suggestions, doc]) => this.calculateMetrics(suggestions, doc)),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      shareReplay(1)
    );
  }
}
```

#### 2. Optimistic Updates Manager
```typescript
class OptimisticUpdateManager {
  private pendingRemovals$ = new BehaviorSubject<Set<string>>(new Set());
  private pendingApplications$ = new BehaviorSubject<Map<string, PendingApplication>>(new Map());
  
  // Stream of IDs to hide optimistically
  public hiddenIds$: Observable<Set<string>> = this.pendingRemovals$.asObservable();
  
  // Apply suggestion optimistically
  applySuggestion(id: string, action: SuggestionAction): Observable<ApplicationResult> {
    return new Observable(observer => {
      // Immediately hide
      this.addPendingRemoval(id);
      
      // Track application
      const application = {
        id: generateId(),
        suggestionId: id,
        action,
        timestamp: Date.now()
      };
      
      this.addPendingApplication(application);
      
      // Wait for confirmation
      const confirmSub = this.waitForConfirmation(id).subscribe({
        next: (confirmed) => {
          if (confirmed) {
            observer.next({ success: true, id });
            this.removePending(id);
          } else {
            observer.next({ success: false, id, rollback: true });
            this.offerRollback(application);
          }
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
      
      return () => confirmSub.unsubscribe();
    });
  }
}
```

#### 3. Analysis Pipeline Stream
```typescript
class AnalysisPipelineStream {
  private analysisResults$ = new Subject<AnalysisResult>();
  private cancelSignals$ = new Subject<string>();
  
  constructor(
    private layers: AnalysisLayer[],
    private documentVersion$: Observable<number>
  ) {}
  
  analyze(snapshot: DocumentSnapshot): Observable<SuggestionEvent[]> {
    return new Observable(observer => {
      const subscriptions: Subscription[] = [];
      
      // Run each layer with its own timing
      this.layers.forEach(layer => {
        const sub = of(snapshot).pipe(
          delay(layer.debounceMs),
          takeUntil(this.cancelSignals$.pipe(
            filter(signal => signal === layer.name || signal === 'all')
          )),
          switchMap(snap => from(layer.analyze(snap))),
          tap(events => {
            observer.next(events);
          }),
          catchError(error => {
            console.error(`Layer ${layer.name} failed:`, error);
            return EMPTY;
          })
        ).subscribe();
        
        subscriptions.push(sub);
      });
      
      return () => {
        subscriptions.forEach(s => s.unsubscribe());
      };
    });
  }
  
  cancelAnalysis(layerName?: string) {
    this.cancelSignals$.next(layerName || 'all');
  }
}
```

## Implementation Tasks

### Phase 1: Core Stream Setup (Days 1-2)
- [ ] Add RxJS to dependencies
- [ ] Create `services/streams/suggestion-stream.ts`
- [ ] Implement basic stream architecture
- [ ] Add stream operators and utilities
- [ ] Create stream debugging tools

### Phase 2: Integration (Days 3-4)
- [ ] Replace `SuggestionContext` internals with streams
- [ ] Update `useUnifiedAnalysis` to use streams
- [ ] Convert UI components to stream consumers
- [ ] Add proper cleanup/unsubscribe logic
- [ ] Implement hot module reload support

### Phase 3: Optimistic Updates (Days 5-6)
- [ ] Implement `OptimisticUpdateManager`
- [ ] Add rollback functionality
- [ ] Create confirmation timeout logic
- [ ] Add optimistic UI indicators
- [ ] Test with various network conditions

### Phase 4: Performance & Polish (Day 7)
- [ ] Add stream performance monitoring
- [ ] Implement backpressure handling
- [ ] Create memory leak prevention
- [ ] Add comprehensive logging
- [ ] Performance benchmarking

## Stream Patterns

### Debouncing with Accumulation
```typescript
// Accumulate rapid changes before processing
const debouncedSuggestions$ = suggestionUpdates$.pipe(
  scan((acc, update) => this.mergeUpdates(acc, update), []),
  debounceTime(100),
  distinctUntilChanged()
);
```

### Cancellable Analysis
```typescript
// Cancel previous analysis when new one starts
const analysis$ = documentChanges$.pipe(
  switchMap(change => 
    this.runAnalysis(change).pipe(
      takeUntil(documentChanges$)
    )
  )
);
```

### Error Recovery
```typescript
// Retry with exponential backoff
const resilientStream$ = source$.pipe(
  retryWhen(errors => errors.pipe(
    scan((acc, error) => acc + 1, 0),
    delay(retryCount => Math.min(1000 * Math.pow(2, retryCount), 30000))
  ))
);
```

## Success Criteria
- [ ] 50% reduction in unnecessary re-renders
- [ ] Zero race conditions in analysis
- [ ] < 16ms UI update time (60fps)
- [ ] Proper memory cleanup (no leaks)
- [ ] Smooth optimistic updates

## Performance Optimizations

### Virtual Scrolling for Suggestions
```typescript
const virtualizedSuggestions$ = suggestions$.pipe(
  map(suggestions => ({
    total: suggestions.length,
    visible: suggestions.slice(startIndex, endIndex),
    startIndex,
    endIndex
  })),
  distinctUntilChanged((a, b) => 
    a.startIndex === b.startIndex && 
    a.endIndex === b.endIndex &&
    a.total === b.total
  )
);
```

### Memoized Selectors
```typescript
const createCategorySelector = memoize((category: string) =>
  suggestions$.pipe(
    map(suggestions => suggestions.filter(s => s.category === category)),
    distinctUntilChanged()
  )
);
```

## Testing Strategy

### Stream Testing
```typescript
it('should debounce rapid updates', marbles(m => {
  const input =    m.hot('--a-b-c-d-e-|');
  const expected = m.cold('-------c---e-|');
  
  const result = input.pipe(debounceTime(50, m.scheduler));
  m.expect(result).toBeObservable(expected);
}));
```

### Integration Testing
```typescript
it('should handle optimistic updates', async () => {
  const stream = new SuggestionStream();
  const results = [];
  
  stream.validSuggestions$.subscribe(s => results.push(s));
  
  // Apply suggestion optimistically
  await stream.applySuggestion('test-id', { type: 'fix', value: 'fixed' });
  
  expect(results[results.length - 1]).not.toContainEqual(
    expect.objectContaining({ id: 'test-id' })
  );
});
```

## Risks & Mitigations
- **Risk**: RxJS learning curve for team
  - **Mitigation**: Comprehensive docs, helper functions, training
- **Risk**: Memory leaks from subscriptions
  - **Mitigation**: Strict unsubscribe patterns, automated testing
- **Risk**: Complex debugging
  - **Mitigation**: Stream visualization tools, extensive logging

## Next Sprint Preview
Sprint 010 will implement the layered analysis pipeline with support for both local and AI-powered analyzers. 