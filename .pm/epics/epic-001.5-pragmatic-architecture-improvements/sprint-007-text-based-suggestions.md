# Sprint 007: Text-Based Suggestions

**Status:** In Progress
**Epic:** 001.5 - Pragmatic Architecture Improvements
**Date Started:** 2024-12-28
**Date Completed:** TBD

## Feature Requirements
Fix the position bug permanently by converting from position-based to text-based suggestion matching. Suggestions will store the actual problematic text with stable IDs based on content + rule + occurrence. Use ProseMirror's transaction mapping to track positions separately from IDs. This eliminates position errors when text above changes and enables automatic cleanup of stale suggestions.

## Architectural Decisions
Based on senior architect review and real-world testing:
1. **Stable ID Formula** - `${ruleId}-${textHash}-${occurrence}` (no context in ID)
2. **Position Tracking** - Use ProseMirror's transaction mapping (not text search)
3. **No Context Search** - Context breaks with real-time editing
4. **Occurrence Counting** - Track which instance of rule+text combination
5. **Decoration-based Rendering** - Use ProseMirror decorations for UI
6. **Position Validation** - Check text hasn't changed at mapped positions
7. **Silent Removal** - Remove suggestions when text is edited

## Tasks
- [x] Review current implementation and clarify requirements
- [x] Initial implementation with context-based search (found to be flawed)
- [ ] Redesign with ProseMirror position tracking:
  - [ ] Update suggestion ID to use rule + text + occurrence (no context)
  - [ ] Create SuggestionManager class for position tracking
  - [ ] Implement ProseMirror plugin for transaction mapping
  - [ ] Convert from text search to position mapping
  - [ ] Update decoration rendering to use tracked positions
  - [ ] Remove context-based position finding
  - [ ] Add position validation on document changes
- [ ] Update suggestion factory:
  - [ ] Generate IDs without context dependency
  - [ ] Count occurrences based on rule + text only
  - [ ] Remove getPosition method from suggestions
- [ ] Update SuggestionContext:
  - [ ] Add position tracking via SuggestionManager
  - [ ] Remove text-based position finding
  - [ ] Update suggestion cleanup logic
- [ ] Update UI components:
  - [ ] Use tracked positions instead of getPosition()
  - [ ] Update apply fix to use tracked positions
- [ ] Write comprehensive tests
- [ ] Update documentation

## Technical Plan

### 1. Core Architecture

The new system separates suggestion identity from position tracking:

```typescript
// Suggestion = Identity + Content (position-independent)
interface Suggestion {
  id: string;              // "spelling/misspelling-helo-0"
  ruleId: string;          // "spelling/misspelling"
  matchText: string;       // "helo"
  fixes: SuggestionAction[];
  message: string;
  severity: 'error' | 'warning';
  category: string;
  subCategory: string;
}

// Position tracked separately and updated via ProseMirror
interface TrackedPosition {
  suggestionId: string;
  from: number;           // ProseMirror position
  to: number;             // ProseMirror position
}
```

