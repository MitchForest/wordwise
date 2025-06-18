# Sprint 007: Text-Based Suggestions

**Status:** Planning
**Epic:** 001.5 - Pragmatic Architecture Improvements
**Date Started:** TBD
**Date Completed:** TBD

## Feature Requirements
Fix the position bug permanently by converting from position-based to text-based suggestion matching. Suggestions will store the actual problematic text and use fuzzy matching to find where text has moved in the document. This eliminates position errors when text above changes and enables automatic cleanup of stale suggestions.

## Tasks
- [ ] Create new TextBasedSuggestion interface with matchText, context, and replacement fields
- [ ] Implement findTextPosition() function with fuzzy matching algorithm
- [ ] Add suggestion ID generation based on hash of ruleId + matchText
- [ ] Create getPosition() method that calculates position on-demand
- [ ] Implement automatic suggestion cleanup when text no longer exists
- [ ] Add immediate removal when fix is applied
- [ ] Handle multiple instances of same error independently
- [ ] Create backward compatibility adapter for existing suggestions
- [ ] Update UI components to use new suggestion format
- [ ] Add feature flag for gradual rollout
- [ ] Write comprehensive tests for text matching edge cases
- [ ] Update documentation

## Technical Plan

### 1. New Suggestion Interface
```typescript
interface TextBasedSuggestion {
  id: string, // Hash of ruleId + matchText
  matchText: string, // The actual problematic text
  matchContext: string, // ~40 chars for context
  replacementText: string, // What to replace it with
  message: string,
  category: string,
  ruleId: string,
  
  // Position calculated on-demand
  getPosition(document: string): { start: number, end: number } | null
}
```

### 2. Text Matching Implementation
- Use fuzzy string matching library (e.g., fuse.js) for finding moved text
- Handle edge cases: text at document boundaries, partial matches
- Optimize for performance with caching and early exits

### 3. Migration Strategy
- Feature flag: `useTextBasedSuggestions`
- Adapter to convert existing position-based suggestions
- Parallel operation during transition period
- Monitoring and gradual rollout

## Files to Modify
- `types/suggestions.ts` - Add new TextBasedSuggestion interface
- `services/analysis/engine.ts` - Update to generate text-based suggestions
- `lib/editor/suggestion-factory.ts` - Implement text matching logic
- `lib/editor/position-utils.ts` - Add findTextPosition() function
- `hooks/useUnifiedAnalysis.ts` - Update to handle new suggestion format
- `components/panels/EnhancedSuggestionsPanel.tsx` - Update UI to use getPosition()
- `components/editor/GrammarHoverCard.tsx` - Update position calculations

## Decisions & Notes
- Using fuzzy matching instead of exact matching to handle minor edits
- Storing ~40 chars of context to disambiguate multiple instances
- ID based on content hash ensures stability across sessions
- Backward compatibility maintained during migration period

## Session Summary
**Completed:**
- [To be filled during implementation]

**Remaining:**
- [To be filled during implementation]

**Files Changed:**
- [To be filled during implementation] 