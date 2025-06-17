# WordWise AI

A next-generation writing assistant specifically designed for content creators who need to produce SEO-optimized blog posts.

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- PostgreSQL database (or Supabase account)
- OpenAI API key
- LanguageTool API (optional, for grammar checking)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/wordwise.git
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

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# LanguageTool (optional)
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

---

# WordWise AI - Product Requirements Document (PRD)

## Executive Summary

WordWise AI is a next-generation writing assistant specifically designed for content creators who need to produce SEO-optimized blog posts. Unlike general-purpose writing tools, WordWise combines real-time grammar checking, SEO optimization, readability analysis, and AI-powered content enhancement into a single, cohesive platform that helps writers create content that both engages readers and ranks well in search engines.

## Product Vision

To become the definitive writing platform for content creators who need to balance quality writing with SEO performance, providing an integrated experience that eliminates the need for multiple disparate tools while maintaining the writer's unique voice.

## Target Users

### Primary Persona: Professional Content Creator
- **Demographics**: 25-45 years old, creating content for a living
- **Needs**: High-quality content that ranks well, efficient workflow, maintains authentic voice
- **Pain Points**: Switching between multiple tools, manual SEO optimization, time-consuming revisions
- **Technical Proficiency**: Comfortable with web apps, basic SEO knowledge

### Secondary Personas:
- **Marketing Teams**: Need consistent, optimized content across multiple writers
- **Freelance Writers**: Require professional tools without enterprise pricing
- **Small Business Owners**: Want to improve their content without hiring specialists

## Core User Stories

1. **Real-time Writing Assistance**: "As a blogger, I want instant grammar and style feedback while I write, so I can fix issues immediately without breaking my flow."

2. **SEO Optimization**: "As a content creator, I want to see how my content performs for target keywords in real-time, so I can optimize as I write rather than after."

3. **Content Enhancement**: "As a writer, I want AI to suggest improvements that maintain my voice, so I can enhance quality without losing authenticity."

4. **Structured Writing**: "As a blogger, I want tools to help organize my content with proper headings and structure, so my posts are scannable and SEO-friendly."

5. **Quick Publishing**: "As a content creator, I want to easily export my optimized content in various formats, so I can publish anywhere without reformatting."

6. **Progress Tracking**: "As a writer, I want to see my content's quality improve in real-time, so I feel motivated and know when my post is ready to publish."

## Unique Value Proposition

### WordWise AI vs. Competitors

**Versus Grammarly:**
- Integrated SEO optimization (not just grammar)
- Content structure analysis and suggestions
- AI-powered content generation and enhancement
- Real-time SERP preview
- Keyword optimization tools

**Versus Surfer SEO/Clearscope:**
- Real-time grammar and style checking
- AI writing assistant with direct editor integration
- More affordable for individual creators
- Integrated writing environment (not just analysis)
- Voice input capabilities

**Versus ChatGPT/Claude:**
- Purpose-built for SEO content creation
- Real-time scoring and feedback as you type
- Document management and auto-save
- AI can directly edit your document
- Preserves writer's voice while optimizing

**Key Differentiators:**
1. **Integrated AI editing**: AI chat can directly modify document content
2. **Real-time feedback**: See improvements as you write
3. **Voice-first features**: Dictation and voice commands
4. **Smart context awareness**: AI understands your document and SEO goals
5. **One-click enhancements**: Complex improvements made simple

## Technical Architecture

### Tech Stack
- **Frontend**: Next.js 15, TypeScript, React
- **UI Components**: Tailwind CSS, Radix UI, Framer Motion
- **Editor**: Tiptap 2.x with custom extensions
- **Database**: Supabase (PostgreSQL) with Drizzle ORM
- **Authentication**: Better-auth
- **AI/ML**: Vercel AI SDK, OpenAI GPT-4
- **Grammar**: LanguageTool API
- **Analytics**: Custom implementation with Supabase
- **Deployment**: Vercel

### Core Services
- **Real-time Sync**: Auto-save with conflict resolution
- **Offline Support**: Local storage with sync queue
- **Caching Layer**: Performance optimization for AI responses
- **Rate Limiting**: User-based API throttling
- **Security**: Server-side API keys, encrypted data

## Features & Functionality

### Core Layout

**Two-Panel Interface**
- **AI Chat Panel**: Fixed or collapsible sidebar for AI interactions
- **Editor Panel**: Main writing area with integrated analysis tools
- Responsive design that adapts to mobile/tablet/desktop
- AI chat can be minimized to floating button

### Writing Environment

**Rich Text Editor**
- Full formatting capabilities (bold, italic, headings, lists, links)
- Custom extensions for grammar highlighting and keyword tracking
- Title and meta description fields with character counters
- SEO keyword input with real-time density tracking
- Mobile-optimized touch interactions
- Focus mode for distraction-free writing
- Undo/redo system that tracks AI changes

**Document Management**
- Multi-document support with auto-save every 30 seconds
- Document search and filtering
- Recovery system for unsaved work
- Template library
- Export in multiple formats (HTML, Markdown, Google Docs)

### Analysis & Scoring

