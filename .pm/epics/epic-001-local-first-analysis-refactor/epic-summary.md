# Epic 1: Local-First Analysis Refactor

**Description:** This epic covers the full architectural refactor of the analysis engine to a "local-first" model. The goal is to improve application performance, reduce architectural complexity, and lower operational costs by moving spell-checking and other forms of analysis to the client-side.

---

### Feature Sprints

1.  **Sprint 1: Foundation & Cleanup:** Establish the new architectural foundation, including creating the unified context, hook, and engine skeletons, and removing the old, complex prop-drilling logic.
2.  **Sprint 2: Local Spelling Implementation:** Implement client-side spell checking using `nspell`.
3.  **Sprint 3: Local Style & Basic Grammar:** Integrate basic grammar and style suggestions that can run locally in the browser.
4.  **Sprint 4: Deep Analysis & API Integration:** Re-integrate server-side analysis for more complex checks (e.g., SEO, readability) through a simplified API, layering them on top of the local suggestions.
5.  **Sprint 5: Polish & Final Review:** Polish the user interface, optimize performance, and conduct a final review of the new architecture.

---

### Epic-Level Notes

*   The primary architectural pattern is `Hook -> Context -> UI Components` for a clean, one-way data flow.
*   We will use `nspell` for local spell-checking.
*   All client-side analysis logic will be consolidated within the `useUnifiedAnalysis` hook and the `AnalysisEngine` service. 