### 2. Suggestion Manager Implementation
```typescript
// In lib/editor/suggestion-manager.ts
export class SuggestionManager {
  private suggestions = new Map<string, Suggestion>();
  private positions = new Map<string, TrackedPosition>();
  
  // Add suggestions from server
  addSuggestions(newSuggestions: Suggestion[], doc: Node) {
    this.suggestions.clear();
    this.positions.clear();
    
    newSuggestions.forEach(suggestion => {
      this.suggestions.set(suggestion.id, suggestion);
      
      // Find initial position in document
      const position = this.findInitialPosition(doc, suggestion);
      if (position) {
        this.positions.set(suggestion.id, {
          suggestionId: suggestion.id,
          from: position.from,
          to: position.to
        });
      }
    });
  }
  
  // Update positions when document changes
  updatePositions(tr: Transaction): void {
    if (!tr.docChanged) return;
    
    const updatedPositions = new Map<string, TrackedPosition>();
    
    this.positions.forEach((pos, id) => {
      // Map positions through the transaction
      const mappedFrom = tr.mapping.map(pos.from);
      const mappedTo = tr.mapping.map(pos.to);
      
      if (mappedFrom !== null && mappedTo !== null && mappedFrom < mappedTo) {
        // Validate text hasn't changed
        const currentText = tr.doc.textBetween(mappedFrom, mappedTo);
        const suggestion = this.suggestions.get(id);
        
        if (suggestion && currentText === suggestion.matchText) {
          updatedPositions.set(id, {
            suggestionId: id,
            from: mappedFrom,
            to: mappedTo
          });
        }
        // If text changed, suggestion is automatically removed
      }
    });
    
    this.positions = updatedPositions;
  }
  
  // Get current positions for rendering
  getPositions(): TrackedPosition[] {
    return Array.from(this.positions.values());
  }
  
  // Find initial position for a suggestion
  private findInitialPosition(doc: Node, suggestion: Suggestion): { from: number; to: number } | null {
    let occurrenceCount = 0;
    let result: { from: number; to: number } | null = null;
    
    doc.descendants((node, pos) => {
      if (!node.isText || !node.text || result) return;
      
      let index = -1;
      while ((index = node.text.indexOf(suggestion.matchText, index + 1)) !== -1) {
        // Extract occurrence number from ID
        const expectedOccurrence = parseInt(suggestion.id.split('-').pop() || '0');
        
        if (occurrenceCount === expectedOccurrence) {
          result = {
            from: pos + index,
            to: pos + index + suggestion.matchText.length
          };
          return false;
        }
        occurrenceCount++;
      }
    });
    
    return result;
  }
}
```

### 3. ProseMirror Plugin for Position Tracking
```typescript
// In lib/editor/extensions/suggestion-tracking.ts
import { Plugin, PluginKey } from 'prosemirror-state';

export const suggestionTrackingKey = new PluginKey('suggestionTracking');

export function createSuggestionTrackingPlugin(suggestionManager: SuggestionManager) {
  return new Plugin({
    key: suggestionTrackingKey,
    
    state: {
      init() {
        return { manager: suggestionManager };
      },
      
      apply(tr, value) {
        // Update positions on every transaction
        value.manager.updatePositions(tr);
        return value;
      }
    },
    
    // Provide decorations for rendering
    props: {
      decorations(state) {
        const { manager } = this.getState(state);
        const positions = manager.getPositions();
        
        return DecorationSet.create(
          state.doc,
          positions.map(pos => {
            const suggestion = manager.getSuggestion(pos.suggestionId);
            return Decoration.inline(pos.from, pos.to, {
              class: `suggestion-${suggestion.category}`,
              'data-suggestion-id': suggestion.id,
              'data-severity': suggestion.severity
            });
          })
        );
      }
    }
  });
}
```

### 4. Updated Suggestion Factory
```typescript
// In lib/editor/suggestion-factory.ts
export const createSuggestion = (
  from: number,
  to: number,
  originalText: string,
  documentText: string,
  category: SuggestionCategory,
  subCategory: SubCategory,
  ruleId: RuleId,
  title: string,
  message: string,
  actions: SuggestionAction[] = [],
  severity: 'error' | 'warning' | 'suggestion' = 'suggestion',
): Suggestion => {
  // Count occurrences of this rule + text combination
  let occurrenceCount = 0;
  let searchIndex = -1;
  
  while ((searchIndex = documentText.indexOf(originalText, searchIndex + 1)) !== -1) {
    if (searchIndex >= from) break;
    // Only count if it's the same rule type
    occurrenceCount++;
  }
  
  // Generate stable ID without context
  const textHash = originalText.slice(0, 8).toLowerCase().replace(/[^a-z0-9]/g, '');
  const id = `${ruleId}-${textHash}-${occurrenceCount}`;
  
  return {
    id,
    ruleId,
    category,
    subCategory,
    severity,
    title,
    message,
    matchText: originalText,
    actions,
  };
};
```

