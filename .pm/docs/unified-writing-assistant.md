# WordWise Unified Writing Assistant: System Reference

## 1. Vision & Architecture

### Guiding Principles
The WordWise analysis engine is built on a foundation of simplicity, robustness, and progressive enhancement. Our development is guided by these core principles:

- **Local First:** The most critical analysis (spelling, basic grammar, style) happens entirely on-device. The assistant is valuable even when offline and makes zero initial API calls.
- **Simplicity & One-Way Data Flow:** We follow a strict one-way data flow: `Hook → Context → UI Components`. This eliminates complex prop-drilling and state management issues, making the system predictable and easy to debug.
- **Progressive Enhancement:** More advanced features (like deep grammar analysis via APIs) are layered on top of the local-first foundation. The system gracefully degrades if APIs are unavailable, ensuring the user experience is never broken.

### System Architecture
The architecture is designed around a three-tier timing system that balances responsiveness with analytical depth.

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Types in Editor                     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Unified Analysis Engine                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Timing Controller                        │   │
│  │  • Instant (~0ms): After each word (Spelling)             │   │
│  │  • Fast (~500ms): After sentence (Style, Basic Grammar)   │   │
│  │  • Deep (~2-3s): After pause (API checks, Document Metrics)│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  Local Analyzers  │  │   API Analyzer   │  │   Document   │ │
│  │                  │  │                  │  │   Analyzer   │ │
│  │ • nspell         │  │ • LanguageTool   │  │ • Readability│ │
│  │ • write-good     │  │   (if available) │  │ • SEO Score  │ │
│  │ • Basic Grammar  │  │                  │  │ • Read Time  │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Suggestion Context                            │
│  • Manages `suggestions`, `metrics`, `apply`, `ignore`          │
│  • Provides state to all consumer components                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      UI Components                               │
│  • Editor decorations (underlines)                              │
│  • EnhancedSuggestionsPanel                                     │
│  • EditorStatusBar                                              │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Unified Data Structure

To ensure consistency and simplicity, every analysis service—whether local or remote—must convert its results into a `UnifiedSuggestion` object. This is the single source of truth for what is shown to the user.

```typescript
interface UnifiedSuggestion {
  // Unique identifier, e.g., "spell-142-writting"
  id: string;

  // The service that generated the suggestion
  source: 'spelling' | 'grammar' | 'style' | 'readability' | 'seo' | 'languagetool';
  
  // The severity of the issue
  severity: 'error' | 'warning' | 'info';

  // A user-friendly category name, e.g., "Spelling", "Passive Voice"
  category: string;              

  // The exact position in the editor's document
  position: {
    start: number;
    end: number;
  };

  // The message explaining the suggestion
  message: string;
  
  // A list of possible text replacements
  suggestions: string[];

  // Internal state tracking
  ignored?: boolean;
}
```

## 3. Tooling & Services

The engine integrates a suite of specialized libraries and services, each responsible for one aspect of analysis.

-   **Spelling:** `nspell` with `dictionary-en` for fast, local spell-checking.
-   **Style:** `write-good` for detecting passive voice, weasel words, and clichés.
-   **Basic Grammar:** Custom, rule-based checks for issues like repeated words or incorrect punctuation.
-   **Advanced Grammar:** The `LanguageTool API` provides deep, contextual grammar analysis as a progressive enhancement.
-   **Readability Metrics:** `text-readability` and `reading-time` for calculating scores and estimated reading time.
-   **SEO Analysis:** `keyword-extractor` and custom rules for on-page SEO optimization suggestions.

## 4. Implementation Plan

We are implementing the Unified Writing Assistant through a series of focused epics and sprints.

---

### **Epic 1: Local-First Analysis Engine**

**Goal:** Build a robust, client-side analysis engine that provides significant value without any server-side APIs.

-   **Sprint 001: Foundation & Cleanup** (✅ Completed)
    -   *Result:* Old analysis logic removed. New `Hook → Context → UI` data flow established. Skeletons for the new engine and hook are in place.

-   **Sprint 002: Local Spelling Implementation** (✅ Completed)
    -   *Result:* The `nspell` service is integrated. Users receive real-time spelling suggestions with wavy red underlines, and can apply or ignore them.

-   **Sprint 003: Local Style & Basic Grammar** (Next Up)
    -   *Goal:* Implement non-spelling-related local checks.
    -   *Tasks:*
        1.  Create `services/analysis/style.ts` and integrate the `write-good` library.
        2.  Create `services/analysis/basic-grammar.ts` to handle rule-based checks (e.g., repeated words).
        3.  Integrate these services into the `UnifiedAnalysisEngine` on the "fast" (~500ms) check tier.
        4.  Ensure new suggestion types render correctly in the UI.

-   **Sprint 004: UI Polish & Document Metrics**
    -   *Goal:* Refine the UI and provide high-level document feedback.
    -   *Tasks:*
        1.  Integrate `text-readability` and `reading-time` into the engine's "deep" check tier.
        2.  Re-implement the `EditorStatusBar` to display error counts and key document metrics.
        3.  Review and enhance the UX of the suggestions panel.

---

### **Epic 2: Advanced Analysis & Progressive Enhancement**

**Goal:** Layer in powerful, "deep" analysis that requires API calls or more significant processing, while ensuring the app remains fast and functional offline.

-   **Sprint 005: LanguageTool Integration**
    -   *Goal:* Integrate the LanguageTool API for advanced grammar checking.
    *   *Tasks:*
        1.  Create `services/languagetool.ts` with a clean, isolated implementation.
        2.  Integrate it into the `UnifiedAnalysisEngine` as a "deep check" on a long debounce (~2-3 seconds).
        3.  Implement graceful fallback so the app works perfectly if the API is unavailable.

-   **Sprint 006: SEO Analysis Service**
    -   *Goal:* Provide writers with tools to optimize their content for search engines.
    -   *Tasks:*
        1.  Create an `SEOService` using `keyword-extractor` and other tools.
        2.  Implement checks for keyword density, title length, meta description, etc.
        3.  Add UI elements to `SEOSettings.tsx` to manage SEO targets.
        4.  Display SEO suggestions and a score in the UI.
