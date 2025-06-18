# WordWise Writing Assistant: Canonical System Reference

## 1. Vision & Architecture

### Guiding Principles
The WordWise assistant is architected around three core principles that ensure a seamless and intelligent user experience:

1.  **Responsiveness over Raw Power:** The perceived performance of the assistant is paramount. Our architecture prioritizes delivering the right feedback at the right time. We achieve this through a sophisticated event-driven system that runs different analyses based on specific user actions.
2.  **Clarity and User Agency:** The assistant's feedback must be clear, actionable, and understandable. The user should always feel in control, with the system acting as an intelligent partner, not an intrusive critic.
3.  **Server-Side Intelligence, Client-Side Agility:** To provide deep analysis without compromising client-side performance, the heavy lifting is done on the server. The client is a lightweight "sensor" that sends context to our powerful server-side engine for deep analysis, while handling instantaneous tasks like word count locally.

### System Architecture: Event-Driven Analysis
Our architecture is a **server-side, event-driven, context-aware system**. The client-side editor detects specific user actions and triggers one of four distinct analysis events. This model avoids a slow, monolithic analysis and ensures the user receives the most relevant feedback with the appropriate urgency.

```mermaid
graph TD
    subgraph Client-Side (Browser)
        A[User Action in Editor] -- Triggers --> B{useUnifiedAnalysis Hook};
        B -- on every keystroke --> B1[Live Client Metrics];
        B -- on word boundary --> B2[API Call: Real-time Spell Check];
        B -- on 400ms idle --> B3[API Call: Fast Analysis Bundle];
        B -- on 800ms idle --> B4[API Call: Deep Analysis Bundle];

        subgraph State Management & UI
          C{SuggestionContext};
          D[UI Components <br/>(Underlines, Panels, Status Bar)];
        end
        
        B1 & B2 & B3 & B4 --> C;
        C --> D;
    end

    subgraph Server-Side (API)
        E[API Routes]
        subgraph Endpoints
            F1[/api/analysis/spell];
            F2[/api/analysis/fast];
            F3[/api/analysis/deep];
        end
        E -- uses --> G[UnifiedAnalysisEngine];
        G -- uses --> H[Analysis Toolbox];
    end

    B2 --> F1;
    B3 --> F2;
    B4 --> F3;
```

---

## 2. The Four Analysis Events

This is the core of our responsiveness strategy. The outdated "Tier" model is deprecated; the system is best understood as four distinct events triggered by user actions.

| Event Name | What It Checks | How It's Triggered | The "Why" (Design Rationale) |
| :--- | :--- | :--- | :--- |
| **1. Live Client Metrics** | **Word Count** only. | **Instantly, on every keystroke.** | This is a pure client-side calculation in `useUnifiedAnalysis.ts`. It's decoupled from the server to give you the most critical metric with zero delay. It feels "live" because it is. |
| **2. Real-time Spell Check** | **A single word** for spelling errors. | **On word boundaries** (when you type a space or punctuation). | This is a lightweight, targeted server check (`/api/analysis/spell`). Its purpose is to create the *feeling* of instant, as-you-type spell check without the delay of the larger analysis bundles. |
| **3. "Fast" Analysis Bundle** | **Full-document check** for:<br/>- Spelling<br/>- Grammar<br/>- Style | **~400ms after you stop typing.** | This is a debounced server check (`/api/analysis/fast`) that bundles together all the core language mechanics. It runs quickly after a natural pause to give you feedback on the sentences you've just written. |
| **4. "Deep" Analysis Bundle** | **Full-document check** for:<br/>- SEO metrics & suggestions<br/>- Readability Level<br/>- Reading Time | **~800ms after you stop typing.** | This is a slower debounced server check (`/api/analysis/deep`) for holistic, document-wide insights. These metrics are less urgent, so we wait a bit longer to avoid distracting you while you're in a writing flow. |

---

## 3. The Analysis Toolbox & Services

All server-side analysis logic is modular and contained within our `UnifiedAnalysisEngine` (`services/analysis/engine.ts`).

#### Spelling
- **Purpose:** Fast, word-by-word and full-document spell-checking.
- **Service File:** `services/analysis/spellcheck.ts`
- **Core Library:** `nspell`
- **How it Works:** This service is used in two events:
    1.  **Real-time Spell Check:** Checks a single word.
    2.  **Fast Analysis Bundle:** Checks the entire document to catch pasted text or other complex changes.

#### Style & Basic Grammar
- **Purpose:** Detects common style issues and basic grammar errors.
- **Service Files:** `services/analysis/style.ts`, `services/analysis/basic-grammar.ts`
- **Core Library:** `write-good`
- **How it Works:** These services run as part of the **Fast Analysis Bundle**, leveraging `write-good` to find passive voice, weasel words, clichés, and custom rules for issues like repeated words.

#### SEO Analysis
- **Purpose:** Provides actionable feedback to help writers optimize content for search engines.
- **Service File:** `services/analysis/seo.ts`
- **Core Library:** Custom Rules
- **How it Works:** Runs a series of checks on the document's content and metadata as part of the **Deep Analysis Bundle**. It checks for the presence and optimal length of the title and meta description, and verifies the target keyword is used appropriately.

#### Document Metrics
- **Purpose:** Calculates quantitative metrics about the document.
- **Service File:** `services/analysis/metrics.ts`
- **Core Libraries:** `text-statistics`, `reading-time`
- **How it Works:** This service is used in two different ways:
    1.  **Live Client Metrics:** The **word count** is calculated instantly on the client inside `useUnifiedAnalysis.ts` on every keystroke.
    2.  **Deep Analysis Bundle:** **Reading Time** and **Readability** (Flesch-Kincaid Grade Level via `text-statistics`) are calculated on the server and sent back to the client. The `SuggestionContext` intelligently merges these with the live word count.

---

## 4. The Unified Suggestion System

To ensure a stable and predictable experience, the suggestion system has two key architectural components: **Essence-Based IDs** and a **Reconciliation Window**.

### Essence-Based IDs
To prevent React key collisions and UI "jumping" as the document changes, every suggestion has a highly stable ID. Instead of being based on position (which is fragile), the ID is a hash of the suggestion's "essence."

-   **ID Format:** `hash(ruleId + originalText)`
-   `ruleId`: A hardcoded identifier for the specific check (e.g., `repeated-word`).
-   `originalText`: The exact text that was flagged (e.g., "the the").

This ensures that a suggestion's identity persists across re-renders, even if its position in the document changes. This is created in `lib/editor/suggestion-factory.ts`.

### The Reconciliation Window: Solving the UI "Bounce"
With four different analysis events sending results at different times, a robust state management strategy is critical to prevent UI instability.

-   **The Problem:** Applying a fix would trigger multiple, asynchronous re-analyses. Their results would arrive out of sync, causing the suggestion list to visibly "bounce" or re-order.
-   **The Solution:** The `SuggestionContext` now implements a **Reconciliation Window**.
    1.  When a user applies a suggestion, a **3-second global reconciliation window** opens.
    2.  During this window, all incoming analysis results are handled by a single, authoritative `updateSuggestions` function.
    3.  This function intelligently **preserves the existing order** of suggestions and **temporarily holds back any brand-new suggestions**.
    4.  After the 3-second window closes, the UI is considered stable, and any pending suggestions are added to the list in a single, non-jarring update.

This architecture ensures a fast, responsive, and visually stable user experience.

---

## 5. Implementation Status

This document reflects the architecture implemented at the conclusion of **Sprint 005**. The system is stable, and the event-driven model is fully realized. Future work should use this document as the canonical reference.
