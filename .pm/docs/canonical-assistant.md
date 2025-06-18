# WordWise Writing Assistant: Canonical System Reference

## 1. Vision & Architecture

### Guiding Principles
The WordWise assistant is architected around three core principles that ensure a seamless and intelligent user experience:

1.  **Responsiveness over Raw Power:** The perceived performance of the assistant is paramount. Our architecture prioritizes delivering the right feedback at the right time. We use a multi-tiered system to ensure that fast, simple checks are never blocked by slower, more complex analysis.
2.  **Clarity and User Agency:** The assistant's feedback must be clear, actionable, and understandable. The user should always feel in control, with the system acting as an intelligent partner, not an intrusive critic.
3.  **Server-Side Intelligence:** To provide deep analysis without compromising client-side performance, the heavy lifting is done on the server. The client is a lightweight "sensor" that sends context to our powerful server-side engine.

### System Architecture
Our architecture is a **server-side, multi-tiered, context-aware system**. The client-side editor detects user actions (like typing a space or a period) and makes requests to a suite of specialized, lightweight API endpoints. This allows the server to run the appropriate level of analysis without a monolithic, slow API call.

```mermaid
graph TD
    subgraph Client-Side (Browser)
        A[BlogEditor Component] -- User Action --> B{useUnifiedAnalysis Hook};
        B -- Tier 0: on space/punct --> C1[fetch('/api/analysis/spell')];
        B -- Tier 1: on sentence end --> C2[fetch('/api/analysis/fast')];
        B -- Tier 2: on idle --> C3[fetch('/api/analysis/deep')];
        C1 & C2 & C3 --> D{SuggestionContext};
        D --> E[UI Components <br/>(Underlines, Panels, Status Bar)];
    end

    subgraph Server-Side (API)
        F[API Routes]
        subgraph Endpoints
            G1[/api/analysis/spell];
            G2[/api/analysis/fast];
            G3[/api/analysis/deep];
        end
        F -- uses --> H[UnifiedAnalysisEngine];
        H -- uses --> I[Analysis Toolbox];
    end

    C1 --> G1;
    C2 --> G2;
    C3 --> G3;
```

---

## 2. The Multi-Tiered Trigger System

This is the core of our responsiveness strategy. Instead of a single "stop-typing" debounce, we use different triggers for different types of analysis.

| Tier      | Analysis Focus        | Trigger(s)                                   | User Experience                                                                       |
| :-------- | :-------------------- | :------------------------------------------- | :------------------------------------------------------------------------------------ |
| **Tier 0** | **Spelling**          | On Word Boundary (space, punctuation)        | "Instant" feedback. A word is marked as misspelled the moment it's completed.         |
| **Tier 1** | **Style & Grammar**   | 1. On Sentence End ('.', '!', '?')<br/>2. Short Debounce (800ms) | "Rapid" feedback. Suggestions appear at natural cognitive breaks (end of sentence). |
| **Tier 2** | **SEO & Readability** | 1. On Relevant Change (title, meta)<br/>2. Medium Debounce (2000ms) | "Passive" updates. Metrics update quietly in the background without distraction.  |
| **Tier 3** | **Word Count**        | On Document Change                         | "Live" update. The most basic metric, always up-to-date.                           |

---

## 3. The Analysis Toolbox & Services

All analysis logic is modular and contained within our server-side `UnifiedAnalysisEngine` (`services/analysis/engine.ts`), which uses a suite of specialized tools.

#### Spelling (Tier 0)
- **Purpose:** Fast, on-device spell-checking.
- **Service File:** `services/analysis/spellcheck.ts`
- **Core Library:** `nspell`
- **How it Works:** Uses `nspell` with an English dictionary to check individual words. The engine maintains a set of custom words (e.g., "WordWise", "SEO") to prevent false positives.

#### Style & Basic Grammar (Tier 1)
- **Purpose:** Detects common style issues and basic grammar errors.
- **Service Files:** 
  - `services/analysis/style.ts`
  - `services/analysis/basic-grammar.ts`
- **Core Library:** `write-good`
- **How it Works:** The `style.ts` service leverages `write-good` to find passive voice, weasel words, and clichés. The `basic-grammar.ts` service contains custom rules to detect issues like repeated words.

#### SEO Analysis (Tier 2)
- **Purpose:** Provides actionable feedback to help writers optimize content for search engines.
- **Service File:** `services/analysis/seo.ts`
- **Core Library:** Custom Rules (No external library)
- **How it Works:** The service runs a series of checks on the document's content and metadata (title, meta description). It checks for the presence and optimal length of the title and meta description, and verifies the target keyword is used appropriately.

#### Readability & Document Metrics (Tier 2 & 3)
- **Purpose:** Calculates quantitative metrics about the document.
- **Service File:** `services/analysis/metrics.ts`
- **Core Libraries:**
  - `text-readability`
  - `reading-time`
- **How it Works:**
    - **Readability (Tier 2):** Uses the `text-readability` library to calculate the Flesch-Kincaid grade level and other standard readability scores. This is part of the "deep" analysis.
    - **Word Count & Reading Time (Tier 3):** Uses simple text splitting and the `reading-time` library to provide live updates to the most basic document stats.

---

## 4. The Unified Suggestion System

To ensure consistency, every analyzer, regardless of its function, must produce a standardized `UnifiedSuggestion` object. This creates a predictable data structure that the entire UI can reliably consume.

### Data Structure
```typescript
export interface SuggestionAction {
  label: string;
  type: 'fix' | 'highlight' | 'explain' | 'ignore' | 'navigate';
  value?: string; // The replacement text for a 'fix' action
}

export interface UnifiedSuggestion {
  id: string; // A canonical ID, e.g., "spelling:10:15"
  category: 'grammar' | 'spelling' | 'readability' | 'seo' | 'style';
  severity: 'error' | 'warning' | 'info' | 'suggestion';
  title: string;
  message: string;
  position: { start: number; end: number; };
  context: { text: string; }; // The text that is incorrect
  actions: SuggestionAction[];
}
```

### Data Flow: From Analysis to User
1.  **Creation:** An analyzer (e.g., `SpellChecker`) finds an issue and uses a factory function (`lib/editor/suggestion-factory.ts`) to create a valid `UnifiedSuggestion` object.
2.  **Transmission:** The `UnifiedAnalysisEngine` collects these suggestions and they are sent from the relevant API endpoint (e.g., `/api/analysis/fast`) to the client.
3.  **Orchestration:** The `useUnifiedAnalysis` hook receives the suggestions.
4.  **State Management:** The hook places the suggestions into our central state manager, the `SuggestionContext` (`contexts/SuggestionContext.tsx`), using either `setSuggestions` (to replace) or `addSuggestions` (to merge).
5.  **Consumption & Rendering:** UI components listen for changes to the `SuggestionContext`.
    - `EnhancedGrammarDecoration.tsx` reads the suggestions to draw the wavy underlines in the editor.
    - `EnhancedSuggestionsPanel.tsx` reads the suggestions to display the list of cards.

---

## 5. Implementation Status

This document reflects the architecture implemented as of Sprint 005.

- **Current Sprint:** `sprint-005-multi-tiered-analysis-and-responsive-status-bar.md`
- **Current Focus:** Fully implementing the multi-tiered trigger system, redesigning the `EditorStatusBar` with granular metrics, and completing the `SEOAnalyzer` service.
- **Next Steps:** Once the new system is fully implemented and tested, the final task of Sprint 005 is to conduct a full review of all user-facing documentation and guides to ensure they align with this new, more responsive experience.