### 5. Integration with TipTap Editor
```typescript
// In components/editor/BlogEditor.tsx
import { createSuggestionTrackingPlugin } from '@/lib/editor/extensions/suggestion-tracking';
import { SuggestionManager } from '@/lib/editor/suggestion-manager';

// Create suggestion manager instance
const suggestionManager = useRef(new SuggestionManager());

// Add to editor extensions
const editor = useEditor({
  extensions: [
    ...otherExtensions,
    Extension.create({
      name: 'suggestionTracking',
      addProseMirrorPlugins() {
        return [createSuggestionTrackingPlugin(suggestionManager.current)];
      }
    })
  ]
});

// Update when receiving suggestions from API
useEffect(() => {
  if (suggestions && editor) {
    suggestionManager.current.addSuggestions(suggestions, editor.state.doc);
  }
}, [suggestions, editor]);

// Apply fix using tracked positions
const applySuggestion = (suggestionId: string, value: string) => {
  const position = suggestionManager.current.getPosition(suggestionId);
  if (position && editor) {
    editor.chain()
      .focus()
      .insertContentAt({ from: position.from, to: position.to }, value)
      .run();
  }
};
```

### 6. SuggestionContext Updates
```typescript
// In contexts/SuggestionContext.tsx
const updateSuggestions = useCallback(
  (categories: string[], newSuggestionsFromServer: Suggestion[]) => {
    setSuggestions(prevSuggestions => {
      // Filter existing suggestions by categories NOT being updated
      const categoriesSet = new Set(categories);
      const retainedSuggestions = prevSuggestions.filter(s => !categoriesSet.has(s.category));
      
      // Combine with new suggestions
      const allSuggestions = [...retainedSuggestions, ...newSuggestionsFromServer];
      
      // De-duplicate by ID
      const uniqueMap = new Map<string, Suggestion>();
      allSuggestions.forEach(s => uniqueMap.set(s.id, s));
      
      return Array.from(uniqueMap.values());
    });
  },
  []
);
```

## Why the Change?

The initial context-based search approach failed because:
1. **Context changes as users type** - Making the search string invalid immediately
2. **Too fragile** - Requires exact 40+ character match
3. **Performance issues** - O(n) search on every render
4. **Real-time editing incompatible** - Assumes static document

The new approach leverages ProseMirror's strengths:
1. **Position mapping** - Built-in support for tracking positions through edits
2. **Transaction-based updates** - Positions update automatically
3. **O(1) lookups** - No searching required
4. **Handles all edge cases** - Undo/redo, collaborative editing, etc.

## Migration Strategy
1. Implement SuggestionManager alongside existing system
2. Add ProseMirror plugin for position tracking
3. Update ID generation to remove context dependency
4. Switch UI components to use tracked positions
5. Remove old text-search code

## Performance Improvements
- **Position updates**: O(1) instead of O(n) search
- **No text searching**: Positions tracked via mapping
- **Batched updates**: All positions updated in single transaction
- **Memory efficient**: Only track active suggestions

## Testing Plan
1. **Unit Tests**
   - SuggestionManager position tracking
   - ID generation stability
   - Transaction mapping accuracy

2. **Integration Tests**
   - Suggestions survive text movement
   - Duplicate text handling
   - Text edits remove suggestions
   - Undo/redo support

3. **E2E Tests**
   - Apply fixes via UI
   - Real-time editing behavior
   - Performance with 1000+ suggestions

## Success Metrics
- Zero position-related errors
- Sub-1ms position updates
- 100% apply success rate
- Smooth 60fps with large documents

## Key Decisions
- **Separate identity from position** - More flexible and robust
- **Use ProseMirror's mapping** - Battle-tested solution
- **Simple occurrence counting** - Handles duplicates elegantly
- **Decoration-based rendering** - Leverages ProseMirror's rendering

## Session Summary

### Session 1: Initial Implementation (Context-Based)
**Completed:**
- Implemented context-based text search approach
- Created TextPositionFinder with 40-char context matching
- Updated all services to use text-based suggestions
- Fixed multiple bugs including:
  - Function serialization in API responses
  - Race conditions with editor initialization
  - Newline handling in context extraction
  - Position mapping between plain text and ProseMirror

**Result:** Implementation worked but had fundamental flaw - context changes as user types, breaking position finding

### Session 2: Architecture Redesign
**Completed:**
- Identified core issue: context-based search incompatible with real-time editing
- Researched ProseMirror's position mapping capabilities
- Designed new architecture separating identity from position
- Created comprehensive plan using:
  - Stable IDs: `${ruleId}-${textHash}-${occurrence}`
  - ProseMirror transaction mapping for positions
  - Decoration-based rendering
  - SuggestionManager for centralized tracking

