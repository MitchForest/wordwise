# Sprint 011: UI Performance Optimization

## Sprint Overview
**Duration**: 1 week  
**Priority**: P1 - High  
**Goal**: Optimize UI performance for smooth, responsive interaction even with hundreds of suggestions

## Problem Statement
Current UI performance issues:
- Rendering lag with many suggestions (>50)
- Janky animations when applying suggestions
- Full re-renders on minor state changes
- Memory usage grows with document size
- Poor scroll performance in suggestion panel

## Technical Design

### Core Optimizations

#### 1. Virtual Scrolling for Suggestions Panel
```typescript
interface VirtualizedSuggestionListProps {
  suggestions: ValidatedSuggestion[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // Extra items to render outside viewport
}

const VirtualizedSuggestionList: React.FC<VirtualizedSuggestionListProps> = ({
  suggestions,
  itemHeight,
  containerHeight,
  overscan = 3
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    suggestions.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  const visibleSuggestions = suggestions.slice(startIndex, endIndex);
  const totalHeight = suggestions.length * itemHeight;
  const offsetY = startIndex * itemHeight;
  
  return (
    <div 
      className="relative overflow-auto"
      style={{ height: containerHeight }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleSuggestions.map((suggestion, index) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              index={startIndex + index}
              style={{ height: itemHeight }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
```

#### 2. Memoized Components with Stable References
```typescript
// Memoized suggestion card
const SuggestionCard = React.memo<SuggestionCardProps>(({
  suggestion,
  onApply,
  onIgnore,
  isHovered,
  isFocused
}) => {
  // Use stable callbacks
  const handleApply = useCallback((action: SuggestionAction) => {
    onApply(suggestion.id, action);
  }, [suggestion.id, onApply]);
  
  const handleIgnore = useCallback(() => {
    onIgnore(suggestion.id);
  }, [suggestion.id, onIgnore]);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "suggestion-card",
        isHovered && "suggestion-card--hovered",
        isFocused && "suggestion-card--focused"
      )}
    >
      {/* Card content */}
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.suggestion.id === nextProps.suggestion.id &&
    prevProps.isHovered === nextProps.isHovered &&
    prevProps.isFocused === nextProps.isFocused &&
    prevProps.suggestion.position?.start === nextProps.suggestion.position?.start
  );
});
```

#### 3. Progressive Rendering Strategy
```typescript
class ProgressiveRenderer {
  private renderQueue: RenderTask[] = [];
  private isRendering = false;
  private frameDeadline = 16; // Target 60fps
  
  scheduleRender(tasks: RenderTask[]) {
    this.renderQueue.push(...tasks);
    if (!this.isRendering) {
      this.startRendering();
    }
  }
  
  private startRendering() {
    this.isRendering = true;
    requestIdleCallback(this.processQueue.bind(this), {
      timeout: 100
    });
  }
  
  private processQueue(deadline: IdleDeadline) {
    const startTime = performance.now();
    
    while (
      this.renderQueue.length > 0 &&
      (deadline.timeRemaining() > 0 || 
       performance.now() - startTime < this.frameDeadline)
    ) {
      const task = this.renderQueue.shift();
      if (task) {
        task.execute();
      }
    }
    
    if (this.renderQueue.length > 0) {
      requestIdleCallback(this.processQueue.bind(this));
    } else {
      this.isRendering = false;
    }
  }
}
```

#### 4. Optimized Animation System
```typescript
// Use CSS transforms for better performance
const AnimatedUnderline: React.FC<UnderlineProps> = ({ 
  position, 
  severity,
  isHovered 
}) => {
  const ref = useRef<HTMLDivElement>(null);
  
  useLayoutEffect(() => {
    if (!ref.current) return;
    
    // Use transform instead of left/width for better performance
    const transform = `translateX(${position.left}px) scaleX(${position.width})`;
    ref.current.style.transform = transform;
    
    // Use will-change for optimization hint
    ref.current.style.willChange = isHovered ? 'transform' : 'auto';
  }, [position, isHovered]);
  
  return (
    <div
      ref={ref}
      className={cn(
        "suggestion-underline",
        `suggestion-underline--${severity}`,
        isHovered && "suggestion-underline--hovered"
      )}
      style={{
        transformOrigin: 'left center',
        transition: 'transform 0.2s ease-out'
      }}
    />
  );
};
```

## Implementation Tasks

### Phase 1: Virtualization (Days 1-2)
- [ ] Implement virtual scrolling for suggestion panel
- [ ] Add dynamic height support for suggestion cards
- [ ] Create intersection observer for lazy loading
- [ ] Build keyboard navigation for virtual list
- [ ] Add smooth scroll restoration

### Phase 2: Component Optimization (Days 3-4)
- [ ] Memoize all suggestion-related components
- [ ] Implement stable callback references
- [ ] Add custom comparison functions
- [ ] Remove unnecessary re-renders
- [ ] Profile and fix render bottlenecks

