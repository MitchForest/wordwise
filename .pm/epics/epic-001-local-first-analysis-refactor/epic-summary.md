# Epic 1: Local-First Analysis Refactor

**Description:** This epic covers the full architectural refactor of the analysis engine to a "local-first" model. The goal is to improve application performance, reduce architectural complexity, and lower operational costs by moving the core analysis to the client-side.

---

### Feature Sprints

1.  **Sprint 001: Foundation & Cleanup:** (✅ Completed) Establish the new architectural foundation, including creating the unified context, hook, and engine skeletons, and removing the old, complex prop-drilling logic.
2.  **Sprint 002: Local Spelling Implementation:** (✅ Completed) Implement client-side spell checking using `nspell`.
3.  **Sprint 003: Local Style & Basic Grammar:** (Next Up) Integrate basic grammar and style suggestions that can run locally in the browser using `write-good` and other rule-based checkers.
4.  **Sprint 004: UI Polish & Document Metrics:** Refine the UI, re-implement the status bar, and add document-level metrics like readability and reading time to complete the local-first feature set.

---

### Epic-Level Notes

*   The primary architectural pattern is `Hook -> Context -> UI Components` for a clean, one-way data flow.
*   We will use `nspell` for local spell-checking.
*   All client-side analysis logic will be consolidated within the `useUnifiedAnalysis` hook and the `UnifiedAnalysisEngine` service. 