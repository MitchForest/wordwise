# WordWise Writing Assistant: Canonical System Reference

## 1. Vision & Architecture

### Guiding Principles
The WordWise assistant is architected around five core principles that ensure a seamless and intelligent user experience:

1. **Instant Feedback, Progressive Enhancement:** Users expect immediate feedback like Google Docs. We deliver this through client-side retext analysis for basic checks, with server-side AI enhancement for complex insights.
2. **Clarity and User Agency:** The assistant's feedback must be clear, actionable, and understandable. The user should always feel in control, with the system acting as an intelligent partner, not an intrusive critic.
3. **Hybrid Intelligence:** Client-side retext provides zero-latency basic analysis, while server-side AI adds contextual understanding. Each technology is used where it excels.
4. **Incremental over Monolithic:** We analyze only what changed, not the entire document. This principle drives our performance and enables cost-effective AI integration.
5. **Position-Independent Stability:** Suggestions survive document edits through intelligent position tracking, providing a stable and predictable user experience.

### System Architecture: Hybrid Client-Server Analysis
Our architecture is a **hybrid client-server system** that combines the speed of client-side analysis with the power of server-side AI. The system delivers instant feedback through local retext processing while progressively enhancing suggestions with AI when beneficial.

```mermaid
graph TD
    subgraph Client-Side (Browser)
        A[User Action in Editor] --> B{useUnifiedAnalysis Hook}
        
        subgraph Retext Analysis (Instant)
            R1[Retext Processor]
            R2[Spell Check - nspell]
            R3[Grammar - retext-plugins]
            R4[Style - retext-plugins]
            R1 --> R2 & R3 & R4
        end
        
        B --> R1
        R1 --> C[Retext Suggestions]
        
        subgraph Position Tracking
            PT[SuggestionManager]
            PM[ProseMirror Plugin]
            PT <--> PM
        end
        
        C --> PT
        
        subgraph Deduplication & Enhancement
            D[SuggestionDeduplicator]
            E[AI Enhancement Queue]
            D --> E
        end
        
        PT --> D
        
        subgraph State Management & UI
            SC[SuggestionContext]
            UI[UI Components<br/>(Decorations, Panels)]
        end
        
        D --> SC
        SC --> UI
    end

    subgraph Server-Side (API)
        S1[AI Enhancement API]
        S2[AI Error Detection API]
        S3[SEO Analysis API]
        S4[Deep Metrics API]
        
        subgraph AI Processing
            AI1[Context Extraction]
            AI2[GPT-4 Enhancement]
            AI3[Incremental Analysis]
            AI1 --> AI2
            AI2 --> AI3
        end
        
        S1 & S2 --> AI1
    end

    E --> S1
    B --800ms delay--> S3 & S4
    S1 --> SC
    S3 & S4 --> SC
```

---

## 2. The Multi-Tiered Analysis System

The system operates on multiple tiers, each optimized for different types of feedback:

| Tier | What It Analyzes | Where It Runs | Response Time | Trigger |
|------|------------------|---------------|---------------|---------|
| **0. Live Metrics** | Word count, character count | Client (pure JS) | 0ms | Every keystroke |
| **1. Instant Analysis** | Spelling, grammar, style | Client (retext) | < 50ms | Every keystroke |
| **2. AI Enhancement** | Complex fixes, context | Server (GPT-4) | 500-1000ms | 1s after changes |
| **3. AI Detection** | Missed errors | Server (GPT-4) | 2000-3000ms | 3s after changes |
| **4. Deep Analysis** | SEO, readability | Server (custom) | 500-800ms | 800ms after changes |

### Client-Side Retext Analysis

The client runs a sophisticated retext pipeline that provides instant feedback:

```typescript
// Retext plugin configuration
const retextPlugins = {
  spell: [retextSpell, { dictionary: enUS, personal: userDictionary }],
  grammar: [
    retextIndefiniteArticle,    // a/an errors
    retextRepeatedWords,         // repeated repeated words
    retextSentenceSpacing,       // Multiple  spaces
    retextQuotes,               // "Smart" quotes
    retextContractions,         // Apostrophe errors
  ],
  style: [
    retextPassive,              // Passive voice detection
    retextSimplify,             // Complex → simple words
    retextReadability,          // Sentence complexity
    retextEquality,             // Inclusive language
  ]
};
```

### Server-Side AI Enhancement

AI selectively enhances suggestions that benefit from contextual understanding:

```typescript
interface AIEnhancement {
  originalSuggestion: UnifiedSuggestion;
  aiFix?: string;              // Better contextual fix
  aiExplanation?: string;       // Why this fix is better
  aiConfidence: number;         // 0-1 confidence score
  additionalErrors?: Error[];   // Errors retext missed
}
```