### Phase 3: Animation Performance (Days 5-6)
- [ ] Convert to CSS transforms
- [ ] Implement FLIP animations
- [ ] Add will-change hints
- [ ] Use requestAnimationFrame for smooth updates
- [ ] Create animation queue system

### Phase 4: Progressive Enhancement (Day 7)
- [ ] Implement progressive rendering
- [ ] Add request idle callback usage
- [ ] Create render priority system
- [ ] Build performance monitoring
- [ ] Add user preference detection

## Performance Patterns

### Debounced State Updates
```typescript
const useDebouncedState = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};

// Usage in suggestion panel
const EnhancedSuggestionsPanel = () => {
  const { suggestions } = useSuggestions();
  const debouncedSuggestions = useDebouncedState(suggestions, 100);
  
  return <VirtualizedSuggestionList suggestions={debouncedSuggestions} />;
};
```

### Batch DOM Updates
```typescript
class BatchedDOMUpdater {
  private updates: Map<string, () => void> = new Map();
  private scheduled = false;
  
  scheduleUpdate(key: string, update: () => void) {
    this.updates.set(key, update);
    
    if (!this.scheduled) {
      this.scheduled = true;
      requestAnimationFrame(() => {
        this.flush();
      });
    }
  }
  
  private flush() {
    const updates = Array.from(this.updates.values());
    this.updates.clear();
    this.scheduled = false;
    
    // Batch all DOM updates
    updates.forEach(update => update());
  }
}
```

### Memory Management
```typescript
const useCleanupOnUnmount = (cleanup: () => void) => {
  const cleanupRef = useRef(cleanup);
  cleanupRef.current = cleanup;
  
  useEffect(() => {
    return () => {
      cleanupRef.current();
    };
  }, []);
};

// Usage
const SuggestionManager = () => {
  const subscriptions = useRef<Subscription[]>([]);
  
  useCleanupOnUnmount(() => {
    // Clean up all subscriptions
    subscriptions.current.forEach(sub => sub.unsubscribe());
    
    // Clear any cached data
    suggestionCache.clear();
    
    // Cancel any pending animations
    animationQueue.cancelAll();
  });
};
```

## Testing Strategy

### Performance Benchmarks
```typescript
describe('UI Performance', () => {
  it('should render 1000 suggestions without lag', async () => {
    const suggestions = generateMockSuggestions(1000);
    
    const start = performance.now();
    const { container } = render(
      <VirtualizedSuggestionList suggestions={suggestions} />
    );
    const renderTime = performance.now() - start;
    
    expect(renderTime).toBeLessThan(100); // Should render in < 100ms
    expect(container.querySelectorAll('.suggestion-card')).toHaveLength(
      expect.lessThan(50) // Should only render visible items
    );
  });
  
  it('should maintain 60fps during scroll', async () => {
    const { container } = render(<SuggestionPanel />);
    const scrollContainer = container.querySelector('.scroll-container');
    
    const fps = await measureScrollPerformance(scrollContainer, {
      distance: 5000,
      duration: 2000
    });
    
    expect(fps.average).toBeGreaterThan(55);
    expect(fps.minimum).toBeGreaterThan(30);
  });
});
```

### Memory Leak Tests
```typescript
it('should not leak memory on unmount', async () => {
  const initialMemory = performance.memory.usedJSHeapSize;
  
  // Mount and unmount component multiple times
  for (let i = 0; i < 10; i++) {
    const { unmount } = render(<SuggestionSystem />);
    await delay(100);
    unmount();
  }
  
  // Force garbage collection
  global.gc();
  await delay(100);
  
  const finalMemory = performance.memory.usedJSHeapSize;
  const memoryIncrease = finalMemory - initialMemory;
  
  expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB increase
});
```

## Success Criteria
- [ ] Smooth 60fps scrolling with 500+ suggestions
- [ ] < 100ms initial render time
- [ ] < 16ms per frame during animations
- [ ] < 50MB memory usage for large documents
- [ ] No janky animations

## Browser Optimizations

### CSS Containment
```css
.suggestion-panel {
  contain: layout style paint;
  will-change: scroll-position;
}

.suggestion-card {
  contain: layout style;
  content-visibility: auto;
  contain-intrinsic-size: 0 120px;
}
```

### GPU Acceleration
```css
.suggestion-underline {
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}

.animated-element {
  will-change: transform, opacity;
  transform: translate3d(0, 0, 0);
}
```

## Risks & Mitigations
- **Risk**: Browser compatibility issues
  - **Mitigation**: Progressive enhancement, feature detection
- **Risk**: Complex debugging
  - **Mitigation**: Performance profiling tools, detailed logs
- **Risk**: Over-optimization
  - **Mitigation**: Measure first, optimize based on data

## Next Sprint Preview
Sprint 012 will implement the migration strategy from the current system to the new event-sourced architecture. 