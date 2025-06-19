# Sprint 001.5: AI Enhancement Improvements & Bug Fixes

**Epic**: 002 - AI-Enhanced Suggestions  
**Duration**: 2 days  
**Status**: Planning  
**Priority**: High (Critical bug fixes)

## Sprint Goal
Fix critical bugs in the AI enhancement system and improve user experience based on initial feedback. Focus on performance, selective enhancement, and better UI controls.

## Critical Issues to Fix

### 1. Document-wide SEO Suggestions Error
**Problem**: SEO suggestions created with `createDocumentSuggestion` have no position, causing "No position found" errors when trying to apply fixes.
**Impact**: Users cannot interact with SEO suggestions properly.

### 2. AI Enhancements Lost on Refresh
**Problem**: Enhanced suggestions are only stored in component state and disappear on page refresh.
**Impact**: Poor user experience, wasted API calls.

### 3. Performance & UX Issues
- 2-second delay feels too slow
- AI enhances suggestions that already have good fixes
- No bulk actions (Apply All/Ignore All)
- Processing all suggestions at once causes UI lag

## Implementation Plan

### Day 1: Critical Bug Fixes & Core Improvements

#### Morning (4 hours):

**1. Fix Document-wide Suggestion Handling**
```typescript
// components/editor/BlogEditor.tsx - Update apply function
registerEditorActions({
  apply: (suggestionId: string, value: string) => {
    console.log('[Apply Fix] Starting:', { suggestionId, value });
    
    // Special handling for document-wide suggestions
    if (suggestionId.endsWith('-global')) {
      console.log('[Apply Fix] Document-wide suggestion - no position needed');
      
      // Handle based on suggestion type
      if (suggestionId.includes('seo')) {
        // Open SEO modal for SEO-related suggestions
        setIsSEOModalOpen(true);
        toast.info('Please update your SEO settings');
      } else {
        // Show toast for other document-wide suggestions
        toast.info(value || 'Please review this document-wide suggestion');
      }
      return;
    }
    
    // Existing position-based logic...
  }
});
```

**2. Add Selective Enhancement Logic**
```typescript
// services/ai/enhancement-service.ts
export class AIEnhancementService {
  /**
   * @purpose Determine if a suggestion needs AI enhancement
   * @param suggestion - The suggestion to evaluate
   * @returns true if enhancement would be beneficial
   */
  private shouldEnhance(suggestion: UnifiedSuggestion): boolean {
    // Skip if already enhanced
    if ('aiEnhanced' in suggestion && suggestion.aiEnhanced) {
      return false;
    }
    
    // Document-wide suggestions don't need enhancement
    if (suggestion.id.endsWith('-global')) {
      return false;
    }
    
    // Style suggestions often lack fixes - always enhance
    if (suggestion.category === 'style') {
      return true;
    }
    
    // Enhance if no fix available
    if (!suggestion.actions || suggestion.actions.length === 0) {
      return true;
    }
    
    // Enhance spelling for context (their/there/they're)
    if (suggestion.category === 'spelling' && suggestion.matchText) {
      const contextualWords = ['their', 'there', 'theyre', 'its', 'your', 'youre'];
      if (contextualWords.some(word => suggestion.matchText.toLowerCase().includes(word))) {
        return true;
      }
    }
    
    // Skip grammar suggestions that already have clear fixes
    if (suggestion.category === 'grammar' && suggestion.actions.length > 0) {
      return false;
    }
    
    return false;
  }
  
  async enhanceAllSuggestions(
    suggestions: UnifiedSuggestion[],
    documentContext: DocumentContext
  ): Promise<EnhancedSuggestion[]> {
    // Filter suggestions that need enhancement
    const toEnhance = suggestions.filter(s => this.shouldEnhance(s));
    const noEnhancement = suggestions.filter(s => !this.shouldEnhance(s));
    
    console.log('[AI Enhancement] Selective enhancement:', {
      total: suggestions.length,
      toEnhance: toEnhance.length,
      skipping: noEnhancement.length
    });
    
    if (toEnhance.length === 0) {
      // Return all suggestions unchanged
      return suggestions.map(s => ({ ...s, aiEnhanced: false } as EnhancedSuggestion));
    }
    
    // Only enhance suggestions that need it
    const enhanced = await this.batchEnhance(toEnhance, documentContext);
    
    // Combine enhanced and non-enhanced suggestions
    const enhancedMap = new Map(enhanced.map(s => [s.id, s]));
    
    return suggestions.map(s => {
      const enhancedVersion = enhancedMap.get(s.id);
      return enhancedVersion || { ...s, aiEnhanced: false } as EnhancedSuggestion;
    });
  }
}
```

