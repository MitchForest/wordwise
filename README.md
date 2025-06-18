# WordWise AI

A specialized writing assistant designed for blog owners who want to create SEO-optimized content that ranks well in search engines and engages readers.

## Overview

WordWise combines real-time grammar checking, SEO optimization, readability analysis, and AI-powered content enhancement into a single, streamlined platform. Unlike general-purpose writing tools, WordWise is specifically built for content creators who need to balance quality writing with search engine performance.

## The WordWise User: The Savvy Solopreneur

WordWise is built for **Alex**, an independent content creator running a niche blog. Alex is the writer, editor, SEO specialist, and publisher, juggling a passion for great content with the technical demands of growing an online business.

- **Goal**: To turn their blog into a primary income source by increasing organic traffic and building a loyal readership.
- **Pain Points**: The mental drain of switching between writing and SEO, writer's block disrupting publishing schedules, and the fear that small errors undermine their authority.

## Core Features: A User-Centric Approach

Our features are directly mapped to the core challenges of modern blogging.

### 1. Foundational Writing Assistance
> *"As a blogger, I need immediate, accurate feedback on my spelling, grammar, and writing style as I type, so I can be confident my final article is polished and professional."*

WordWise offers a multi-tiered analysis engine that provides instant feedback on everything from spelling and grammar to style, using clear, non-intrusive, color-coded underlines to help you fix issues with a single click.

### 2. Integrated SEO Optimization
> *"As a blogger, I need real-time SEO guidance directly within my editor, so I can optimize my content for search engines without breaking my writing flow."*

Get a live SEO score (0-100) and actionable suggestions based on target keyword usage, title and meta description optimization, and proper content structure, eliminating the need for separate, expensive SEO tools.

### 3. Seamless Publishing Workflow
> *"As a blogger, I want to publish my finished articles directly to my WordPress site from my editor, so I can eliminate tedious copy-pasting and formatting errors."*

Securely connect to your WordPress site and publish your articles directly from WordWise, preserving all formatting and metadata. (Coming in Sprint 6)

### 4. AI-Powered Content Polishing
> *"As a blogger, I want an AI partner that can intelligently review and enhance my writing for clarity, style, and impact, so I can elevate the quality of my content beyond basic corrections."*

Use the power of AI to improve your text cohesively. AI suggestions are SEO-aware and can enhance clarity, flow, and impact with a single click. (Planned for Epic 2)

### 5. Goal-Oriented AI Rewriting
> *"As a blogger, I want the ability to rewrite entire sections or posts with AI to match a specific goal, audience, or tone, so I can quickly adapt my content without starting from scratch."*

Instantly change the tone of your writing from "Professional" to "Conversational," simplify complex topics for a beginner audience, or rewrite a section to be more persuasive. (Planned for Epic 2)

### 6. AI-Assisted Content Creation
> *"As a blogger, I need help overcoming writer's block and generating new ideas, so I can maintain a consistent publishing schedule and keep my content pipeline full."*

Brainstorm topics, generate intelligent outlines from a single idea, expand a bullet point into a full paragraph, or craft a compelling introduction with our AI creation tools. (Planned for Epic 2)

## Technology Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **UI:** React
- **Text Editor:** Tiptap
- **Database:** Supabase (Postgres) with Drizzle ORM
- **Authentication:** better-auth
- **Styling:** Tailwind CSS with shadcn/ui components
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Bun (or Node.js 18+)
- Supabase account (for database)
- OpenAI API key
- LanguageTool API key (optional, for enhanced grammar checking)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/MitchForest/wordwise.git
    cd wordwise
    ```

2.  Install dependencies:
    ```bash
    bun install
    ```

3.  Set up environment variables:
    ```bash
    cp .env.example .env.local
    ```

4.  Configure your `.env.local` file:
    ```env
    # Database (Supabase)
    DATABASE_URL="your-supabase-postgres-connection-string"

    # Authentication (better-auth)
    BETTER_AUTH_SECRET="generate-a-secret"
    BETTER_AUTH_URL="http://localhost:3000"

    # OpenAI for AI features
    OPENAI_API_KEY="your-openai-api-key"

    # LanguageTool for grammar checking
    LANGUAGETOOL_API_KEY="your-languagetool-api-key"
    LANGUAGETOOL_API_URL="https://api.languagetoolplus.com/v2"

    # App URL
    NEXT_PUBLIC_APP_URL="http://localhost:3000"
    ```

5.  Run database migrations:
    ```bash
    bun run db:push
    ```

6.  Start the development server:
    ```bash
    bun run dev
    ```

7.  Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run db:push` - Push database schema changes
- `bun run db:studio` - Open Drizzle Studio for database management
- `bun run lint` - Run ESLint
- `bun run typecheck` - Run TypeScript type checking

## Competitive Advantages

**vs. Grammarly:**
- Integrated SEO optimization beyond just grammar.
- AI-powered content generation for blogs.

**vs. SEO Tools (Surfer, Clearscope):**
- Real-time grammar and style checking in an integrated writing environment.
- More affordable for individual creators.

**vs. AI Writing Tools (ChatGPT, Claude):**
- Purpose-built for SEO blog content with real-time scoring and feedback.
- Specialized, verifiable analysis for search optimization.

## Contributing

We welcome contributions that align with our mission to simplify SEO content creation. Please feel free to open an issue or submit a pull request.

## License

MIT License - see LICENSE file for details.

---

**WordWise AI**: Write better content, rank higher, engage more readers.
