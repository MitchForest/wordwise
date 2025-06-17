# WordWise Local-First Refactor Plan

## Overview

This document outlines the step-by-step plan to refactor the WordWise analysis engine to a simpler, more robust, and local-first architecture. We will follow the principles laid out in `docs/suggestions.md`, focusing on one layer at a time to ensure stability and maintainability.

**Guiding Principles:**
- **Local First:** All instant and common checks will happen on-device with no API calls.
- **Simplicity:** We will ruthlessly remove unnecessary complexity and dead code.
- **One-Way Data Flow:** State will flow from a central hook, to a context, to the UI components.
- **Incremental Implementation:** We will build and test one feature at a time.

---

## Phase 0: Foundation & Cleanup

**Goal:** Rip out the old, complex wiring and lay the foundation for the new architecture. We will have a running app with no suggestions, but a clean data pipeline ready for features.

- [ ] **1. Purge Old Implementation:**
    - [ ] Delete `hooks/useOptimizedAnalysis.ts`.
    - [ ] Remove suggestion-related props and callbacks from `RightPanel.tsx` and `BlogEditor.tsx`.
    - [ ] Delete `services/analysis/spell-check-client.ts` as we will build a proper service.

- [ ] **2. Create New Analysis Skeletons:**
    - [ ] Create `services/analysis/engine.ts` and implement the empty `UnifiedAnalysisEngine` class structure from `suggestions.md`.
    - [ ] Create `hooks/useUnifiedAnalysis.ts` with the new hook structure, but have it return empty arrays for now.

- [ ] **3. Implement Centralized State:**
    - [ ] Create/update `contexts/SuggestionContext.tsx` to hold `suggestions`, `metrics`, `applySuggestion`, and `ignoreSuggestion`.
    - [ ] Create a `SuggestionProvider` that wraps the editor layout.

- [ ] **4. Wire Up the New Architecture:**
    - [ ] In `BlogEditor.tsx`, call the new `useUnifiedAnalysis` hook.
    - [ ] The `SuggestionProvider` should get its values from the hook.
    - [ ] Update `EnhancedSuggestionsPanel.tsx` to consume `SuggestionContext`.
    - [ ] Update `EnhancedGrammarDecoration.tsx` to consume `SuggestionContext`.

**✅ Success Criteria for Phase 0:** The application runs without errors. Typing in the editor does nothing yet, but the new data flow structure is fully in place.

---

## Phase 1: Spelling Implementation (Core MVP)

**Goal:** Implement the single most important feature: instant, local spell checking.

- [ ] **1. Create Spell Check Service:**
    - [ ] Create `services/analysis/spellcheck.ts`.
    - [ ] Integrate `nspell` and `dictionary-en`. Use a singleton pattern to ensure the dictionary is loaded only once.
    - [ ] Implement `check()` and `suggest()` methods.

- [ ] **2. Integrate into Analysis Engine:**
    - [ ] In `AnalysisEngine`, import the `SpellChecker` service.
    - [ ] Implement the `runInstantChecks` method to call the spell checker on the last typed word.

- [ ] **3. Implement Suggestion Conversion:**
    - [ ] In `useUnifiedAnalysis`, create a function to convert the `nspell` output into the `UnifiedSuggestion` format.
    - [ ] Pass the converted suggestions to the `SuggestionContext`.

- [ ] **4. Test End-to-End:**
    - [ ] Verify that typing a misspelled word adds a decoration.
    - [ ] Verify the suggestion appears in the `SuggestionsPanel`.
    - [ ] Verify that clicking the "Accept" action corrects the word in the editor.

**✅ Success Criteria for Phase 1:** The "One Job" MVP is complete and works flawlessly. The app provides real value with zero API calls.

---

## Phase 2: Style & Basic Grammar

**Goal:** Layer in more advanced local checks for style and common grammatical errors.

- [ ] **1. Create Style Check Service:**
    - [ ] Create `services/analysis/style.ts`.
    - [ ] Wrap the `write-good` library to check for passive voice, weasel words, etc.

- [ ] **2. Implement Sentence-Level Checks:**
    - [ ] In `AnalysisEngine`, implement `runSentenceChecks`.
    - [ ] In `useUnifiedAnalysis`, call this method on a 500ms debounce after a sentence-ending character is typed.

- [ ] **3. Create Basic Grammar Service:**
    - [ ] In `services/analysis/basic-grammar.ts`, add rules for repeated words and punctuation issues.
    - [ ] Integrate these checks into the appropriate timing tier in the `AnalysisEngine`.

- [ ] **4. Test New Categories:**
    - [ ] Verify style and grammar suggestions appear in the panel with the correct category.
    - [ ] Ensure they don't interfere with spelling checks.

**✅ Success Criteria for Phase 2:** The editor provides a robust set of local suggestions, covering spelling, style, and basic grammar.

---

## Phase 3: Deep Analysis & API Integration

**Goal:** Re-integrate the LanguageTool API as a progressive enhancement for deep grammar checks.

- [ ] **1. Isolate API Calls:**
    - [ ] Ensure all LanguageTool logic is confined to `services/languagetool.ts` and only called from `runDeepChecks`.

- [ ] **2. Implement Deep Checks:**
    - [ ] In `AnalysisEngine`, implement `runDeepChecks`.
    - [ ] In `useUnifiedAnalysis`, call this on a long debounce (e.g., 2-3 seconds) after the user stops typing.

- [ ] **3. Test the Full Three-Tier System:**
    - [ ] Verify local checks are instant.
    - [ ] Verify deep checks happen after a pause.
    - [ ] Verify the system works offline (local checks only).
    - [ ] Test the API fallback gracefully.

**✅ Success Criteria for Phase 3:** The app now has a powerful three-tier analysis system that is both fast and intelligent.

---

## Phase 4: Polish & Finalize

**Goal:** Clean up, re-integrate secondary UI, and ensure the application is production-ready.

- [ ] **1. Re-implement Status Bar:**
    - [ ] Connect the `EditorStatusBar` to the `metrics` data from the `useUnifiedAnalysis` hook.

- [ ] **2. Final Performance & UX Review:**
    - [ ] Test with very large documents.
    - [ ] Add keyboard navigation to the suggestions panel.
    - [ ] Ensure all animations are smooth.

- [ ] **3. Code Cleanup:**
    - [ ] Remove all `console.log` statements.
    - [ ] Add documentation for the new services and hooks.

**✅ Success Criteria for Phase 4:** The MVP is feature-complete, performant, stable, and well-documented. 