**Floating Analysis Panel**
- Draggable, resizable panel within editor
- Minimizes to status indicator
- Tabbed interface:
  - Overview tab with all scores
  - Grammar tab with detailed issues
  - SEO tab with optimization metrics
  - Style tab with readability analysis
- Quick actions for common fixes
- Real-time updates as you type

**Grammar & Style Analysis**
- Real-time grammar checking with colored underlines
- Style suggestions (passive voice, readability, clarity)
- Writing tone consistency checking
- Sentence variety analysis
- Hover tooltips with explanations

**SEO Optimization**
- Real-time SEO score (0-100)
- Keyword density visualization
- Title and meta description optimization
- Heading structure analysis (H1-H6 hierarchy)
- SERP preview with live updates
- LSI keyword recommendations
- Content length recommendations

**Readability Metrics**
- Flesch Reading Ease score
- Grade level assessment
- Reading time calculation
- Sentence and paragraph length analysis
- Complex word identification
- Suggestions for improvement

### AI-Powered Features

**Integrated AI Chat**
- Document-aware conversations
- Can read and understand current document context
- **Direct editing capabilities**: AI can modify document content
- Tool calling system for structured operations
- Streaming responses with typing indicators
- Quick action buttons for common requests
- Conversation history per document

**AI Tools System**
- `checkGrammar`: Analyze grammar with LanguageTool
- `analyzeSEO`: Check keyword optimization and structure
- `analyzeReadability`: Assess reading difficulty
- `analyzeStyle`: Check writing style and clarity
- `applyImprovement`: Make specific text improvements
- `generateContent`: Create new content sections
- `evaluateImprovement`: Verify changes actually improve quality

**Content Enhancement Workflows**
- **Smart Enhance**: One-click multi-step improvement
- **Sequential Enhancement**: Visible progress through improvement steps
- **Before/After Preview**: Compare original vs. improved
- **Selective Acceptance**: Accept/reject individual changes
- **Improvement Tracking**: See what AI changed and why

**Voice Capabilities**
- Voice-to-text for content dictation
- Voice input in AI chat
- Context-aware functionality based on cursor position
- Visual feedback during recording
- Auto-punctuation for natural speech

### User Interface Elements

**Visual Feedback System**
- **Grammar errors**: Wavy underlines (red for critical, amber for warnings)
- **SEO indicators**: Color-coded scores (red <50, amber 50-70, green >70)
- **Real-time counters**: Character/word counts with limits
- **Progress animations**: Smooth transitions for score changes
- **Success celebrations**: Confetti for major improvements
- **Loading states**: Skeleton screens, never blank

**Micro-interactions**
- Smooth hover effects on all interactive elements
- Score counter animations (odometer style)
- Pulsing indicators for active operations
- Subtle shadows and depth changes
- Spring animations for panel movements
- Toast notifications for saves and updates

### Performance & Reliability

**Speed Optimizations**
- Parallel analysis execution (grammar, SEO, readability simultaneously)
- Intelligent caching of AI responses
- Debounced checking (500ms after typing stops)
- Optimistic UI updates
- Progressive enhancement
- Lazy loading of advanced features

**Data Protection**
- Auto-save every 30 seconds
- Local storage backup on every change
- Offline mode with sync queue
- Conflict resolution for concurrent edits
- Version snapshots for undo/redo
- Full data export capability

**Error Handling**
- Graceful degradation when services unavailable
- User-friendly error messages
- Automatic retry with exponential backoff
- Fallback to cached suggestions
- Never lose user's work

### Publishing & Export

**Export Options**
- Copy as WordPress-ready HTML
- Download as SEO-optimized Markdown
- Export to Google Docs format
- Plain text with formatting preserved
- One-click format cleanup

**Integration Capabilities**
- Webhook support for automation
- API access for programmatic control
- Browser extension (planned)
- Mobile apps (planned)

## Success Metrics

### User Engagement
- Time to first improvement: <30 seconds
- Average session duration: >15 minutes
- AI feature adoption: >60% of users
- Return user rate: >40% weekly active

### Performance Metrics
- Grammar accuracy: >95%
- SEO score improvement: Average 35% increase
- First contentful paint: <1.5 seconds
- AI response time: <2 seconds (streaming start)
- Auto-save reliability: 99.9%

### Quality Metrics
- Writing improvement: 25%+ readability increase
- SEO optimization: 40%+ keyword optimization
- Error reduction: 80%+ grammar issues fixed
- Time saved: 30%+ faster content creation

## Future Considerations

### Planned Enhancements
- Team collaboration features
- Advanced content analytics dashboard
- Multiple language support
- Direct CMS publishing (WordPress, Medium)
- Chrome extension for web-based writing
- Advanced AI model selection (GPT-4, Claude, etc.)

### Scalability Planning
- Microservices architecture preparation
- Multi-region deployment for global users
- Enterprise features for teams
- White-label options
- API marketplace for third-party tools

## Conclusion

WordWise AI revolutionizes content creation by seamlessly integrating grammar checking, SEO optimization, and AI assistance into a unified platform. The direct integration between AI chat and editor, combined with real-time analysis and one-click enhancements, creates a writing experience that's both powerful and intuitive. By focusing specifically on the needs of content creators and SEO optimization, WordWise AI enables writers to produce high-quality, search-optimized content faster than ever before.
