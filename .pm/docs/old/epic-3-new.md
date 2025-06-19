# Epic 3: AI Writing Assistant - Implementation Plan

## Epic Overview
**Goal**: Integrate AI assistance seamlessly into the writing experience through a chat interface and smart commands, while building a privacy-first learning system.

**Duration**: 4 weeks (4 sprints)

**Success Criteria**:
- Users can get AI help without leaving the editor
- 80% of AI suggestions are applied without modification
- Average time to apply AI suggestion < 5 seconds
- Chat context persists per document
- Learning system improves suggestion relevance by 20%

## Architecture Decisions

### UI Architecture
- **Right Panel Tabs**: Suggestions | AI Chat (no floating elements)
- **Chat Scope**: Per-document conversation history
- **Learning Scope**: Global preferences, local-first storage

### Technical Stack
- **AI SDK**: Streaming, tool calling, chat hooks
- **Storage**: Document chats in Supabase JSONB, learning events in IndexedDB
- **UI Components**: Radix UI tabs, shadcn/ui chat components
- **Diff Display**: diff library for showing changes

## Sprint Breakdown

### Sprint 1: Basic Chat Integration
**Goal**: Add AI chat tab with document awareness

#### Features to Implement:

**F3.6: Chat-based refinement**
- Add "AI" tab to right panel using Radix UI tabs
- Implement chat UI with message history
- Set up streaming responses with AI SDK
- Store chat history per document

**F6.2: Floating AI assistant** (Modified)
- Instead of floating, add tab indicator when AI has suggestions
- Quick access via keyboard shortcut (Cmd+Shift+A)

**Technical Implementation**:
```typescript
// Core chat setup
const DocumentAIChat = () => {
  const { documentId } = useDocument();
  const { messages, input, handleSubmit, isLoading } = useChat({
    api: '/api/ai/chat',
    id: documentId, // Unique chat per document
    initialMessages: loadDocumentChat(documentId),
    body: {
      documentContext: {
        title: document.title,
        wordCount: document.wordCount,
        topic: document.topic
      }
    }
  });
};

// API endpoint
export async function POST(req: Request) {
  const { messages, documentContext } = await req.json();
  
  const result = await streamText({
    model: openai('gpt-4o-mini'),
    messages: enhanceWithContext(messages, documentContext),
    temperature: 0.7
  });
  
  return result.toAIStreamResponse();
}
```

**Deliverables**:
- Working chat tab in right panel
- Streaming AI responses
- Chat history saved per document
- Document context included in all prompts

---

### Sprint 2: Quick Actions & Commands
**Goal**: Enable fast AI transformations without typing

#### Features to Implement:

**F3.1: Generate content at cursor**
- Implement slash commands (/, /continue, /outline, etc.)
- Add dropdown UI when typing /
- Insert generated content at cursor position

**F3.2: Rewrite selection for goal**
- Quick action buttons in AI panel
- Select text → click action → see result
- Diff view for changes
- Apply/Reject/Retry flow

**Technical Implementation**:
```typescript
// Quick actions
const quickActions = [
  { id: 'improve', label: 'Improve', icon: Sparkles },
  { id: 'expand', label: 'Expand', icon: Maximize },
  { id: 'simplify', label: 'Simplify', icon: Target },
  { id: 'professional', label: 'Professional', icon: Briefcase }
];

// Slash command handler
const handleSlashCommand = async (command: string) => {
  const selectedText = editor.getSelectedText();
  const cursorPos = editor.getCursorPosition();
  
  switch(command) {
    case 'continue':
      const continuation = await generateText({
        prompt: `Continue writing: ${getTextBefore(cursorPos)}`,
        maxTokens: 200
      });
      editor.insertAt(cursorPos, continuation);
      break;
    // ... other commands
  }
};

// Selection → AI flow
const improveSelection = async (text: string, action: string) => {
  const improved = await streamObject({
    model: openai('gpt-4o-mini'),
    schema: z.object({
      suggestion: z.string(),
      explanation: z.string()
    }),
    prompt: `${action} this text: ${text}`
  });
  
  showDiffView(text, improved.suggestion);
};
```

**Deliverables**:
- Slash command system with dropdown
- Quick action buttons in AI panel
- Text selection → AI transformation flow
- Diff view with apply/reject
- Undo support for all AI actions

---

### Sprint 3: Advanced AI Features & Learning
**Goal**: Add smart features and begin tracking user preferences

