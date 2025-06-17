# Sprint 003: Local Analysis & Interactive UX

**Status:** In Progress
**Epic:** 001 - Local-First Analysis Refactor
**Date Started:** 2024-05-24

## Goal
The goal of this sprint is to expand local-first analysis to include style and basic grammar checks, and to build a rich, interactive user experience for viewing and acting on suggestions. This involves refactoring the analysis engine, implementing new analysis services, and then building the UI/UX to support features like color-coded suggestions, hover-to-highlight interactivity, and a robust side panel.

## Completed Work

- **Phase 1: Backend Analysis Engine**
    - [x] **Engine Refactor:** The `UnifiedAnalysisEngine` in `services/analysis/engine.ts` has been successfully refactored to support a tiered architecture (`runInstantChecks`, `runFastChecks`).
    - [x] **Dependency Installation:** The `write-good` library and its types have been added to the project.
    - [x] **Style Service:** A `StyleAnalyzer` using `write-good` has been implemented in `services/analysis/style.ts` and integrated into the `fastChecks` tier.
    - [x] **Grammar Service:** A `BasicGrammarChecker` with a rule for repeated words has been implemented in `services/analysis/basic-grammar.ts` and integrated into the `fastChecks` tier.
    - [x] **Hook Integration:** The `useUnifiedAnalysis` hook has been updated to call the new tiered engine methods with appropriate debouncing, feeding suggestions into the `SuggestionContext`.

- **Phase 2: Initial UI/UX Fixes**
    - [x] **Scrolling Panel:** The suggestions panel (`EnhancedSuggestionsPanel.tsx`) now uses a `<ScrollArea>` component, fixing the vertical scrolling issue.
    - [x] **Underline Foundation:** The Tiptap extension `EnhancedGrammarDecoration.tsx` now correctly assigns CSS classes based on both suggestion `category` (e.g., `grammar-spelling`) and `severity` (e.g., `grammar-error`).

---
## Remaining Tasks

- [ ] **Phase 3: Enhance UI Visuals & Feedback**
    - [ ] **1. Implement Color-Coded Underlines:**
        - [ ] In `app/globals.css`, create distinct underline color styles for `.grammar-spelling`, `.grammar-grammar`, and `.grammar-style` classes to provide immediate visual feedback in the editor.
            - **Spelling:** Red
            - **Grammar:** Blue
            - **Style:** Green
    - [ ] **2. Implement Color-Coded Badges:**
        - [ ] In `EnhancedSuggestionsPanel.tsx`, replace the plain text category display with the `Badge` component from `components/ui/badge.tsx`.
        - [ ] Add color variants to the `Badge` component that correspond to the suggestion categories (Red for Spelling, Blue for Grammar, Green for Style).
    - [ ] **3. Implement Suggestion De-duplication:**
        - [ ] In `services/analysis/engine.ts`, add logic to filter out duplicate or overlapping suggestions from different analyzers before they are sent to the UI. A suggestion with a higher severity should take precedence.

- [ ] **Phase 4: Implement Interactive Highlighting**
    - [ ] **4. Lift Editor State:** This is a critical architectural change.
        - [ ] In `app/doc/[id]/page.tsx`, initialize the Tiptap `useEditor` hook.
        - [ ] Pass the `editor` instance down to the `BlogEditor` component.
        - [ ] Pass the `editor` instance to the `RightPanel` (likely via `AppLayout` or a new context).
    - [ ] **5. Create Shared Hover State:**
        - [ ] In `contexts/SuggestionContext.tsx`, add state for `activeSuggestionId: string | null`.
        - [ ] Add `setActiveSuggestionId` and `clearActiveSuggestionId` functions to the context.
    - [ ] **6. Connect Editor and Panel to Shared State:**
        - [ ] In `EnhancedGrammarDecoration.tsx`, add `mouseover` and `mouseout` event handlers to the decorations. These handlers will call `setActiveSuggestionId` and `clearActiveSuggestionId` from the context.
        - [ ] In `EnhancedSuggestionsPanel.tsx`, add `onMouseEnter` and `onMouseLeave` props to the suggestion card's container (`motion.div`). These will also update the shared state.
        - [ ] Conditionally apply a highlight style (e.g., a different background color or border) to both the editor underline and the suggestion card when their corresponding suggestion ID matches the `activeSuggestionId`.
    - [ ] **7. Implement Auto-Scrolling:**
        - [ ] In `EnhancedSuggestionsPanel.tsx`, create a `useEffect` hook that observes changes to `activeSuggestionId`.
        - [ ] When `activeSuggestionId` changes, find the corresponding suggestion card in the DOM.
        - [ ] Use `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` to automatically bring the active card into view if it's not already visible.

- [ ] **Phase 5: Validation & Finalization**
    - [ ] **8. Testing and Validation:**
        - [ ] Test that all new UI features (colored underlines, badges, hover highlighting, auto-scrolling) work as expected.
        - [ ] Confirm that all previous functionality (spelling, style, grammar checks) continues to work without regression.
    - [ ] **9. Code Quality Checks:**
        - [ ] Run `bun lint`, `bun typecheck`, and `bun run build` to ensure no new issues have been introduced.
    - [ ] **10. Final Documentation:**
        - [ ] Update this sprint document with a session summary and file change log upon completion.

---

## Decisions

*   The initial backend work for style and grammar checks was completed successfully.
*   Work began on enhancing the UI/UX, but revealed architectural limitations, specifically the need for shared state between the editor and the side panel.
*   A plan has been formulated to lift the Tiptap editor state to a higher-level component (`app/doc/[id]/page.tsx`) to enable two-way data binding for interactive features.
*   A clear color-coding scheme will be used for suggestions: **Red** (Spelling), **Blue** (Grammar), and **Green** (Style).

---

## Session Summary
*(To be filled out upon completion of the sprint)* 