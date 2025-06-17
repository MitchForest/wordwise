# WordWise AI

A specialized writing assistant designed for blog owners who want to create SEO-optimized content that ranks well in search engines and engages readers.

## Overview

WordWise combines real-time grammar checking, SEO optimization, readability analysis, and AI-powered content enhancement into a single platform. Unlike general-purpose writing tools, WordWise is specifically built for content creators who need to balance quality writing with search engine performance.

## Who is WordWise for?

WordWise is built for independent blog owners, content creators, small business owners, and freelance writers.

- **Goal**: To increase organic traffic, improve search rankings, and publish professional-quality content.
- **Challenge**: You need to produce great content but may not be an expert in SEO's technical demands.
- **Pain Points**: Overcoming writer's block, navigating complex SEO requirements, and fixing grammar and style inconsistencies.

Our secondary users include marketing teams and small businesses aiming to streamline their content creation process without hiring specialists.

## Core Features: A User-Centric Approach

WordWise is designed around the real-world needs of content creators. Our features are directly mapped to user stories that address the core challenges of blogging.

### 1. Real-time Writing Quality
> *"As a blog owner, I want instant grammar and spelling corrections while I write, so I can publish professional content that builds trust with readers and search engines."*

WordWise offers a three-tier checking system for instant spellcheck, smart grammar analysis, and deep document-wide checks. Visual, non-intrusive feedback through color-coded underlines and hover cards allows you to fix issues with a single click without breaking your writing flow.

### 2. SEO Content Optimization
> *"As a blog owner, I want real-time SEO feedback and keyword optimization suggestions, so I can improve my search rankings while maintaining natural, readable content."*

Get real-time feedback on target keyword density, title length, meta descriptions, and heading structure. WordWise provides smart suggestions to help you integrate keywords naturally, avoid stuffing, and optimize your content for search engines.

### 3. AI Writing Assistant for Writer's Block
> *"As a blog owner, I want AI-powered content generation and rewriting suggestions when I'm stuck, so I can overcome writer's block and maintain consistent publishing schedules."*

Our AI assistant helps you generate blog post outlines, write introductions and conclusions, and even expand bullet points into full paragraphs. The document-aware chat can rewrite sections for tone, improve clarity, or enhance SEO, all with a simple command.

### 4. Content Structure and Flow
> *"As a blog owner, I want intelligent suggestions for content organization and paragraph flow, so my posts are logically structured and easy for readers to follow."*

WordWise analyzes your content's structure, validating heading hierarchy, optimizing paragraph length, and ensuring a logical flow. This helps create content that is easy for readers to scan and understand.

### 5. Writing Style Enhancement
> *"As a blog owner, I want style improvements that eliminate passive voice and increase engagement, so my content is more compelling and authoritative."*

Improve your writing with tools that detect passive voice, analyze sentence variety, and suggest stronger word choices. Our style checker helps you maintain a consistent tone and create more engaging content for your audience.

### 6. Publication Readiness Dashboard
> *"As a blog owner, I want a comprehensive quality score showing grammar, SEO, readability, and engagement metrics, so I know exactly when my content is ready to publish and will perform well."*

A unified dashboard gives you a 0-100 score across Grammar, SEO, Readability, and Style. A publication-ready checklist ensures you've addressed all critical issues before you hit "publish."

## How It Works

1. **Start Writing**: Use the rich text editor with full formatting capabilities
2. **Get Real-time Feedback**: See grammar, SEO, and readability scores update as you type
3. **Use AI Assistance**: Chat with AI for content ideas, improvements, or when stuck
4. **Optimize for SEO**: Track keyword density, optimize titles, and improve structure
5. **Check Publication Readiness**: Review comprehensive quality scores before publishing
6. **Export & Publish**: Copy optimized HTML or export to various formats

## Technology Stack

- **Frontend**: Next.js 15, TypeScript, React 19
- **Editor**: Tiptap 2.x with custom extensions for grammar and SEO analysis
- **UI**: Tailwind CSS, Radix UI components
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better-auth for secure user management
- **AI**: OpenAI GPT-4 with Vercel AI SDK
- **Grammar Checking**: LanguageTool API integration
- **Deployment**: Vercel with auto-save and offline support

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- PostgreSQL database (or Supabase account)
- OpenAI API key
- LanguageTool API key (optional, for enhanced grammar checking)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/MitchForest/wordwise.git
cd wordwise
```

2. Install dependencies:
```bash
bun install
# or
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your `.env.local` file:
```env
# Database
DATABASE_URL="your-database-url"

# Authentication
BETTER_AUTH_SECRET="generate-a-random-secret"
BETTER_AUTH_URL="http://localhost:3000"

# OpenAI for AI features
OPENAI_API_KEY="your-openai-api-key"

# LanguageTool for grammar checking
LANGUAGETOOL_API_KEY="your-languagetool-api-key"
LANGUAGETOOL_API_URL="https://api.languagetoolplus.com/v2"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

5. Run database migrations:
```bash
bun run db:push
# or
npm run db:push
```

6. Start the development server:
```bash
bun run dev
# or
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

### Available Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run db:push` - Push database schema changes
- `bun run db:studio` - Open Drizzle Studio for database management
- `bun run lint` - Run ESLint
- `bun run type-check` - Run TypeScript type checking

## Competitive Advantages

**vs. Grammarly:**
- Integrated SEO optimization beyond just grammar
- Content structure analysis and suggestions
- AI-powered content generation for blogs
- Real-time SERP preview and keyword tracking

**vs. SEO Tools (Surfer, Clearscope):**
- Real-time grammar and style checking
- Integrated writing environment (not just analysis)
- AI writing assistant with direct editor integration
- More affordable for individual creators

**vs. AI Writing Tools (ChatGPT, Claude):**
- Purpose-built for SEO blog content
- Real-time scoring and feedback as you type
- Document management and auto-save
- Specialized analysis for search optimization

## Contributing

WordWise is focused on creating the best possible experience for blog owners and content creators. We welcome contributions that align with our mission to simplify SEO content creation.

## License

MIT License - see LICENSE file for details.

---

**WordWise AI**: Write better content, rank higher, engage more readers.
