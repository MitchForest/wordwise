# WordWise AI

A specialized writing assistant designed for blog owners who want to create SEO-optimized content that ranks well in search engines and engages readers.

## Overview

WordWise combines real-time grammar checking, SEO optimization, readability analysis, and AI-powered content enhancement into a single platform. Unlike general-purpose writing tools, WordWise is specifically built for content creators who need to balance quality writing with search engine performance.

## Target Users

### Primary: Independent Blog Owners
- Content creators, small business owners, freelance writers
- Goal: Increase organic traffic and improve search rankings
- Challenge: Need professional content without SEO expertise
- Pain Points: Writer's block, complex SEO requirements, inconsistent quality

### Secondary Users
- Marketing teams creating consistent, optimized content
- Freelance writers requiring professional tools
- Small businesses improving content without hiring specialists

## Key Features

### 🔍 Real-time Writing Quality
**Three-Tier Checking System:**
- **Instant (0ms)**: Spell checking and basic corrections
- **Smart (500ms)**: Grammar checking on current paragraph
- **Deep (2s)**: Full document analysis for complex issues

**Visual Feedback:**
- Color-coded underlines (red: critical, amber: warnings, blue: suggestions)
- Hover cards with explanations and one-click fixes
- Non-intrusive corrections that don't interrupt writing flow

### 📈 SEO Content Optimization
**Real-time SEO Analysis:**
- Target keyword density tracking (1-2% optimal)
- Title optimization (50-60 characters with keyword placement)
- Meta description scoring (150-160 characters)
- Heading structure validation (proper H1 → H2 → H3 hierarchy)

**Smart SEO Features:**
- Natural keyword placement suggestions
- LSI (related) keyword recommendations
- Keyword stuffing prevention
- SERP preview with live updates

### 🤖 AI Writing Assistant
**Content Generation:**
- Blog post outline generation from topic + keywords
- Introduction and conclusion creation
- Bullet point expansion into full paragraphs
- SEO-focused rewriting to include keywords naturally

**AI Chat Interface:**
- Document-aware conversations that understand your content
- Quick action buttons: "Make this engaging", "Improve SEO", "Simplify"
- Multi-step content enhancement with progress tracking
- Preview/accept/reject interface for all suggestions

### 📊 Publication Readiness Dashboard
**Unified Quality Scoring (0-100):**
- **Grammar & Spelling**: Critical errors, warnings, style suggestions
- **SEO Optimization**: Title, meta description, keyword usage, structure
- **Readability**: Grade level, reading time, engagement potential
- **Style & Clarity**: Passive voice detection, sentence variety, word choice

**Publication Checklist:**
- All critical grammar errors resolved
- SEO score above 75
- Reading level appropriate for audience
- Meta description optimized
- Target keywords naturally integrated

### 📝 Content Structure & Flow
- Heading hierarchy validation
- Paragraph length optimization (50-300 words)
- Table of contents generation for long posts
- Logical progression and flow analysis
- Call-to-action placement suggestions

### ✨ Style Enhancement
- Passive voice detection with active alternatives
- Sentence variety scoring for better rhythm
- Power word suggestions for emotional impact
- Tone consistency throughout document
- Engagement optimization for target audience

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

## Success Metrics

- **Performance**: Sub-2 second analysis response time
- **Grammar Accuracy**: 95%+ error detection
- **SEO Effectiveness**: 40% average keyword optimization improvement
- **User Experience**: No typing interruption, seamless workflow
- **Content Quality**: 25% average readability improvement

## Development Status

### Phase 1 (Current): Core Functionality
- ✅ Real-time grammar and spell checking
- ✅ SEO analysis and scoring
- ✅ Readability assessment
- ✅ Style analysis and suggestions
- 🚧 Inline decorations and hover cards
- 🚧 Data persistence optimization

### Phase 2: Enhanced Experience
- 🚧 AI content generation and improvement
- 🚧 Unified scoring dashboard
- 🚧 Advanced SEO integration
- ⏳ Multi-step content enhancement

### Phase 3: Advanced Features
- ⏳ Voice input and dictation
- ⏳ Team collaboration features
- ⏳ Direct CMS publishing integration
- ⏳ Advanced analytics dashboard

## Contributing

WordWise is focused on creating the best possible experience for blog owners and content creators. We welcome contributions that align with our mission to simplify SEO content creation.

## License

MIT License - see LICENSE file for details.

---

**WordWise AI**: Write better content, rank higher, engage more readers.
