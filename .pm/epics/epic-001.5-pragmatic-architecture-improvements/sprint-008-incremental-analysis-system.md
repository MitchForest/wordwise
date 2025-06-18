# Sprint 008: Incremental Analysis System

**Status:** Planning
**Epic:** 001.5 - Pragmatic Architecture Improvements
**Date Started:** TBD
**Date Completed:** TBD

## Feature Requirements
Implement incremental analysis that only processes changed content for a 10x performance improvement. Instead of analyzing the entire document on every change, track modifications by paragraph and only re-analyze affected ranges. Include smart caching to reuse results for unchanged content and create a clean analyzer pipeline ready for AI integration.

## Tasks
- [ ] Implement document change detection by paragraph
- [ ] Create DocumentSnapshot interface for tracking state
- [ ] Build paragraph-level diff algorithm
- [ ] Identify affected ranges for re-analysis
- [ ] Implement smart caching layer with paragraph hashing
- [ ] Add cache invalidation for affected entries
- [ ] Create predictive caching for next paragraph
- [ ] Build analyzer pipeline with registration system
- [ ] Implement priority-based execution
- [ ] Add cancellation for in-flight requests
- [ ] Create performance monitoring metrics
- [ ] Write tests for incremental analysis scenarios
- [ ] Document the new analysis flow

## Technical Plan

### 1. Change Detection System
```typescript
interface DocumentSnapshot {
  content: string;
  paragraphs: Array<{
    id: string; // Hash of content
    text: string;
    startOffset: number;
    endOffset: number;
  }>;
  timestamp: number;
}

interface ChangeRange {
  start: number;
  end: number;
  affectedParagraphs: string[];
}
```

### 2. Incremental Analysis Engine
```typescript
interface AnalysisEngine {
  analyzeChanges(
    previousDoc: DocumentSnapshot,
    currentDoc: DocumentSnapshot,
    changedRanges: ChangeRange[]
  ): {
    remove: string[], // Suggestion IDs to remove
    add: TextBasedSuggestion[], // New suggestions
    moved: Array<{ id: string, newPosition: Position }>
  }
}
```

### 3. Smart Caching Layer
- Cache key: paragraph hash + analyzer name
- LRU eviction policy with 10MB limit
- Predictive loading of adjacent paragraphs
- Batch cache operations for efficiency

### 4. Analyzer Pipeline
```typescript
interface Analyzer {
  name: string;
  type: 'local' | 'remote';
  priority: number;
  debounce: number;
  analyze: (text: string, context?: any) => Suggestion[];
}
```

## Files to Modify
- `services/analysis/engine.ts` - Core incremental analysis logic
- `services/analysis/cache.ts` - Implement smart caching layer
- `types/analysis.ts` - Add new interfaces
- `lib/editor/document-snapshot.ts` - Create snapshot utilities
- `hooks/useUnifiedAnalysis.ts` - Update to use incremental analysis
- `services/analysis/index.ts` - Create analyzer pipeline
- `utils/paragraph-differ.ts` - Implement paragraph diffing

## Decisions & Notes
- Paragraph-based chunking provides good granularity balance
- Using content hash for cache keys ensures consistency
- Priority system allows critical analyzers to run first
- Cancellation prevents wasted work on rapid edits

## Session Summary
**Completed:**
- [To be filled during implementation]

**Remaining:**
- [To be filled during implementation]

**Files Changed:**
- [To be filled during implementation] 