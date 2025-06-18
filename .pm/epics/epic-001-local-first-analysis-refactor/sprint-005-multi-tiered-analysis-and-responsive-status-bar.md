# Sprint 005: Multi-Tiered Analysis & Responsive Status Bar

## High-Level Strategy: The Multi-Tiered, Context-Aware Trigger System

Our goal is to create an assistant that feels like a partner, not a distraction. It should be quiet when the user is in a flow state and provide smart, timely feedback at natural break points in the writing process. To achieve this, we are abandoning the single-debounce model and implementing a multi-tiered system based on user actions.

| Tier      | Analysis Focus        | Trigger(s)                                   | Latency Goal | User Experience                                                                       |
| :-------- | :-------------------- | :------------------------------------------- | :----------- | :------------------------------------------------------------------------------------ |
| **Tier 0** | **Spelling**          | On Word Boundary (space, punctuation)        | < 100ms      | "Instant" feedback. A word is marked as misspelled the moment it's completed.         |
| **Tier 1** | **Style & Grammar**   | 1. On Sentence End ('.', '!', '?')<br/>2. Short Debounce (800ms) | < 1s         | "Rapid" feedback. Suggestions appear at natural cognitive breaks (end of sentence). |
| **Tier 2** | **SEO & Readability** | 1. On Relevant Change (title, meta)<br/>2. Medium Debounce (2000ms) | ~2-3s        | "Passive" updates. Metrics update quietly in the background without distraction.  |
| **Tier 3** | **Word Count**        | On Document Change                         | < 50ms       | "Live" update. The most basic metric, always up-to-date.                           |

---

## Sprint Goals

1.  **Re-architect `useUnifiedAnalysis`** to implement the multi-tiered trigger system.
2.  **Redesign and Rebuild the `EditorStatusBar`** to display discrete, actionable metrics.
3.  **Fully Integrate SEO Analysis** into the `deep` analysis tier and connect it to the new status bar.
4.  **Fix Core Bugs** related to stale state and unresponsive UI.

## Plan

- [x] **Phase 1: Bug Fixes & Core Architecture**
    - [x] **1. Fix Stale Suggestions Bug:**
        - [x] In `hooks/useUnifiedAnalysis.ts`, add an immediate, non-debounced effect that checks if the document is empty.
        - [x] If it is, call `setSuggestions([])` and `setMetrics(null)` instantly to clear the UI.
    - [x] **2. Refactor `useUnifiedAnalysis` for Multi-Tiered Triggers:**
        - [x] Remove the single, long debounce.
        - [x] Keep the existing `runRealtimeSpellCheck` function for Tier 0.
        - [x] Create a new `debouncedFastAnalysis` function (~800ms) for Tier 1 checks (Style, Grammar).
        - [x] Create a new `debouncedDeepAnalysis` function (~2000ms) for Tier 2 checks (SEO, Readability).
        - [x] Create new, lightweight API endpoints (`/api/analysis/fast` and `/api/analysis/deep`) to handle these separate calls.
    - [x] **3. Implement New Trigger Logic in `BlogEditor.tsx`:**
        - [x] In the editor's `onUpdate` handler, add logic to detect sentence-ending punctuation to trigger the `debouncedFastAnalysis`.
        - [x] Ensure the existing word-boundary check correctly calls `runRealtimeSpellCheck`.
        - [x] Ensure the deep analysis is triggered by the 2000ms debounce on any document change.

- [x] **Phase 2: Status Bar Redesign & SEO Integration**
    - [x] **4. Rebuild `EditorStatusBar.tsx`:**
        - [x] Remove the circular `overallScore` progress bar and its hover card.
        - [x] Display the following metrics as individual components (e.g., in `Badge` or simple `div` elements):
            - `Grammar Score`
            - `SEO Score`
            - `Reading Level`
            - `# of words`
            - `Reading Time`
            - `Suggestions` (count)
        - [x] The suggestion count should remain a clickable button to filter the side panel.
    - [x] **5. Fully Implement SEO Analyzer:**
        - [x] In `services/analysis/seo.ts`, expand the `analyze` method.
        - [x] Add checks for core SEO vitals:
            - Presence of `title` tag and its length.
            - Presence of `meta description` and its length.
            - Presence and frequency of the `targetKeyword` in the content, title, and meta description.
            - (Future) Keyword density for all keywords.
        - [x] Ensure the analyzer returns a numeric `seoScore` and any relevant suggestions (e.g., "Meta description is too long").
    - [x] **6. Connect SEO & Metrics to the UI:**
        - [x] Ensure the `debouncedDeepAnalysis` call correctly returns the full `metrics` object, including the new `seoScore` and `readabilityScore` (Flesch-Kincaid).
        - [x] Ensure the `SuggestionContext` correctly stores and exposes these new metrics.
        - [x] Ensure the new `EditorStatusBar` correctly consumes and displays the live metrics.

- [x] **Phase 3: Finalization & Documentation**
    - [x] **7. Testing and Validation:**
        - [x] **Responsiveness:** Verify that all tiers trigger correctly (spelling on space, grammar on '.', metrics on pause).
        - [x] **Accuracy:** Confirm that all scores and metrics are calculated and displayed correctly.
        - [x] **Stability:** Test for race conditions or state management issues from the multiple asynchronous calls.
    - [x] **8. Code Quality Checks:**
        - [x] Run `bun lint`, `bun typecheck`, and `bun run build` to ensure no new issues have been introduced.
    - [ ] **9. Update Project Documentation:**
        - [ ] **As a final step**, once this sprint is complete and validated, update all relevant project documentation (`.pm/docs/`, `README.md`, etc.) to reflect the new multi-tiered analysis architecture.
    - [x] **10. Final Sprint Documentation:**
        - [x] Update this sprint document with a session summary and file change log upon completion.
        - [x] Update `PROJECT_STATUS.md` to reflect the current sprint. 