---

## 3. Position-Independent Suggestion System

### Core Architecture

The system separates suggestion identity from position tracking:

```typescript
// Stable suggestion identity (survives edits)
interface UnifiedSuggestion {
  id: string;              // "spelling/misspelling-helo-0"
  ruleId: string;          // "spelling/misspelling"
  matchText: string;       // "helo world" (with context)
  originalText: string;    // "helo" (actual error)
  originalFrom: number;    // Used for occurrence counting only
  originalTo: number;      // Not used for position tracking
  category: SuggestionCategory;
  subCategory: SubCategory;
  message: string;
  actions: SuggestionAction[];
  severity: 'error' | 'warning' | 'suggestion';
  source: 'retext' | 'server' | 'ai';
  retextPlugin?: string;   // Which plugin generated it
}

// Dynamic position tracking (updated via ProseMirror)
class SuggestionManager {
  private positions = new Map<string, TrackedPosition>();
  private suggestions = new Map<string, UnifiedSuggestion>();
  
  registerSuggestion(suggestion: UnifiedSuggestion, from: number, to: number) {
    this.suggestions.set(suggestion.id, suggestion);
    this.positions.set(suggestion.id, { 
      suggestionId: suggestion.id,
      from, 
      to,
      version: 0 
    });
  }
  
  updatePositions(tr: Transaction) {
    this.positions.forEach((pos, id) => {
      const mappedFrom = tr.mapping.map(pos.from);
      const mappedTo = tr.mapping.map(pos.to);
      
      if (mappedFrom !== null && mappedTo !== null) {
        const currentText = tr.doc.textBetween(mappedFrom, mappedTo);
        const suggestion = this.suggestions.get(id);
        
        // Validate text hasn't changed
        if (currentText === suggestion?.originalText) {
          pos.from = mappedFrom;
          pos.to = mappedTo;
          pos.version++;
        } else {
          // Text changed, remove suggestion
          this.removeSuggestion(id);
        }
      }
    });
  }
}
```

### Stable ID Generation

IDs use occurrence counting for stability:

```typescript
function generateStableId(
  matchText: string,
  ruleId: string,
  documentText: string,
  position: number
): string {
  // Count occurrences before this position
  let occurrenceCount = 0;
  let searchIndex = -1;
  
  while ((searchIndex = documentText.indexOf(matchText, searchIndex + 1)) !== -1) {
    if (searchIndex < position) {
      occurrenceCount++;
    } else {
      break;
    }
  }
  
  const textHash = matchText.slice(0, 8).toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${ruleId}-${textHash}-${occurrenceCount}`;
}
```

### Reconciliation Windows

To prevent flickering when fixes are applied:

```typescript
class ReconciliationManager {
  private reconciliationWindows = new Map<string, number>();
  
  addReconciliationWindow(area: string, duration = 3000) {
    this.reconciliationWindows.set(area, Date.now() + duration);
  }
  
  isInReconciliation(position: number, text: string): boolean {
    for (const [area, expiry] of this.reconciliationWindows) {
      if (Date.now() < expiry && area.includes(text)) {
        return true;
      }
    }
    return false;
  }
}
```

---

## 4. Deduplication & Priority System

### Multi-Source Deduplication

The system intelligently handles overlapping suggestions from different sources:

```typescript
class SuggestionDeduplicator {
  deduplicate(suggestions: UnifiedSuggestion[]): UnifiedSuggestion[] {
    const groups = this.groupOverlapping(suggestions);
    
    return groups.map(group => {
      // Priority: AI Enhanced > Server > Client
      const aiEnhanced = group.find(s => s.source === 'ai');
      const server = group.find(s => s.source === 'server');
      const client = group.find(s => s.source === 'retext');
      
      return aiEnhanced || server || client;
    });
  }
  
  private groupOverlapping(suggestions: UnifiedSuggestion[]): UnifiedSuggestion[][] {
    // Group by position overlap
    const groups: UnifiedSuggestion[][] = [];
    
    for (const suggestion of suggestions) {
      const pos = this.positionManager.getPosition(suggestion.id);
      if (!pos) continue;
      
      const overlappingGroup = groups.find(group =>
        group.some(s => {
          const sPos = this.positionManager.getPosition(s.id);
          return this.rangesOverlap(pos, sPos);
        })
      );
      
      if (overlappingGroup) {
        overlappingGroup.push(suggestion);
      } else {
        groups.push([suggestion]);
      }
    }
    
    return groups;
  }
  