**3. Reduce Enhancement Delay**
```typescript
// hooks/useUnifiedAnalysis.ts
const AI_ENHANCEMENT_DELAY = 1000; // Reduced from 2000ms to 1000ms

// Also add immediate trigger on sentence completion
useEffect(() => {
  if (!editor) return;

  const handleUpdate = () => {
    const content = editor.getJSON();
    const plainText = editor.getText();
    handleContentChange(content, plainText);

    // Real-time spell check logic
    const { from, empty } = editor.state.selection;
    if (empty && from > 1) {
      const textBefore = editor.state.doc.textBetween(0, from, "\n", " ");
      const lastChar = textBefore.slice(-1);
      
      if (/\s/.test(lastChar)) { // Fired on space
        const lastWord = textBefore.trim().split(/\s+/).pop();
        if (lastWord && lastWord.length > 2) {
          runRealtimeSpellCheck(lastWord, editor.state.doc);
        }
      } else if (/[.!?]/.test(lastChar)) { // Fired on sentence end
        // Trigger fast analysis for the whole document
        debouncedFastAnalysis(editor.state.doc);
        
        // IMMEDIATE AI enhancement on sentence completion
        if (suggestions.length > 0) {
          console.log('[AI Enhancement] Triggering on sentence completion');
          debouncedAIEnhancement.flush(); // Execute immediately
        }
      }
    }
  };

  editor.on('update', handleUpdate);
  return () => {
    editor.off('update', handleUpdate);
  };
}, [editor, handleContentChange, runRealtimeSpellCheck, debouncedFastAnalysis, suggestions]);
```

#### Afternoon (4 hours):

**4. Add Apply All / Ignore All Buttons**
```typescript
// components/panels/EnhancedSuggestionsPanel.tsx
export const EnhancedSuggestionsPanel = () => {
  // ... existing code ...
  
  const handleApplyAll = () => {
    const applyableSuggestions = visibleSuggestions.filter(s => 
      !s.id.endsWith('-global') && (s.actions[0]?.value || s.aiFix)
    );
    
    if (applyableSuggestions.length === 0) {
      toast.info('No suggestions with fixes to apply');
      return;
    }
    
    // Apply in reverse order to maintain positions
    const sortedSuggestions = [...applyableSuggestions].sort((a, b) => {
      const posA = a.originalFrom ?? 0;
      const posB = b.originalFrom ?? 0;
      return posB - posA; // Reverse order
    });
    
    let appliedCount = 0;
    sortedSuggestions.forEach(suggestion => {
      const fix = suggestion.aiFix || suggestion.actions[0]?.value;
      if (fix) {
        applySuggestion(suggestion.id, fix);
        appliedCount++;
      }
    });
    
    toast.success(`Applied ${appliedCount} suggestions`);
  };
  
  const handleIgnoreAll = () => {
    const count = visibleSuggestions.length;
    visibleSuggestions.forEach(s => ignoreSuggestion(s.id));
    toast.success(`Ignored ${count} suggestions`);
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">
          Suggestions {visibleSuggestions.length > 0 && (
            <span className="text-sm text-muted-foreground ml-2">
              ({visibleSuggestions.length})
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {visibleSuggestions.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleApplyAll}
                className="text-green-600 hover:text-green-700"
              >
                <Check className="w-4 h-4 mr-1" />
                Apply All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleIgnoreAll}
                className="text-orange-600 hover:text-orange-700"
              >
                <X className="w-4 h-4 mr-1" />
                Ignore All
              </Button>
              <div className="w-px h-6 bg-border mx-1" />
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FilterIcon className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            {/* ... existing filter menu ... */}
          </DropdownMenu>
        </div>
      </div>
      {/* ... rest of component ... */}
    </div>
  );
};
```

### Day 2: Performance & Persistence

#### Morning (4 hours):

**5. Persist Enhanced Suggestions in Cache**
```typescript
// hooks/useUnifiedAnalysis.ts - Update to persist enhanced suggestions
const debouncedAIEnhancement = useDebouncedCallback(async (currentDoc, currentSuggestions) => {
  // ... existing enhancement logic ...
  
  if (response.ok) {
    const { enhanced } = await response.json();
    
    // Store enhanced suggestions in cache with document
    const enhancedCacheKey = `enhanced-suggestions-${documentId}`;
    await analysisCache.setAsync(enhancedCacheKey, enhanced, 3600); // 1 hour TTL
    
    // ... rest of logic ...
  }
}, AI_ENHANCEMENT_DELAY);

// Add effect to restore enhanced suggestions on mount
useEffect(() => {
  const restoreEnhancedSuggestions = async () => {
    if (!documentId) return;
    
    const enhancedCacheKey = `enhanced-suggestions-${documentId}`;
    const cached = await analysisCache.getAsync<EnhancedSuggestion[]>(enhancedCacheKey);
    
    if (cached && cached.length > 0) {
      console.log('[AI Enhancement] Restored enhanced suggestions from cache');
      setEnhancedSuggestions(new Map(cached.map(s => [s.id, s])));
      setEnhancementState('enhanced');
      
      // Update suggestions with cached enhancements
      updateSuggestions(['spelling', 'grammar', 'style', 'seo'], cached);
    }
  };
  
  restoreEnhancedSuggestions();
}, [documentId]);
```

