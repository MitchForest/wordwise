# Position Mapping Fix

## Problem
The spell checker and other text analyzers work on plain text extracted from the editor using `editor.getText()`. This plain text loses all structural information (paragraph boundaries, formatting, etc.) and returns character positions as simple offsets in the concatenated text.

However, ProseMirror uses a different position system that accounts for node boundaries. Directly using plain text positions to create selections or decorations in ProseMirror results in:
- Incorrect text being highlighted
- Selections appearing in wrong places
- Decorations being placed incorrectly
- Fix actions replacing wrong text

## Root Cause
When `getText()` is called on a ProseMirror document:
```
Document structure:
- Paragraph 1: "Hello world."
- Paragraph 2: "This is a test."

Plain text: "Hello world.This is a test."
           ^-- Note: No line break between paragraphs
```

The spell checker finds "wordThis" as a typo at position 12-20 in plain text, but in ProseMirror:
- Position 12 is at the end of paragraph 1
- Position 13 is the paragraph boundary
- Position 14 is the start of paragraph 2
- The actual text "This" starts at position 14, not 12

## Solution
Created a position mapping system (`/utils/position-mapper.ts`) that:

1. **Extracts text with mapping**: `extractTextWithMapping(editor)`
   - Walks through the ProseMirror document
   - Records the relationship between plain text positions and ProseMirror positions
   - Returns both the plain text and a mapping array

2. **Converts positions**: `plainTextToProseMirrorPosition(plainTextPos, mappings)`
   - Uses binary search for efficiency
   - Converts plain text positions to ProseMirror positions
   - Returns -1 if position cannot be mapped (text changed)

3. **Validates positions**: `isValidProseMirrorRange(editor, from, to)`
   - Ensures positions are within document bounds
   - Prevents errors when applying fixes

## Implementation
Updated `useOptimizedAnalysis` hook to:
- Extract text with position mappings
- Convert all suggestion positions from plain text to ProseMirror positions
- Validate positions before applying fixes
- Handle invalid positions gracefully with fallbacks

## Benefits
- Spell check highlights appear on the correct text
- Grammar suggestions target the right words
- Fix actions replace the intended text
- No more position mismatches between analysis and display

## Future Improvements
- Consider analyzing text paragraph by paragraph to reduce mapping complexity
- Cache position mappings for better performance
- Add visual debugging tools to show position mappings