**Key Insights:**
- Text search is wrong approach for dynamic documents
- ProseMirror's position mapping is the correct solution
- Separating identity (what error) from position (where it is) is crucial

### Next Steps:
1. Implement SuggestionManager class
2. Create ProseMirror plugin for position tracking
3. Update ID generation to remove context
4. Migrate UI components to use tracked positions
5. Remove text-search based code

**Status:** Sprint redesigned, ready for new implementation

### Session 3: ProseMirror Implementation & Position Bug Fix
**Completed:**
- Implemented SuggestionManager class with position tracking
- Created ProseMirror plugin for transaction mapping
- Updated suggestion factory to remove context and getPosition
- Cleaned up all old text-based position finding code
- Fixed all linting and build errors
- Added comprehensive debug logging
- **Found and fixed the root cause of position mismatch**

**Root Cause Discovery:**
The position mismatch was NOT due to:
- Document structure differences between server and client
- Occurrence counting logic (this was working correctly)
- ProseMirror's position mapping

The ACTUAL issue was:
- The analysis services were not receiving the `documentText` parameter
- They were calling `doc.textContent` internally, which was undefined
- This caused the occurrence counting during suggestion creation to fail
- The fix was simply to pass `documentText` from the engine to all analysis services

**The Fix:**
1. Updated `BasicGrammarChecker.run()` to accept `documentText` parameter
2. Updated `StyleAnalyzer.run()` to accept `documentText` parameter  
3. Updated `UnifiedAnalysisEngine.runFastChecks()` to pass `documentText` to both services
4. This ensures consistent text representation between creation and position finding

**Files Changed:**
- `created: lib/editor/suggestion-manager.ts`
- `created: lib/editor/extensions/suggestion-tracking.ts`
- `modified: lib/editor/suggestion-factory.ts`
- `modified: components/editor/BlogEditor.tsx`
- `modified: contexts/SuggestionContext.tsx`
- `modified: all analysis services (removed getPosition)`
- `deleted: lib/editor/text-position-finder.ts`
- `modified: hooks/useUnifiedAnalysis.ts` (added logging)
- `modified: services/analysis/basic-grammar.ts` (added documentText param)
- `modified: services/analysis/style.ts` (added documentText param)
- `modified: services/analysis/engine.ts` (pass documentText to services)

**Status:** Implementation complete, position finding issue resolved - ready for testing 

### Session 4: Fixing Position Mismatches
**Completed:**
- Identified root cause of wrong positions being applied
- For short matches (1-2 chars like "t"), the system was finding ANY occurrence
- Implemented contextual matching for short text to ensure uniqueness
- Added originalText, originalFrom, originalTo fields to suggestions
- Updated SuggestionManager to use stored positions when available
- Fixed all TypeScript and linting errors
- Build completes successfully

**The Position Mismatch Fix:**
1. **Problem**: When fixing capitalization of "t", it would change a different "t" in the document
2. **Cause**: Short text like "t" appears many times, occurrence counting was unreliable
3. **Solution**: 
   - Store surrounding context (10 chars before/after) for short matches
   - Store original position when creating suggestion
   - Try to use original position first, fall back to contextual search
   - Find the actual error text within the contextual match

**Files Changed:**
- `modified: lib/editor/suggestion-factory.ts` (added contextual matching)
- `modified: lib/editor/suggestion-manager.ts` (use original positions)
- `modified: types/suggestions.ts` (added new fields, fixed duplicate context)

**Status:** Position tracking improved, ready for testing with short matches 

## Phase 2: Suggestion Sorting Implementation

### Current State Analysis
- **Color mapping by category**: Spelling (red), Grammar (orange), Style (green), SEO (purple)
- **Severity hardcoded by category**: Spelling='error', Grammar='warning', Style/SEO='suggestion'
- **No sorting**: Suggestions appear in order generated (Style → Grammar → Spelling → SEO)
- **SEO issues**: ALL marked as document-wide, even when they have specific positions

### Sorting Strategy: Unified Single-List