- [x] **Phase 4: Advanced SEO Implementation**
    - [x] **11. Research & Plan SEO Service:**
        - [x] Thoroughly review the logic and scoring in `.pm/docs/old/seo.md`.
        - [x] Plan how to integrate these checks into the existing `seo.ts` service, including how to extract headings and other metadata from the Tiptap document structure within the API route.
    - [x] **12. Implement Advanced SEO Analyzer:**
        - [x] In `services/analysis/seo.ts`, replace the placeholder implementation with the detailed checks from the documentation:
            - [x] Title length, keyword placement.
            - [x] Meta description length, keyword presence, call-to-action.
            - [x] Keyword density (0.5% - 2% target).
            - [x] Heading structure (single H1, proper hierarchy).
            - [x] Content length.
        - [x] Develop a weighted scoring system as outlined in the documentation to produce a final `seoScore`.
        - [x] Generate actionable suggestions for any detected issues (e.g., "Title is too long," "Add target keyword to first paragraph").

- [ ] **Phase 5: UX & Interactivity Polish**
    - [x] **13. Fix Inaccurate Reading Level:**
        - [x] Replaced the heavy `@mozilla/readability` library with the lightweight `text-statistics` package.
        - [x] Switched from "Flesch Reading Ease" score to "Flesch-Kincaid Grade Level" for a more intuitive and accurate metric.
        - [x] Refactored all downstream components and services to use the new `readingLevel` property.
    - [x] **14. Fix Disappearing Suggestions Bug:**
        - [x] Added `replaceSuggestionsByCategories` to `SuggestionContext` to allow atomic, category-based updates.
        - [x] Refactored `useUnifiedAnalysis` to use this new function, preventing the `fast` analysis tier (grammar, style) from overwriting results from other tiers.
    - [x] **15. Define & Implement Unified Color System:**
        - [x] Defined a clear color-code for each suggestion category (Spelling: Red, Grammar: Yellow, Style: Blue, SEO: Purple).
        - [x] Updated `app/globals.css` to include distinct underline styles for each category.
        - [x] Refactored `EnhancedSuggestionsPanel.tsx` to use the color system, applying a colored left border to each suggestion card for visual consistency.
    - [x] **16. Implement Interactive Underlines & Panel:**
        - [x] Passed `hoveredSuggestionId` from the context into the `EnhancedGrammarDecoration` extension.
        - [x] Added `onMouseEnter`/`onMouseLeave` handlers to suggestion cards in the panel to update the shared hover state.
        - [x] Conditionally applied a `bg-muted` class to both the decoration underline and the panel card when hovered, creating a two-way highlight effect.
    - [x] **17. Implement Suggestion Filtering:**
        - [x] Updated the `SuggestionContext` to support multi-category filtering.
        - [x] Added a header to the `EnhancedSuggestionsPanel` with toggle buttons for each category.
        - [x] Implemented the filtering logic to show/hide suggestions based on the selected categories.

- [ ] **Phase 6: Finalization**
	- [ ] **18. Final Testing and Validation:**
		- [ ] **Interactivity:** Verify that hovering and clicking underlines provides a snappy, intuitive experience.
		- [ ] **Filtering:** Confirm that suggestion filters work as expected.
		- [ ] **SEO Accuracy:** Check that the new SEO scores and suggestions are accurate and update correctly.
        - [ ] **Metrics:** Validate that the reading level is now accurate.
	- [ ] **19. Code Quality Checks:**
		- [ ] Run `bun lint`, `bun typecheck`, and `bun run build` to ensure no new issues have been introduced.
	- [ ] **20. Update Project Documentation:**
		- [ ] **As a final step**, once this sprint is complete and validated, update all relevant project documentation (`.pm/docs/`, `README.md`, etc.) to reflect the new multi-tiered analysis architecture and UI features. 

---
## Session Summary
**Completed:**
- **Task 13: Fix Inaccurate Reading Level**: Replaced the readability library, implemented a more accurate Flesch-Kincaid Grade Level metric, and refactored all affected parts of the application.
- **Task 14: Fix Disappearing Suggestions Bug**: Corrected state management logic to prevent different analysis tiers from overwriting each other's suggestions.
- **Task 15: Define & Implement Unified Color System**: Implemented a consistent, category-based color code for suggestion underlines and panel cards to improve UX.
- **Task 16: Implement Interactive Underlines & Panel**: Passed `hoveredSuggestionId` from the context into the `EnhancedGrammarDecoration` extension, added `onMouseEnter`/`onMouseLeave` handlers to suggestion cards in the panel to update the shared hover state, and conditionally applied a `bg-muted` class to both the decoration underline and the panel card when hovered, creating a two-way highlight effect.
- **Task 17: Implement Suggestion Filtering**: Updated the `SuggestionContext` to support multi-category filtering, added a header to the `EnhancedSuggestionsPanel` with toggle buttons for each category, and implemented the filtering logic to show/hide suggestions based on the selected categories.

**Files Changed:**
- `modified: services/analysis/metrics.ts`
- `modified: lib/db/schema.ts`
- `modified: services/analysis/engine.ts`
- `modified: components/editor/EditorStatusBar.tsx`
- `modified: types/modules.d.ts`
- `modified: contexts/SuggestionContext.tsx`
- `modified: hooks/useUnifiedAnalysis.ts`
- `modified: app/globals.css`
- `modified: components/panels/EnhancedSuggestionsPanel.tsx`
- `modified: components/editor/BlogEditor.tsx`
- `modified: components/editor/extensions/EnhancedGrammarDecoration.tsx`

**Remaining:**
- Begin work on Phase 6: Finalization.