# WordWise: Canonical Architecture & Tech Stack

This document outlines the technical architecture, core components, and key libraries that power the WordWise application.

## High-Level Architecture

WordWise is a modern web application built on a Jamstack architecture, leveraging a Next.js frontend and serverless functions for backend logic. The core philosophy is to perform as much work as possible on the client, falling back to server-side analysis for heavier tasks to ensure a fast, responsive user experience.

---

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (with App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **UI:** [React](https://react.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/)
- **Text Editor:** [Tiptap](https://tiptap.dev/)
- **Database:** [Supabase](https://supabase.com/) (Postgres) with [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication:** [better-auth](https://www.npmjs.com/package/better-auth)
- **Deployment:** [Vercel](https://vercel.com/)

---

## Core Sub-Systems

### 1. Analysis Engine

The analysis engine is the heart of WordWise. It operates on an event-driven, multi-tiered model to provide feedback without interrupting the user's flow.

- **Client-Side Metrics:** Word count and reading time are calculated instantly in the browser on every keystroke.
- **`fast` Analysis (~400ms debounce):**
    - **Triggered:** On short pauses in typing.
    - **Services:**
        - **Spell Check:** Utilizes `nspell` for fast, local dictionary lookups.
        - **Basic Grammar & Style:** Runs checks for common issues like passive voice and repeated words.
    - **API Endpoint:** `/api/analysis/fast`
- **`deep` Analysis (~800ms debounce):**
    - **Triggered:** On longer pauses, indicating a natural break in the writing process.
    - **Services:**
        - **Advanced Grammar/Style:** Full document analysis via the `languagetool-node` service.
        - **SEO Analysis:** Checks title, meta description, keyword density, and content structure.
        - **Readability Metrics:** Calculates the Flesch-Kincaid grade level.
    - **API Endpoint:** `/api/analysis/deep`

### 2. Caching Strategy

To ensure performance and reduce redundant computations, WordWise employs a multi-layered caching strategy.

- **`fast` & `deep` analysis results** are cached. The cache key is a hash of the document content, ensuring that we only re-run analysis when the text actually changes.

### 3. Data & State Management

- **State Management:** React Context (`SuggestionContext`) is the primary mechanism for managing global UI state, including the list of suggestions, metrics, and UI interaction states (e.g., hover).
- **Data Persistence:** User documents are saved to a Supabase Postgres database via Drizzle ORM.
- **Auto-Save:** Document changes are automatically debounced and saved to the database to prevent data loss.

### 4. AI Integration (Epic 2)

The future architecture for AI features will leverage a tool-calling system with Large Language Models (LLMs).

- **Model:** OpenAI GPT series (or similar).
- **Strategy:** The AI will not just generate text; it will be able to use the existing analysis services (Grammar, SEO, etc.) as "tools" to provide data-driven, verifiable improvement suggestions. This ensures that AI enhancements are accurate and align with the application's core logic. 