  shouldEnhance(suggestion: UnifiedSuggestion): boolean {
    // Don't enhance if retext already provides good fixes
    if (suggestion.source === 'retext' && suggestion.actions.length > 0) {
      // Only enhance complex cases
      return ['context-dependent', 'tone', 'clarity'].includes(suggestion.subCategory);
    }
    return true;
  }
}
```

---

## 5. Caching & Optimization Strategy

### Multi-Level Cache Architecture

```typescript
// L1: In-memory cache for hot data
class L1Cache {
  private retextCache = new LRUCache<string, RetextResult>({
    max: 1000,
    ttl: 24 * 60 * 60 * 1000,  // 24 hours for retext
  });
  
  private aiCache = new LRUCache<string, AIEnhancement>({
    max: 500,
    ttl: 60 * 60 * 1000,       // 1 hour for AI
  });
}

// L2: IndexedDB for persistent cache
class L2Cache {
  async store(key: string, data: any, type: 'retext' | 'ai') {
    const db = await this.openDB();
    const tx = db.transaction(['cache'], 'readwrite');
    await tx.objectStore('cache').put({
      key,
      data,
      type,
      timestamp: Date.now(),
      expires: Date.now() + (type === 'retext' ? 86400000 : 3600000)
    });
  }
}

// L3: Cross-document cache sharing
class CrossDocumentCache {
  shareableCategories = ['spelling', 'grammar', 'style'];
  
  generateShareableKey(suggestion: UnifiedSuggestion): string | null {
    if (!this.shareableCategories.includes(suggestion.category)) {
      return null;
    }
    
    // Create topic-aware shareable key
    const topicHash = this.getTopicHash(suggestion.context);
    return `shared:${topicHash}:${suggestion.ruleId}:${suggestion.matchText}`;
  }
}
```

### Incremental Analysis

Only analyze changed content:

```typescript
interface IncrementalAnalysisResult {
  changedParagraphs: string[];
  cachedResults: UnifiedSuggestion[];
  newResults: UnifiedSuggestion[];
  cacheHitRate: number;
}

class IncrementalAnalyzer {
  async analyze(doc: Document, previousHashes: Map<string, string>) {
    const paragraphs = this.extractParagraphs(doc);
    const changed: Paragraph[] = [];
    const unchanged: Paragraph[] = [];
    
    for (const para of paragraphs) {
      const hash = this.hashContent(para.content);
      const prevHash = previousHashes.get(para.id);
      
      if (hash !== prevHash) {
        changed.push(para);
      } else {
        unchanged.push(para);
      }
    }
    
    // Only analyze changed paragraphs
    const newResults = await this.analyzeContent(changed);
    const cachedResults = this.getCachedResults(unchanged);
    
    return {
      changedParagraphs: changed.map(p => p.id),
      cachedResults,
      newResults,
      cacheHitRate: unchanged.length / paragraphs.length
    };
  }
}
```

---

## 6. AI Integration Architecture

### Selective AI Enhancement

AI enhances suggestions only when beneficial:

```typescript
class AIEnhancementService {
  async enhance(suggestions: UnifiedSuggestion[], context: DocumentContext) {
    // Filter suggestions that need enhancement
    const needsEnhancement = suggestions.filter(s => 
      this.deduplicator.shouldEnhance(s)
    );
    
    // Batch for efficiency
    const batches = this.createBatches(needsEnhancement, 8000); // Token limit
    
    // Process with streaming for better UX
    for (const batch of batches) {
      const stream = await this.streamEnhancement(batch, context);
      
      for await (const partial of stream) {
        // Update UI progressively
        this.updateSuggestion(partial);
      }
    }
  }
  
  private async streamEnhancement(batch: UnifiedSuggestion[], context: DocumentContext) {
    return streamObject({
      model: this.selectModel(batch),
      schema: enhancementSchema,
      prompt: this.buildPrompt(batch, context),
      onFinish: ({ usage }) => this.trackUsage(usage)
    });
  }
  
  private selectModel(suggestions: UnifiedSuggestion[]): string {
    const complexity = this.estimateComplexity(suggestions);
    
    return {
      simple: 'gpt-3.5-turbo',
      moderate: 'gpt-4o-mini',
      complex: 'gpt-4o'
    }[complexity];
  }
}
```

### AI Error Detection

Find errors that rule-based systems miss:

```typescript
class AIErrorDetector {
  async detectAdditionalErrors(
    doc: Document,
    existingSuggestions: string[]
  ): Promise<UnifiedSuggestion[]> {
    // Only run on changed paragraphs
    const changedContent = this.getChangedParagraphs(doc);
    
    if (changedContent.length === 0) return [];
    
    const { errors } = await generateObject({
      model: 'gpt-4o-mini',
      schema: errorDetectionSchema,
      prompt: `Find writing errors not caught by these rules: ${existingSuggestions.join(', ')}
               Focus on: context errors, unclear references, logical flow.
               Content: ${changedContent}`
    });
    
    return errors.map(e => this.convertToSuggestion(e));
  }
}
```

---

## 7. Performance Monitoring

### Comprehensive Metrics

```typescript
interface PerformanceMetrics {
  // Client-side retext performance
  retextMetrics: {
    processingTime: number[];      // Per-analysis times
    cacheHitRate: number;          // Client cache hits
    pluginPerformance: Record<string, number>;
  };
  