**6. Batch Processing for Better Performance**
```typescript
// services/ai/enhancement-service.ts
export class AIEnhancementService {
  private readonly BATCH_SIZE = 10; // Process in batches of 10
  
  async enhanceAllSuggestions(
    suggestions: UnifiedSuggestion[],
    documentContext: DocumentContext
  ): Promise<EnhancedSuggestion[]> {
    const toEnhance = suggestions.filter(s => this.shouldEnhance(s));
    
    if (toEnhance.length === 0) {
      return suggestions.map(s => ({ ...s, aiEnhanced: false } as EnhancedSuggestion));
    }
    
    // Process in batches for better performance
    const results: EnhancedSuggestion[] = [];
    
    for (let i = 0; i < toEnhance.length; i += this.BATCH_SIZE) {
      const batch = toEnhance.slice(i, i + this.BATCH_SIZE);
      console.log(`[AI Enhancement] Processing batch ${i / this.BATCH_SIZE + 1} of ${Math.ceil(toEnhance.length / this.BATCH_SIZE)}`);
      
      try {
        const enhanced = await this.batchEnhance(batch, documentContext);
        results.push(...enhanced);
      } catch (error) {
        console.error('[AI Enhancement] Batch failed:', error);
        // Add unenhanced versions for failed batch
        results.push(...batch.map(s => ({ ...s, aiError: true, aiEnhanced: false } as EnhancedSuggestion)));
      }
    }
    
    // Combine with non-enhanced suggestions
    const enhancedMap = new Map(results.map(s => [s.id, s]));
    
    return suggestions.map(s => {
      const enhancedVersion = enhancedMap.get(s.id);
      return enhancedVersion || { ...s, aiEnhanced: false } as EnhancedSuggestion;
    });
  }
}
```

#### Afternoon (4 hours):

**7. Add Enhancement Progress Indicator**
```typescript
// Update AIEnhancementStatus component to show progress
interface AIEnhancementStatusProps {
  enhancementState: 'idle' | 'enhancing' | 'enhanced';
  enhancedCount?: number;
  totalCount?: number;
  currentBatch?: number;
  totalBatches?: number;
}

export function AIEnhancementStatus({ 
  enhancementState, 
  enhancedCount = 0, 
  totalCount = 0,
  currentBatch = 0,
  totalBatches = 0
}: AIEnhancementStatusProps) {
  if (enhancementState === 'idle' || totalCount === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="flex items-center gap-2 text-sm"
      >
        <Sparkles className={cn(
          "w-4 h-4",
          enhancementState === 'enhancing' 
            ? "text-purple-400 animate-spin" 
            : "text-purple-500"
        )} />
        
        <span className={cn(
          "text-muted-foreground",
          enhancementState === 'enhancing' && "animate-pulse"
        )}>
          {enhancementState === 'enhancing' 
            ? totalBatches > 1 
              ? `AI enhancing batch ${currentBatch}/${totalBatches}...`
              : 'AI enhancing suggestions...'
            : `${enhancedCount} suggestions enhanced`
          }
        </span>
        
        {enhancementState === 'enhancing' && totalCount > 0 && (
          <div className="w-24 h-1 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${(enhancedCount / totalCount) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
```

**8. Add Visual Confidence Indicators**
```typescript
// Update EnhancedSuggestionCard to show confidence visually
const getConfidenceColor = (confidence?: number) => {
  if (!confidence) return 'border-gray-300';
  if (confidence > 0.9) return 'border-purple-500 shadow-purple-100';
  if (confidence > 0.7) return 'border-purple-400';
  if (confidence > 0.5) return 'border-purple-300';
  return 'border-gray-300';
};

// In the component
<motion.div
  layout
  className={cn(
    "p-4 border-l-4 rounded-lg shadow-sm transition-all duration-300",
    suggestion.aiEnhanced 
      ? getConfidenceColor(suggestion.aiConfidence)
      : categoryColorMap[suggestion.category]?.border,
    isEnhancing && "animate-pulse-subtle"
  )}
>
```

## Success Metrics

- [ ] No more "position not found" errors for SEO suggestions
- [ ] Enhanced suggestions persist across page refreshes
- [ ] AI enhancement triggers within 1 second (or on sentence completion)
- [ ] Only suggestions that need enhancement are processed
- [ ] Apply All / Ignore All buttons functional
- [ ] Batch processing prevents UI lag
- [ ] Visual progress indicator during enhancement
- [ ] Confidence-based visual styling

## Testing Plan

### Manual Testing
1. Create document with various error types
2. Verify SEO suggestions can be interacted with
3. Test Apply All / Ignore All functionality
4. Refresh page and verify enhancements persist
5. Monitor performance with 20+ suggestions
6. Test sentence completion trigger

### Edge Cases
- Document with only SEO suggestions
- Document with 50+ suggestions
- Rapid typing/editing during enhancement
- Network failure during enhancement
- Apply All with overlapping positions

## Dependencies
- Existing AI enhancement infrastructure from Sprint 1
- Access to cache system
- Toast notification system

## Risk Mitigation
- Batch processing prevents API rate limits
- Graceful degradation if enhancement fails
- Clear visual feedback during processing
- Rollback plan: disable selective enhancement

## Notes
- This is a focused sprint on bug fixes and UX improvements
- No new features, only refinements to existing functionality
- Performance is a key focus area
- User feedback has been incorporated into all improvements
</rewritten_file> 