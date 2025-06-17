# Sprint 004: UI Polish & Document Metrics

## Goal
The goal of this sprint is to refine the user interface and provide high-level document feedback by integrating readability metrics and improving the editor's status bar. This will complete the core feature set for our local-first analysis engine.

## Plan

- [ ] **1. Integrate Document Metric Services:**
    - [ ] Create a new service file if needed, or update the `UnifiedAnalysisEngine`.
    - [ ] Integrate the `text-readability` library to calculate a readability score (e.g., Flesch-Kincaid).
    - [ ] Integrate the `reading-time` library to calculate the estimated time to read the document.
    - [ ] These checks should be part of the "deep" analysis tier in the engine, running on a long debounce after the user pauses typing.

- [ ] **2. Re-implement Editor Status Bar:**
    - [ ] In `hooks/useUnifiedAnalysis.ts`, expose a `metrics` object containing the `suggestionCount`, `readabilityScore`, and `readingTime`.
    - [ ] Update `components/editor/EditorStatusBar.tsx` to consume the new `metrics` object from the `SuggestionContext`.
    - [ ] Display the total number of suggestions, the current readability score, and the word count/reading time in a clean and intuitive layout.

- [ ] **3. Enhance Suggestions Panel UX:**
    - [ ] Review the current `EnhancedSuggestionsPanel.tsx`.
    - [ ] (Optional Stretch Goal) Implement keyboard navigation to allow users to cycle through suggestions using arrow keys and apply/ignore them with `Enter`/`Escape`.
    - [ ] Ensure the panel's layout and animations are smooth.

- [ ] **4. Testing and Validation:**
    - [ ] Verify that the `EditorStatusBar` updates in near real-time as the user types and suggestions are generated.
    - [ ] Test with long documents to ensure the readability and reading time calculations are performant.
    - [ ] Run a full quality check (`bun lint`, `bun typecheck`, `bun run build`) to ensure no regressions were introduced.

---

## Decisions

*This section will be filled in as we make decisions during the sprint.*

---

## Session Summary

*This section will be updated at the end of each work session.* 