  // Server-side AI performance
  aiMetrics: {
    enhancementLatency: number[];  // Time to enhance
    tokenUsage: TokenUsage;        // Cost tracking
    cacheHitRate: number;          // AI cache hits
    modelUsage: Record<string, number>;
  };
  
  // Overall system health
  systemMetrics: {
    suggestionsHandledByRetext: number;  // % avoiding AI
    averageTimeToFirstSuggestion: number;
    memoryUsage: number;
    errorRate: number;
  };
}

class PerformanceMonitor {
  track(event: AnalysisEvent) {
    const startTime = performance.now();
    
    return {
      onComplete: (result: any) => {
        const duration = performance.now() - startTime;
        
        if (event.source === 'retext') {
          this.metrics.retextMetrics.processingTime.push(duration);
        } else if (event.source === 'ai') {
          this.metrics.aiMetrics.enhancementLatency.push(duration);
        }
        
        this.updateAverages();
      }
    };
  }
}
```

---

## 8. User Preferences & Personalization

### Preference System

```typescript
interface UserPreferences {
  // Retext preferences
  retext: {
    enabled: boolean;
    runLocation: 'client' | 'server';
    enabledRules: {
      spelling: boolean;
      grammar: boolean;
      style: boolean;
      clarity: boolean;
    };
    cacheResults: boolean;
  };
  
  // AI preferences
  ai: {
    enabled: boolean;
    enhancementLevel: 'minimal' | 'balanced' | 'aggressive';
    confidenceThreshold: number;
    categories: Record<string, boolean>;
    costSaving: boolean;
    shareCache: boolean;
  };
  
  // Learned preferences
  learned: {
    ignoredRules: string[];
    preferredFixes: Record<string, string>;
    writingStyle: WritingStyle;
  };
}
```

### Feedback Learning

```typescript
class FeedbackTracker {
  async trackAction(
    suggestion: UnifiedSuggestion,
    action: 'accepted' | 'rejected' | 'modified',
    appliedFix?: string
  ) {
    await db.insert(suggestionFeedback).values({
      suggestionId: suggestion.id,
      source: suggestion.source,
      retextPlugin: suggestion.retextPlugin,
      category: suggestion.category,
      action,
      appliedFix,
      confidence: suggestion.aiConfidence
    });
    
    // Update learned preferences
    if (action === 'rejected' && this.isFrequentlyRejected(suggestion.ruleId)) {
      this.preferences.learned.ignoredRules.push(suggestion.ruleId);
    }
  }
}
```

---

## 9. Performance Targets

After the retext migration, WordWise achieves:

| Metric | Before | Current | Target | Status |
|--------|--------|---------|--------|--------|
| First suggestion | 400ms | < 50ms | < 50ms | ✅ Achieved |
| Full document (10k) | 2-3s | < 100ms | < 100ms | ✅ Achieved |
| AI enhancement | N/A | 500-1000ms | < 1s | ✅ On track |
| Retext cache hit | N/A | 85% | > 80% | ✅ Achieved |
| AI cost reduction | N/A | 60% | > 70% | 🟡 In progress |
| Memory usage | Unbounded | < 50MB | < 50MB | ✅ Achieved |

---

## 10. Implementation Status

### Epic 1.5: Architecture Improvements
- ✅ Sprint 1-6: Foundation and basic features
- ✅ Sprint 7-10: Position tracking and performance

### Epic 2: AI-Enhanced Suggestions
- ✅ Sprint 001.75: Retext architecture migration
- 🟡 Sprint 002: Smart context & learning (In Progress)
- 🟡 Sprint 003: Optimization & polish (Planned)

### Epic 3: AI Content Assistant
- 🟡 Week 1-4: Chat interface and tools (Planned)

This document serves as the canonical reference for WordWise's hybrid architecture. The system combines the instant responsiveness of client-side retext analysis with the contextual intelligence of server-side AI, delivering a writing assistant that feels both immediate and intelligent.