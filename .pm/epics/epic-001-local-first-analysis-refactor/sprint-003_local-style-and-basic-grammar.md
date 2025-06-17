# Sprint 003: Local Style & Basic Grammar

**Status:** In Progress
**Epic:** 001 - Local-First Analysis Refactor
**Date Started:** 2024-05-24

## Goal
The goal of this sprint is to expand our local-first analysis capabilities beyond spelling by implementing style suggestions and basic grammar checks. This will be achieved by integrating the `write-good` library and creating a custom service for simple, rule-based checks, while refactoring the engine to support a tiered analysis architecture.

## Plan

- [ ] **Phase 1: Architectural Refactor & Tech Debt**
    - [ ] **1. Refactor `UnifiedAnalysisEngine` (`engine.ts`) to be Tier-Aware:**
        - [ ] Modify the main `run()` method to orchestrate calls to tiered methods (`runInstantChecks`, `runFastChecks`).
        - [ ] Move the existing spell-check logic from the main `run()` method into `runInstantChecks()`.
        - [ ] Ensure the engine aggregates suggestions from all tiers correctly.
    - [ ] **2. Install `write-good` Dependency:**
        - [ ] Add `write-good` and its type definitions (`@types/write-good`) to the project's `devDependencies`.
    - [ ] **3. Update Documentation:**
        - [ ] In `.pm/docs/unified-writing-assistant.md`, update the `UnifiedSuggestion` interface to match the canonical definition in `types/suggestions.ts`.

- [ ] **Phase 2: Implement Analysis Services**
    - [ ] **4. Implement `StyleService`:**
        - [ ] Completely refactor the placeholder file at `services/analysis/style.ts`.
        - [ ] Create a `StyleAnalyzer` class with a `run(doc: any)` method.
        - [ ] The method will use `doc.descendants` to iterate through text nodes.
        - [ ] For each node, it will execute `write-good`, mapping its findings to the `UnifiedSuggestion` format (category: `'style'`, severity: `'suggestion'`). Each suggestion will include actionable fixes.
    - [ ] **5. Create and Implement `BasicGrammarService`:**
        - [ ] Create a new file at `services/analysis/basic-grammar.ts`.
        - [ ] Implement a `BasicGrammarChecker` class with a `run(doc: any)` method.
        - [ ] Add a rule to detect and suggest corrections for repeated words (e.g., "the the").
        - [ ] Ensure the service returns suggestions in the `UnifiedSuggestion` format (category: `'grammar'`, severity: `'warning'`).

- [ ] **Phase 3: Integration & Hook Updates**
    - [ ] **6. Integrate New Services into the Engine:**
        - [ ] In `services/analysis/engine.ts`, import and instantiate the new `StyleAnalyzer` and `BasicGrammarChecker`.
        - [ ] Call both new analyzers within the `runFastChecks()` method.
    - [ ] **7. Update `useUnifiedAnalysis` Hook:**
        - [ ] Refactor the hook to use the new tiered engine methods.
        - [ ] Use `useDebouncedCallback` to trigger `runFastChecks` on a ~500ms delay.
        - [ ] Continue to run `runInstantChecks` on the existing, shorter debounce.
        - [ ] Ensure suggestions from all tiers are correctly merged and set in the `SuggestionContext`.

- [ ] **Phase 4: Validation & Finalization**
    - [ ] **8. Testing and Validation:**
        - [ ] Test that passive voice and repeated-word suggestions appear and can be applied correctly.
        - [ ] Confirm that spelling suggestions continue to work without regression.
    - [ ] **9. Code Quality Checks:**
        - [ ] Run `bun lint`, `bun typecheck`, and `bun run build` to ensure no new issues have been introduced.
    - [ ] **10. Final Documentation:**
        - [ ] Update this sprint document with a session summary and file change log upon completion.

---

## Decisions

*   The initial plan was updated to incorporate a tiered analysis architecture (`instant`, `fast`, `deep`) as outlined in the project documentation, which required refactoring the `UnifiedAnalysisEngine`.
*   The `useAnalysis.ts` hook was identified as obsolete technical debt and was deleted. The UI components relying on it were refactored to use the new context-based architecture.
*   The `UnifiedSuggestion` interface definition in the project documentation (`unified-writing-assistant.md`) was updated to match the canonical, in-code definition from `types/suggestions.ts` to resolve inconsistency.

---

## Session Summary

**Completed:**
- We successfully refactored the `UnifiedAnalysisEngine` to support tiered analysis.
- A new `StyleAnalyzer` service using `write-good` was implemented and integrated.
- A new `BasicGrammarChecker` service was implemented with a rule for repeated words.
- The `useUnifiedAnalysis` hook was updated to orchestrate the new "instant" and "fast" analysis tiers.
- Significant technical debt was removed by deleting the old `useAnalysis.ts` hook and refactoring dependent components.
- All type and linting errors were resolved, and the project builds successfully.

**Files Changed:**
- `modified: services/analysis/engine.ts`
- `created: services/analysis/style.ts` (after being refactored from a placeholder)
- `created: services/analysis/basic-grammar.ts`
- `modified: hooks/useUnifiedAnalysis.ts`
- `deleted: hooks/useAnalysis.ts`
- `modified: components/panels/RightPanel.tsx`
- `modified: .pm/docs/unified-writing-assistant.md`

**Remaining:**
- None. This sprint is complete. 