#### Sort Order (applied in sequence):
1. **Primary: Document Position**
   - Position-based suggestions: Sort by `originalFrom` (ascending)
   - Document-wide suggestions: Treat as position `Infinity` (push to bottom)

2. **Secondary: Category Priority** (when positions are equal)
   - Spelling (highest priority - breaks readability)
   - Grammar (important for clarity)
   - SEO (important for visibility)
   - Style (lowest priority - nice-to-have)

#### Implementation Logic:
```typescript
// Pseudo-code for sorting function
suggestions.sort((a, b) => {
  const posA = a.originalFrom ?? Infinity;
  const posB = b.originalFrom ?? Infinity;
  
  // Primary sort by position
  if (posA !== posB) return posA - posB;
  
  // Secondary sort by category priority
  const priorityMap = { spelling: 0, grammar: 1, seo: 2, style: 3 };
  return priorityMap[a.category] - priorityMap[b.category];
});
```

#### Benefits:
- Natural top-to-bottom document flow
- Critical errors at each position shown first
- Document-wide issues logically at end
- Single unified list as requested
- Predictable and learnable pattern

## Phase 3: SEO Position Tracking Improvements

### Current Problems:
1. **All SEO suggestions marked document-wide** - Even position-specific ones
2. **Lost context** - Can't highlight which heading needs keyword
3. **Poor UX** - Users can't click to jump to problem area

### SEO Issues That Need Position Tracking:

#### 1. Heading-Related Issues:
- **Missing H1**: Should highlight where H1 should be (start of content)
- **Multiple H1s**: Should highlight each H1 position
- **Invalid heading sequence**: Should highlight the problematic heading
- **Heading missing keyword**: Should highlight specific heading(s) without keyword

#### 2. Content-Related Issues:
- **Keyword not in first paragraph**: Should highlight first paragraph
- **Content sections too long**: Should highlight where to add subheadings

#### 3. Truly Document-Wide Issues (remain as-is):
- Title length issues
- Meta description issues
- Overall keyword density
- Total content length

### Implementation Plan:

#### Step 1: Enhance extractHeadings to include positions
```typescript
interface HeadingWithPosition {
  level: number;
  text: string;
  position: { from: number; to: number };
}
```

#### Step 2: Update SEOAnalyzer methods to track positions
- Modify `analyzeHeadings` to create positioned suggestions
- Update `checkKeywordDensity` for first paragraph position
- Change from `createDocumentSuggestion` to `createSuggestion` where applicable

#### Step 3: Add position data to SEO checks:
- **H1 checks**: Position at document start or actual H1 locations
- **Heading sequence**: Position at the invalid heading
- **Keyword in headings**: Position at headings missing keyword
- **First paragraph keyword**: Position at first paragraph

#### Step 4: Maintain backward compatibility:
- Keep truly document-wide issues as document suggestions
- Ensure all suggestions have proper IDs and tracking

### Expected Outcome:
- SEO suggestions integrated naturally in document flow
- Users can click SEO issues to jump to exact location
- Better understanding of where to make SEO improvements
- Maintains clean single-list UI

## Implementation Priority:
1. **First**: Implement sorting (quick win, improves UX immediately)
2. **Second**: Fix SEO position tracking (more complex, bigger impact)
3. **Third**: Consider adding severity levels independent of category (future)

## Testing Considerations:
- Verify sort order with mixed suggestion types
- Test position tracking with document edits
- Ensure SEO suggestions highlight correctly
- Check performance with many suggestions
- Validate position mapping survives undo/redo

## Success Metrics
- Zero position-related errors
- Sub-1ms position updates
- 100% apply success rate
- Smooth 60fps with large documents

## Key Decisions
- **Separate identity from position** - More flexible and robust
- **Use ProseMirror's mapping** - Battle-tested solution
- **Simple occurrence counting** - Handles duplicates elegantly
- **Decoration-based rendering** - Leverages ProseMirror's rendering

## Session Summary

### Session 1: Initial Implementation (Context-Based)
**Completed:**
- Implemented context-based text search approach
- Created TextPositionFinder with 40-char context matching
- Updated all services to use text-based suggestions
- Fixed multiple bugs including:
  - Function serialization in API responses
  - Race conditions with editor initialization
  - Newline handling in context extraction
  - Position mapping between plain text and ProseMirror

