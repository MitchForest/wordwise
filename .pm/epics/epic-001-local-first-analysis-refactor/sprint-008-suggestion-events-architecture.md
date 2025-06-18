# Sprint 008: Suggestion Events Architecture

## Sprint Overview
**Duration**: 1.5 weeks  
**Priority**: P0 - Critical  
**Goal**: Transform suggestions from mutable position-based objects to immutable events with intelligent position resolution

## Problem Statement
Current suggestions become invalid when their absolute positions change. We need:
- Immutable suggestion events tied to document versions
- Multiple strategies for position resolution
- Graceful handling of stale suggestions
- Foundation for AI-enhanced suggestions

## Technical Design

### Core Components

#### 1. Suggestion Event Model
```typescript
interface SuggestionEvent {
  // Identity
  id: string;                    // Unique event ID
  documentVersion: number;       // Version this applies to
  documentChecksum: string;      // For validation
  
  // Multi-strategy position tracking
  position: {
    absolute: {
      start: number;
      end: number;
    };
    relative: {
      nodeId: string;          // Stable node identifier
      nodeType: string;        // paragraph, heading, etc.
      nodeIndex: number;       // Index within parent
      offset: number;          // Offset within node
      length: number;
    };
    textAnchor: {
      before: string;          // 20 chars before
      target: string;          // The problematic text
      after: string;           // 20 chars after
      checksum: string;        // Hash of surrounding context
    };
  };
  
  // Suggestion details
  rule: {
    id: string;               // e.g., "spelling/misspelling"
    category: SuggestionCategory;
    subCategory: string;
    engine: 'local' | 'ai' | 'hybrid';
  };
  
  severity: 'error' | 'warning' | 'suggestion' | 'enhancement';
  title: string;
  message: string;
  
  // Actions (can be async/lazy)
  actions: SuggestionAction[] | (() => Promise<SuggestionAction[]>);
  
  // Metadata
  metadata: {
    createdAt: number;
    expiresAt?: number;
    confidence?: number;
    aiModel?: string;
    processingTime?: number;
    source?: string;          // Which analyzer created this
  };
}
```

#### 2. Position Resolution System
```typescript
class PositionResolver {
  constructor(
    private fuzzyMatcher: FuzzyTextMatcher,
    private nodeTracker: NodeTracker
  ) {}
  
  resolvePosition(
    event: SuggestionEvent,
    currentDoc: Node,
    currentVersion: number
  ): ResolvedPosition | null {
    // Try strategies in order of reliability
    const strategies = [
      this.resolveByVersion,
      this.resolveByNodeId,
      this.resolveByTextAnchor,
      this.resolveByFuzzyMatch
    ];
    
    for (const strategy of strategies) {
      const result = strategy(event, currentDoc, currentVersion);
      if (result && this.validateResult(result, event)) {
        return result;
      }
    }
    
    return null; // Suggestion is stale
  }
}
```

#### 3. Node Tracking System
```typescript
class NodeTracker {
  private nodeMap: WeakMap<Node, NodeMetadata> = new WeakMap();
  
  assignNodeIds(doc: Node): void {
    doc.descendants((node, pos) => {
      if (!this.nodeMap.has(node)) {
        this.nodeMap.set(node, {
          id: this.generateStableId(node, pos),
          type: node.type.name,
          created: Date.now()
        });
      }
    });
  }
  
  private generateStableId(node: Node, pos: number): string {
    // Use content hash + position for stability
    const contentHash = this.hashNodeContent(node);
    return `${node.type.name}-${contentHash}-${pos}`;
  }
}
```

## Implementation Tasks

### Phase 1: Event Model & Types (Days 1-3)
- [ ] Create `types/suggestion-events.ts` with all interfaces
- [ ] Implement `SuggestionEvent` factory functions
- [ ] Create position strategy types
- [ ] Add validation utilities
- [ ] Write comprehensive type tests

### Phase 2: Position Resolution (Days 4-6)
- [ ] Implement `PositionResolver` class
- [ ] Create `FuzzyTextMatcher` with edit distance algorithm
- [ ] Implement `NodeTracker` for stable node IDs
- [ ] Add position validation logic
- [ ] Create resolution strategy tests

### Phase 3: Event Conversion (Days 7-8)
- [ ] Create adapters for existing suggestion format
- [ ] Update all analyzers to emit events
- [ ] Implement lazy action loading
- [ ] Add event validation middleware
- [ ] Migration utilities for existing suggestions

### Phase 4: Integration (Days 9-10)
- [ ] Update `SuggestionContext` to handle events
- [ ] Modify UI components for event-based suggestions
- [ ] Add position resolution to rendering pipeline
- [ ] Implement stale suggestion filtering
- [ ] Performance optimization

## Technical Decisions

### Why Multiple Position Strategies?
- **Version match**: Fast path for recent suggestions
- **Node ID**: Survives minor edits within nodes
- **Text anchor**: Handles node restructuring
- **Fuzzy match**: Last resort for major changes

### Event Immutability Benefits
- Easier debugging (event history)
- Better caching possibilities
- Simpler state management
- Natural audit trail

### Lazy Action Loading
- Reduces initial payload size
- Enables AI enhancement on-demand
- Better performance for large documents
- Progressive enhancement pattern

## Success Criteria
- [ ] Zero position errors in production
- [ ] 95%+ position resolution success rate
- [ ] < 10ms position resolution time
- [ ] Graceful handling of stale suggestions
- [ ] Backward compatibility maintained

## API Examples

### Creating a Suggestion Event
```typescript
const event = createSuggestionEvent({
  doc: currentDoc,
  version: docVersion,
  position: { start: 10, end: 15 },
  rule: {
    id: 'spelling/misspelling',
    category: 'spelling',
    engine: 'local'
  },
  severity: 'error',
  message: 'Possible spelling mistake',
  actions: [
    { type: 'fix', value: 'correct', label: 'correct' }
  ]
});
```

### Resolving Position
```typescript
const resolved = positionResolver.resolvePosition(
  event,
  currentDoc,
  currentVersion
);

if (resolved) {
  // Apply decoration at resolved.start to resolved.end
} else {
  // Suggestion is stale, filter it out
}
```

## Risks & Mitigations
- **Risk**: Complex position resolution logic
  - **Mitigation**: Extensive testing, clear strategy priority
- **Risk**: Performance with many suggestions
  - **Mitigation**: Caching, batch resolution, virtualization
- **Risk**: Migration complexity
  - **Mitigation**: Adapter pattern, gradual rollout

## Next Sprint Preview
Sprint 009 will implement the reactive suggestion stream using RxJS for efficient state management and UI updates. 