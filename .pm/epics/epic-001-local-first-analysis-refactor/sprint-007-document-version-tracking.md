# Sprint 007: Document Version Tracking & Snapshot Management

## Sprint Overview
**Duration**: 1 week  
**Priority**: P0 - Critical Foundation  
**Goal**: Implement robust document version tracking to enable position-independent suggestions

## Problem Statement
Current suggestions store absolute positions that become invalid when the document changes. We need a versioning system that:
- Tracks document changes with immutable snapshots
- Provides stable references for suggestion positions
- Enables validation of suggestion relevance
- Supports rollback and history tracking

## Technical Design

### Core Components

#### 1. Document Snapshot Interface
```typescript
interface DocumentSnapshot {
  id: string;                    // Unique snapshot ID
  version: number;               // Incremental version number
  content: JSONContent;          // TipTap document JSON
  plainText: string;             // Extracted plain text
  timestamp: number;             // Creation timestamp
  checksum: string;              // Content hash for validation
  metadata?: {
    wordCount: number;
    nodeCount: number;
    lastEditPosition?: number;
  };
}
```

#### 2. Document Version Manager
```typescript
class DocumentVersionManager {
  private currentVersion: number = 0;
  private snapshots: Map<number, DocumentSnapshot> = new Map();
  private maxSnapshots: number = 50; // Limit memory usage
  
  createSnapshot(doc: Node): DocumentSnapshot;
  getSnapshot(version: number): DocumentSnapshot | null;
  getLatestSnapshot(): DocumentSnapshot;
  pruneOldSnapshots(): void;
  calculateDiff(v1: number, v2: number): DocumentDiff;
}
```

#### 3. Change Tracking
```typescript
interface DocumentChange {
  fromVersion: number;
  toVersion: number;
  transaction: ProseMirrorTransaction;
  timestamp: number;
  changeType: 'insert' | 'delete' | 'format' | 'mixed';
  affectedRanges: Array<{start: number; end: number}>;
}
```

## Implementation Tasks

### Phase 1: Core Infrastructure (Days 1-2)
- [ ] Create `types/document-versioning.ts` with all interfaces
- [ ] Implement `DocumentVersionManager` class
- [ ] Add checksum calculation using crypto API
- [ ] Implement snapshot pruning with LRU strategy
- [ ] Create unit tests for version manager

### Phase 2: Editor Integration (Days 3-4)
- [ ] Integrate version manager into `BlogEditor.tsx`
- [ ] Hook into TipTap's transaction system
- [ ] Create snapshot on significant changes (not every keystroke)
- [ ] Add version info to editor state
- [ ] Update `useUnifiedAnalysis` to include version in requests

### Phase 3: Storage & Performance (Days 5-6)
- [ ] Implement IndexedDB storage for snapshots
- [ ] Add compression for stored snapshots
- [ ] Create background worker for snapshot management
- [ ] Add performance monitoring
- [ ] Implement snapshot diff algorithm

### Phase 4: Testing & Polish (Day 7)
- [ ] Comprehensive integration tests
- [ ] Performance benchmarking
- [ ] Memory usage optimization
- [ ] Documentation updates

## Success Criteria
- [ ] Document versions tracked accurately
- [ ] Snapshots created within 50ms
- [ ] Memory usage < 50MB for typical document
- [ ] Version history accessible for debugging
- [ ] No performance degradation in editor

## Technical Decisions

### Why Snapshots Over Operation Log?
- Simpler to implement and reason about
- Better for our use case (suggestions need full document context)
- Easier to validate suggestion positions
- Can always add operation log later

### Snapshot Creation Strategy
- Create on debounced pause (500ms after last edit)
- Create before running analysis
- Create on significant operations (paste, undo/redo)
- Limit to one snapshot per second maximum

### Memory Management
- Keep last 50 snapshots in memory
- Persist important snapshots to IndexedDB
- Use WeakMap for temporary references
- Implement aggressive pruning for large documents

## Dependencies
- None - this is foundational

## Risks & Mitigations
- **Risk**: Memory usage for large documents
  - **Mitigation**: Snapshot pruning, compression, IndexedDB offloading
- **Risk**: Performance impact on typing
  - **Mitigation**: Debounced snapshot creation, background processing
- **Risk**: Complexity for other developers
  - **Mitigation**: Clear API, comprehensive docs, helper utilities

## Next Sprint Preview
Sprint 008 will build on this foundation to implement position-independent suggestion events with multi-strategy position resolution. 