**Result:** Implementation worked but had fundamental flaw - context changes as user types, breaking position finding

### Session 2: Architecture Redesign
**Completed:**
- Identified core issue: context-based search incompatible with real-time editing
- Researched ProseMirror's position mapping capabilities
- Designed new architecture separating identity from position
- Created comprehensive plan using:
  - Stable IDs: `${ruleId}-${textHash}-${occurrence}`
  - ProseMirror transaction mapping for positions
  - Decoration-based rendering
  - SuggestionManager for centralized tracking

**Key Insights:**
- Text search is wrong approach for dynamic documents
- ProseMirror's position mapping is the correct solution
- Separating identity (what error) from position (where it is) is crucial

### Next Steps:
1. Implement SuggestionManager class
2. Create ProseMirror plugin for position tracking
3. Update ID generation to remove context
4. Migrate UI components to use tracked positions
5. Remove text-search based code

**Status:** Sprint redesigned, ready for new implementation

### Session 3: ProseMirror Implementation & Position Bug Fix
**Completed:**
- Implemented SuggestionManager class with position tracking
- Created ProseMirror plugin for transaction mapping
- Updated suggestion factory to remove context and getPosition
- Cleaned up all old text-based position finding code
- Fixed all linting and build errors
- Added comprehensive debug logging
- **Found and fixed the root cause of position mismatch**

**Root Cause Discovery:**
The position mismatch was NOT due to:
- Document structure differences between server and client
- Occurrence counting logic (this was working correctly)
- ProseMirror's position mapping

The ACTUAL issue was:
- The analysis services were not receiving the `documentText` parameter
- They were calling `doc.textContent` internally, which was undefined
- This caused the occurrence counting during suggestion creation to fail
- The fix was simply to pass `documentText` from the engine to all analysis services

**The Fix:**
1. Updated `BasicGrammarChecker.run()` to accept `documentText` parameter
2. Updated `StyleAnalyzer.run()` to accept `documentText` parameter  
3. Updated `UnifiedAnalysisEngine.runFastChecks()` to pass `documentText` to both services
4. This ensures consistent text representation between creation and position finding

**Files Changed:**
- `created: lib/editor/suggestion-manager.ts`
- `created: lib/editor/extensions/suggestion-tracking.ts`
- `modified: lib/editor/suggestion-factory.ts`
- `modified: components/editor/BlogEditor.tsx`
- `modified: contexts/SuggestionContext.tsx`
- `modified: all analysis services (removed getPosition)`
- `deleted: lib/editor/text-position-finder.ts`
- `modified: hooks/useUnifiedAnalysis.ts` (added logging)
- `modified: services/analysis/basic-grammar.ts` (added documentText param)
- `modified: services/analysis/style.ts` (added documentText param)
- `modified: services/analysis/engine.ts` (pass documentText to services)

**Status:** Implementation complete, position finding issue resolved - ready for testing 

### Session 4: Fixing Position Mismatches
**Completed:**
- Identified root cause of wrong positions being applied
- For short matches (1-2 chars like "t"), the system was finding ANY occurrence
- Implemented contextual matching for short text to ensure uniqueness
- Added originalText, originalFrom, originalTo fields to suggestions
- Updated SuggestionManager to use stored positions when available
- Fixed all TypeScript and linting errors
- Build completes successfully

**The Position Mismatch Fix:**
1. **Problem**: When fixing capitalization of "t", it would change a different "t" in the document
2. **Cause**: Short text like "t" appears many times, occurrence counting was unreliable
3. **Solution**: 
   - Store surrounding context (10 chars before/after) for short matches
   - Store original position when creating suggestion
   - Try to use original position first, fall back to contextual search
   - Find the actual error text within the contextual match

**Files Changed:**
- `modified: lib/editor/suggestion-factory.ts` (added contextual matching)
- `modified: lib/editor/suggestion-manager.ts` (use original positions)
- `modified: types/suggestions.ts` (added new fields, fixed duplicate context)

**Status:** Position tracking improved, ready for testing with short matches 