#### Features to Implement:

**F3.3: Create document outlines**
**F3.4: Brainstorm ideas/topics**  
**F3.5: Generate titles and headings**
- Specialized commands for structural content
- Template-based generation
- Multiple suggestions with selection UI

**F7.1: Track accepted/rejected suggestions**
**F7.2: Learn user's writing style**
- Event tracking system
- Local preference detection
- Enhanced prompts based on learning

**Technical Implementation**:
```typescript
// Specialized generators
const generateOutline = tool({
  description: 'Generate article outline',
  parameters: z.object({
    topic: z.string(),
    style: z.enum(['tutorial', 'listicle', 'essay']),
    sections: z.number()
  }),
  execute: async ({ topic, style, sections }) => {
    const outline = await generateObject({
      model: openai('gpt-4o'),
      schema: outlineSchema,
      prompt: buildOutlinePrompt(topic, style, sections)
    });
    return formatAsMarkdown(outline);
  }
});

// Learning system
class LearningSystem {
  async trackEvent(event: {
    type: 'ai_suggestion_applied' | 'quick_action_used';
    action: string;
    textLength: number;
    applied: boolean;
  }) {
    // Store locally first
    await localforage.setItem(`event_${Date.now()}`, event);
    
    // Update preferences
    await this.updatePreferences(event);
  }
  
  async getEnhancedPrompt(basePrompt: string): string {
    const prefs = await this.getUserPreferences();
    return `${basePrompt}\n\nUser style: ${prefs.writingStyle}`;
  }
}
```

**Deliverables**:
- Outline generation with templates
- Title/heading suggestions (5 options)
- Brainstorming interface
- Event tracking implementation
- Preference detection algorithm
- Enhanced prompts using preferences

---

### Sprint 4: Polish & Integration
**Goal**: Refine UX and add power features

#### Features to Implement:

**F6.3: Command palette (Cmd+K)**
- Global command palette for all AI actions
- Fuzzy search for commands
- Recent commands section

**F6.4: Inline AI triggers (/)**
- Polish slash command UX
- Add command previews
- Keyboard navigation

**Integration Features**:
- Export chat conversations
- Search chat history
- Keyboard shortcuts for all actions
- Performance optimizations
- Error handling and retry logic

**Technical Implementation**:
```typescript
// Command palette
const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  
  useKeyboardShortcut(['cmd', 'k'], () => setOpen(true));
  
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="AI command..." />
      <CommandList>
        <CommandGroup heading="Quick Actions">
          {quickActions.map(action => (
            <CommandItem onSelect={() => executeAction(action)}>
              <action.icon /> {action.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Generate">
          <CommandItem onSelect={generateOutline}>
            Create outline
          </CommandItem>
          {/* ... more commands */}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

// Performance optimizations
const optimizedChat = {
  // Debounce context updates
  debouncedContext: useDebouncedCallback(
    (context) => updateChatContext(context),
    1000
  ),
  
  // Cache common transformations
  cachedTransform: async (text: string, action: string) => {
    const cacheKey = `${action}:${hash(text)}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;
    
    const result = await transform(text, action);
    await cache.set(cacheKey, result);
    return result;
  }
};
```

**Deliverables**:
- Command palette with fuzzy search
- Polished slash commands
- Chat history export
- All keyboard shortcuts working
- <2s response time for all actions
- Graceful error handling

## Success Metrics

### Quantitative
- Chat response time < 2s (first token)
- Command execution < 1s
- 80% of suggestions accepted without modification
- 90% of slash commands successfully complete
- Learning improves relevance by 20%

### Qualitative
- Users report AI feels "integrated, not bolted on"
- Chat maintains context effectively
- Commands feel intuitive
- Learning respects privacy

## Risk Mitigation

1. **Performance**: Cache common operations, debounce updates
2. **Context Length**: Summarize long documents, use sliding window
3. **Privacy**: Local-first learning, explicit opt-in for sync
4. **Reliability**: Graceful fallbacks, retry logic, offline support

## Dependencies

- Epic 1 & 2 complete (editor + suggestions working)
- AI SDK API keys configured
- Supabase tables for chat history
- IndexedDB for learning events

## Future Enhancements (Post-Epic 3)

- Voice input for chat
- Multi-modal support (images, diagrams)
- Team sharing of AI conversations
- Advanced agent behaviors
- Custom AI model fine-tuning