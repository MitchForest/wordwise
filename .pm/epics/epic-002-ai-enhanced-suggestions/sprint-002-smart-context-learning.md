# Sprint 002: Smart Context & Learning Foundation

**Epic**: 002 - AI-Enhanced Suggestions  
**Duration**: 5 days  
**Status**: Planning

## Sprint Goal
Improve AI enhancement quality through better context awareness, implement user action tracking for future learning, add incremental analysis for cost efficiency, and create a usage dashboard.

## Key Features

### 1. Context-Aware Enhancement

#### 1.1 Enhanced Document Context with Paragraph-Level Analysis
```typescript
// services/ai/document-context.ts (enhanced version)
import { createHash } from 'crypto';

export interface ParagraphContext {
  id: string;
  content: string;
  hash: string;
  position: number;
  hasChanged: boolean;
  suggestions: string[]; // suggestion IDs in this paragraph
}

export interface EnhancedDocumentContext extends DocumentContext {
  paragraphs: ParagraphContext[];
  previousHashes?: Map<string, string>; // For tracking changes
  documentLength: number;
  averageParagraphLength: number;
  writingStyle: WritingStyle;
}

export interface WritingStyle {
  sentenceComplexity: 'simple' | 'moderate' | 'complex';
  vocabularyLevel: 'basic' | 'intermediate' | 'advanced';
  tone: 'formal' | 'casual' | 'neutral' | 'academic' | 'conversational';
  voice: 'active' | 'passive' | 'mixed';
}

export class EnhancedDocumentContextExtractor {
  private previousHashes = new Map<string, string>();
  
  extract(
    doc: any, 
    suggestions: UnifiedSuggestion[],
    previousContext?: EnhancedDocumentContext
  ): EnhancedDocumentContext {
    const paragraphs = this.extractParagraphContexts(doc, suggestions, previousContext);
    const writingStyle = this.analyzeWritingStyle(paragraphs);
    
    return {
      title: this.extractTitle(doc),
      firstParagraph: paragraphs[0]?.content || '',
      detectedTopic: this.detectEnhancedTopic(paragraphs),
      detectedTone: writingStyle.tone,
      paragraphs,
      documentLength: doc.textContent.length,
      averageParagraphLength: this.calculateAverageParagraphLength(paragraphs),
      writingStyle,
      previousHashes: new Map(this.previousHashes)
    };
  }
  
  private extractParagraphContexts(
    doc: any,
    suggestions: UnifiedSuggestion[],
    previousContext?: EnhancedDocumentContext
  ): ParagraphContext[] {
    const paragraphs: ParagraphContext[] = [];
    let position = 0;
    let paragraphIndex = 0;
    
    // Create suggestion position map
    const suggestionPositions = new Map<number, string[]>();
    suggestions.forEach(s => {
      if (s.originalFrom !== undefined) {
        const existing = suggestionPositions.get(s.originalFrom) || [];
        existing.push(s.id);
        suggestionPositions.set(s.originalFrom, existing);
      }
    });
    
    doc.descendants((node: any) => {
      if (node.type.name === 'paragraph') {
        const content = node.textContent;
        const hash = createHash('sha256').update(content).digest('hex');
        const id = `para-${paragraphIndex}`;
        
        // Check if paragraph changed
        const previousHash = previousContext?.paragraphs[paragraphIndex]?.hash;
        const hasChanged = !previousHash || previousHash !== hash;
        
        // Find suggestions in this paragraph
        const paragraphSuggestions: string[] = [];
        for (let i = position; i < position + node.nodeSize; i++) {
          const suggs = suggestionPositions.get(i);
          if (suggs) {
            paragraphSuggestions.push(...suggs);
          }
        }
        
        paragraphs.push({
          id,
          content,
          hash,
          position: paragraphIndex,
          hasChanged,
          suggestions: paragraphSuggestions
        });
        
        // Update hash tracking
        this.previousHashes.set(id, hash);
        
        paragraphIndex++;
      }
      position += node.nodeSize;
    });
    
    return paragraphs;
  }
  
  private analyzeWritingStyle(paragraphs: ParagraphContext[]): WritingStyle {
    const allText = paragraphs.map(p => p.content).join(' ');
    const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Analyze sentence complexity
    const avgWordsPerSentence = sentences.reduce((sum, s) => 
      sum + s.trim().split(/\s+/).length, 0) / sentences.length;
    
    const sentenceComplexity = 
      avgWordsPerSentence < 15 ? 'simple' :
      avgWordsPerSentence < 25 ? 'moderate' : 'complex';
    
    // Analyze vocabulary
    const complexWords = allText.match(/\b\w{10,}\b/g) || [];
    const vocabularyLevel = 
      complexWords.length < 5 ? 'basic' :
      complexWords.length < 20 ? 'intermediate' : 'advanced';
    
    // Analyze tone
    const formalIndicators = ['therefore', 'however', 'furthermore', 'consequently'];
    const casualIndicators = ["I'm", "you're", "we're", "gonna", "wanna"];
    const academicIndicators = ['research', 'study', 'analysis', 'hypothesis'];
    
    const formalCount = formalIndicators.filter(w => allText.includes(w)).length;
    const casualCount = casualIndicators.filter(w => allText.includes(w)).length;
    const academicCount = academicIndicators.filter(w => allText.includes(w)).length;
    
    let tone: WritingStyle['tone'] = 'neutral';
    if (academicCount > 3) tone = 'academic';
    else if (casualCount > formalCount) tone = 'casual';
    else if (formalCount > casualCount) tone = 'formal';
    else if (casualCount > 0) tone = 'conversational';
    
    // Analyze voice
    const passiveIndicators = ['was', 'were', 'been', 'being', 'is', 'are', 'am'];
    const passiveCount = sentences.filter(s => 
      passiveIndicators.some(w => s.includes(` ${w} `) && s.includes('by'))
    ).length;
    
    const voice = 
      passiveCount > sentences.length * 0.3 ? 'passive' :
      passiveCount < sentences.length * 0.1 ? 'active' : 'mixed';
    
    return { sentenceComplexity, vocabularyLevel, tone, voice };
  }
  
  private detectEnhancedTopic(paragraphs: ParagraphContext[]): string {
    // More sophisticated topic detection using TF-IDF-like approach
    const allText = paragraphs.map(p => p.content).join(' ').toLowerCase();
    const words = allText.match(/\b[a-z]{4,}\b/g) || [];
    
    // Remove common words
    const stopWords = new Set(['that', 'this', 'with', 'from', 'have', 'been', 'were', 'what', 'when', 'where', 'which', 'while']);
    const meaningfulWords = words.filter(w => !stopWords.has(w));
    
    // Count word frequencies
    const wordFreq = meaningfulWords.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Find most frequent meaningful words
    const topWords = Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
    
    // Try to identify topic from top words
    const techWords = ['code', 'software', 'programming', 'development', 'application'];
    const businessWords = ['business', 'marketing', 'sales', 'customer', 'revenue'];
    const healthWords = ['health', 'medical', 'patient', 'treatment', 'care'];
    
    if (topWords.some(w => techWords.includes(w))) return 'technology';
    if (topWords.some(w => businessWords.includes(w))) return 'business';
    if (topWords.some(w => healthWords.includes(w))) return 'health';
    
    return topWords[0] || 'general';
  }
  
  private calculateAverageParagraphLength(paragraphs: ParagraphContext[]): number {
    if (paragraphs.length === 0) return 0;
    const totalLength = paragraphs.reduce((sum, p) => sum + p.content.length, 0);
    return Math.round(totalLength / paragraphs.length);
  }
}
```

#### 1.2 Incremental Analysis System
```typescript
// services/ai/incremental-analyzer.ts
export interface IncrementalAnalysisResult {
  changedParagraphs: ParagraphContext[];
  unchangedParagraphs: ParagraphContext[];
  newSuggestions: EnhancedSuggestion[];
  cachedSuggestions: EnhancedSuggestion[];
  totalParagraphs: number;
  analyzedParagraphs: number;
  cacheHitRate: number;
}

export class IncrementalAnalyzer {
  private paragraphCache = new Map<string, EnhancedSuggestion[]>();
  
  async analyzeIncrementally(
    context: EnhancedDocumentContext,
    allSuggestions: UnifiedSuggestion[],
    enhancementService: AIEnhancementService
  ): Promise<IncrementalAnalysisResult> {
    const changedParagraphs: ParagraphContext[] = [];
    const unchangedParagraphs: ParagraphContext[] = [];
    const cachedSuggestions: EnhancedSuggestion[] = [];
    const suggestionsToEnhance: UnifiedSuggestion[] = [];
    
    // Separate changed and unchanged paragraphs
    for (const paragraph of context.paragraphs) {
      if (paragraph.hasChanged || !this.paragraphCache.has(paragraph.hash)) {
        changedParagraphs.push(paragraph);
        
        // Get suggestions for this paragraph
        const paragraphSuggestions = allSuggestions.filter(s => 
          paragraph.suggestions.includes(s.id)
        );
        suggestionsToEnhance.push(...paragraphSuggestions);
      } else {
        unchangedParagraphs.push(paragraph);
        
        // Use cached enhancements
        const cached = this.paragraphCache.get(paragraph.hash);
        if (cached) {
          cachedSuggestions.push(...cached);
        }
      }
    }
    
    // Enhance only suggestions from changed paragraphs
    let newSuggestions: EnhancedSuggestion[] = [];
    if (suggestionsToEnhance.length > 0) {
      console.log(`[Incremental Analysis] Enhancing ${suggestionsToEnhance.length} suggestions from ${changedParagraphs.length} changed paragraphs`);
      
      newSuggestions = await enhancementService.enhanceAllSuggestions(
        suggestionsToEnhance,
        context
      );
      
      // Update cache
      this.updateParagraphCache(changedParagraphs, newSuggestions);
    }
    
    const cacheHitRate = unchangedParagraphs.length / context.paragraphs.length;
    
    return {
      changedParagraphs,
      unchangedParagraphs,
      newSuggestions,
      cachedSuggestions,
      totalParagraphs: context.paragraphs.length,
      analyzedParagraphs: changedParagraphs.length,
      cacheHitRate
    };
  }
  
  private updateParagraphCache(
    paragraphs: ParagraphContext[],
    suggestions: EnhancedSuggestion[]
  ): void {
    // Group suggestions by paragraph
    const suggestionsByParagraph = new Map<string, EnhancedSuggestion[]>();
    
    paragraphs.forEach(para => {
      const paraSuggestions = suggestions.filter(s => 
        para.suggestions.includes(s.id)
      );
      suggestionsByParagraph.set(para.hash, paraSuggestions);
    });
    
    // Update cache
    suggestionsByParagraph.forEach((suggs, hash) => {
      this.paragraphCache.set(hash, suggs);
    });
    
    // Limit cache size (LRU-style)
    if (this.paragraphCache.size > 1000) {
      const firstKey = this.paragraphCache.keys().next().value;
      if (firstKey) {
        this.paragraphCache.delete(firstKey);
      }
    }
  }
  
  clearCache(): void {
    this.paragraphCache.clear();
  }
  
  getCacheStats(): { size: number; entries: number } {
    let totalSize = 0;
    this.paragraphCache.forEach(suggestions => {
      totalSize += JSON.stringify(suggestions).length;
    });
    
    return {
      size: totalSize,
      entries: this.paragraphCache.size
    };
  }
}
```

### 2. User Action Tracking for Learning

#### 2.1 Suggestion Feedback Tracking
```typescript
// services/ai/suggestion-feedback.ts
import { db } from '@/lib/db';
import { pgTable, text, timestamp, jsonb, boolean, real } from 'drizzle-orm/pg-core';

// Add to schema.ts
export const suggestionFeedback = pgTable('suggestion_feedback', {
  id: text('id').primaryKey(), // userId-suggestionId-timestamp
  userId: text('user_id').notNull().references(() => user.id),
  documentId: text('document_id').notNull(),
  suggestionId: text('suggestion_id').notNull(),
  
  // Suggestion details
  category: text('category').notNull(),
  subCategory: text('sub_category').notNull(),
  originalText: text('original_text').notNull(),
  suggestedFix: text('suggested_fix'),
  aiFix: text('ai_fix'),
  aiConfidence: real('ai_confidence'),
  
  // User action
  action: text('action').notNull(), // 'accepted' | 'rejected' | 'modified' | 'ignored'
  appliedFix: text('applied_fix'), // What was actually applied
  timeToAction: integer('time_to_action'), // Milliseconds from suggestion shown to action
  
  // Context
  documentContext: jsonb('document_context').$type<{
    topic: string;
    tone: string;
    paragraphContent: string;
  }>(),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
});

export class SuggestionFeedbackTracker {
  private pendingSuggestions = new Map<string, {
    suggestion: EnhancedSuggestion;
    shownAt: number;
    documentId: string;
    context: any;
  }>();
  
  // Track when a suggestion is shown to user
  trackSuggestionShown(
    userId: string,
    documentId: string,
    suggestion: EnhancedSuggestion,
    context: any
  ): void {
    const key = `${userId}-${suggestion.id}`;
    this.pendingSuggestions.set(key, {
      suggestion,
      shownAt: Date.now(),
      documentId,
      context
    });
  }
  
  // Track user action on suggestion
  async trackUserAction(
    userId: string,
    suggestionId: string,
    action: 'accepted' | 'rejected' | 'modified' | 'ignored',
    appliedFix?: string
  ): Promise<void> {
    const key = `${userId}-${suggestionId}`;
    const pending = this.pendingSuggestions.get(key);
    
    if (!pending) {
      console.warn(`[Feedback] No pending suggestion found for ${key}`);
      return;
    }
    
    const timeToAction = Date.now() - pending.shownAt;
    const { suggestion, documentId, context } = pending;
    
    try {
      await db.insert(suggestionFeedback).values({
        id: `${userId}-${suggestionId}-${Date.now()}`,
        userId,
        documentId,
        suggestionId,
        category: suggestion.category,
        subCategory: suggestion.subCategory,
        originalText: suggestion.context.text,
        suggestedFix: suggestion.actions[0]?.value,
        aiFix: suggestion.aiFix,
        aiConfidence: suggestion.aiConfidence,
        action,
        appliedFix,
        timeToAction,
        documentContext: {
          topic: context.detectedTopic || 'unknown',
          tone: context.detectedTone || 'neutral',
          paragraphContent: context.paragraphContent || ''
        }
      });
      
      // Clean up
      this.pendingSuggestions.delete(key);
      
      console.log(`[Feedback] Tracked ${action} for ${suggestion.category}:${suggestion.subCategory}`);
    } catch (error) {
      console.error('[Feedback] Error tracking user action:', error);
    }
  }
  
  // Get user preferences based on historical actions
  async getUserPreferences(userId: string): Promise<UserWritingPreferences> {
    const feedback = await db.query.suggestionFeedback.findMany({
      where: eq(suggestionFeedback.userId, userId),
      orderBy: desc(suggestionFeedback.createdAt),
      limit: 1000
    });
    
    return this.analyzeUserPreferences(feedback);
  }
  
  private analyzeUserPreferences(feedback: SuggestionFeedback[]): UserWritingPreferences {
    const acceptanceRates = new Map<string, number>();
    const preferredFixes = new Map<string, string[]>();
    const avgTimeToAction = new Map<string, number>();
    
    // Group by category and calculate metrics
    const categoryGroups = this.groupBy(feedback, f => `${f.category}:${f.subCategory}`);
    
    categoryGroups.forEach((items, key) => {
      const accepted = items.filter(f => f.action === 'accepted').length;
      const total = items.length;
      acceptanceRates.set(key, accepted / total);
      
      // Track preferred fixes
      const fixes = items
        .filter(f => f.action === 'accepted' && f.appliedFix)
        .map(f => f.appliedFix!);
      preferredFixes.set(key, this.getMostCommon(fixes, 5));
      
      // Average time to action
      const times = items
        .filter(f => f.timeToAction)
        .map(f => f.timeToAction!);
      if (times.length > 0) {
        avgTimeToAction.set(key, times.reduce((a, b) => a + b, 0) / times.length);
      }
    });
    
    // Analyze writing style preferences
    const acceptedSuggestions = feedback.filter(f => f.action === 'accepted');
    const tonePreference = this.getMostCommon(
      acceptedSuggestions.map(f => f.documentContext.tone),
      1
    )[0] || 'neutral';
    
    return {
      acceptanceRates: Object.fromEntries(acceptanceRates),
      preferredFixes: Object.fromEntries(preferredFixes),
      avgTimeToAction: Object.fromEntries(avgTimeToAction),
      writingStyle: {
        preferredTone: tonePreference,
        commonCorrections: this.extractCommonCorrections(acceptedSuggestions),
        ignoredRules: this.extractIgnoredRules(feedback)
      }
    };
  }
  
  private groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
    const groups = new Map<string, T[]>();
    items.forEach(item => {
      const key = keyFn(item);
      const group = groups.get(key) || [];
      group.push(item);
      groups.set(key, group);
    });
    return groups;
  }
  
  private getMostCommon<T>(items: T[], n: number): T[] {
    const counts = new Map<T, number>();
    items.forEach(item => {
      counts.set(item, (counts.get(item) || 0) + 1);
    });
    
    return Array.from(counts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, n)
      .map(([item]) => item);
  }
  
  private extractCommonCorrections(feedback: SuggestionFeedback[]): CommonCorrection[] {
    const corrections = new Map<string, number>();
    
    feedback.forEach(f => {
      if (f.originalText && f.appliedFix) {
        const key = `${f.originalText} -> ${f.appliedFix}`;
        corrections.set(key, (corrections.get(key) || 0) + 1);
      }
    });
    
    return Array.from(corrections.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([correction, count]) => {
        const [from, to] = correction.split(' -> ');
        return { from, to, count };
      });
  }
  
  private extractIgnoredRules(feedback: SuggestionFeedback[]): string[] {
    const rejectionRates = new Map<string, number>();
    
    const groups = this.groupBy(feedback, f => f.subCategory);
    groups.forEach((items, subCategory) => {
      const rejected = items.filter(f => 
        f.action === 'rejected' || f.action === 'ignored'
      ).length;
      const rate = rejected / items.length;
      if (rate > 0.8) { // 80% rejection rate
        rejectionRates.set(subCategory, rate);
      }
    });
    
    return Array.from(rejectionRates.keys());
  }
}

// Types
export interface UserWritingPreferences {
  acceptanceRates: Record<string, number>; // category:subCategory -> rate
  preferredFixes: Record<string, string[]>; // category:subCategory -> common fixes
  avgTimeToAction: Record<string, number>; // category:subCategory -> milliseconds
  writingStyle: {
    preferredTone: string;
    commonCorrections: CommonCorrection[];
    ignoredRules: string[]; // subCategories that user consistently ignores
  };
}

export interface CommonCorrection {
  from: string;
  to: string;
  count: number;
}
```

#### 2.2 Integration with Suggestion Context
```typescript
// contexts/SuggestionContext.tsx (additions)
import { SuggestionFeedbackTracker } from '@/services/ai/suggestion-feedback';

const feedbackTracker = new SuggestionFeedbackTracker();

// Add to context
const trackSuggestionShown = useCallback((suggestion: EnhancedSuggestion) => {
  if (session?.user?.id && documentId) {
    feedbackTracker.trackSuggestionShown(
      session.user.id,
      documentId,
      suggestion,
      {
        detectedTopic: documentContext?.detectedTopic,
        detectedTone: documentContext?.detectedTone,
        paragraphContent: documentContext?.paragraphs?.find(p => 
          p.suggestions.includes(suggestion.id)
        )?.content
      }
    );
  }
}, [session, documentId, documentContext]);

// Update applySuggestion to track feedback
const applySuggestion = useCallback((suggestionId: string, value: string) => {
  const suggestion = suggestions.find(s => s.id === suggestionId);
  if (!suggestion || !editor) return;
  
  // Track user action
  if (session?.user?.id) {
    const action = value === suggestion.actions[0]?.value ? 'accepted' : 'modified';
    feedbackTracker.trackUserAction(
      session.user.id,
      suggestionId,
      action,
      value
    );
  }
  
  // ... existing apply logic ...
}, [suggestions, editor, session]);

// Update ignoreSuggestion to track feedback
const ignoreSuggestion = useCallback((suggestionId: string) => {
  // Track user action
  if (session?.user?.id) {
    feedbackTracker.trackUserAction(
      session.user.id,
      suggestionId,
      'rejected'
    );
  }
  
  // ... existing ignore logic ...
}, [session]);
```

### 3. Usage Dashboard

#### 3.1 AI Usage Component
```typescript
// components/settings/AIUsageDashboard.tsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Sparkles, TrendingUp, Clock, Check } from 'lucide-react';
import { getUserAIUsage } from '@/services/ai/usage-limiter';

export function AIUsageDashboard({ userId }: { userId: string }) {
  const [usage, setUsage] = useState<{
    used: number;
    limit: number;
    remaining: number;
  } | null>(null);
  const [preferences, setPreferences] = useState<UserWritingPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadData() {
      try {
        const [usageData, prefsData] = await Promise.all([
          getUserAIUsage(userId),
          fetch(`/api/user/preferences/${userId}`).then(r => r.json())
        ]);
        
        setUsage(usageData);
        setPreferences(prefsData);
      } catch (error) {
        console.error('Failed to load AI usage data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [userId]);
  
  if (loading) {
    return <div className="animate-pulse">Loading usage data...</div>;
  }
  
  if (!usage) {
    return <div>Failed to load usage data</div>;
  }
  
  const usagePercentage = (usage.used / usage.limit) * 100;
  
  return (
    <div className="space-y-6">
      {/* Daily Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI Enhancement Usage
          </CardTitle>
          <CardDescription>
            Your daily AI enhancement limit resets at midnight
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Used today</span>
              <span className="font-medium">
                {usage.used} / {usage.limit} enhancements
              </span>
            </div>
            <Progress value={usagePercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {usage.remaining} enhancements remaining today
            </p>
          </div>
          
          {usagePercentage > 80 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                You're approaching your daily limit. Enhancements will be disabled when the limit is reached.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Writing Insights */}
      {preferences && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Your Writing Insights
            </CardTitle>
            <CardDescription>
              Based on your suggestion acceptance patterns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Acceptance Rates */}
            <div>
              <h4 className="text-sm font-medium mb-2">Suggestion Acceptance Rates</h4>
              <div className="space-y-2">
                {Object.entries(preferences.acceptanceRates)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([category, rate]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm capitalize">
                        {category.replace(':', ' - ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${rate * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">
                          {Math.round(rate * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            
            {/* Common Corrections */}
            <div>
              <h4 className="text-sm font-medium mb-2">Your Common Corrections</h4>
              <div className="space-y-1">
                {preferences.writingStyle.commonCorrections.slice(0, 5).map((correction, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <code className="px-1 py-0.5 bg-red-50 text-red-600 rounded text-xs line-through">
                      {correction.from}
                    </code>
                    <span className="text-gray-400">→</span>
                    <code className="px-1 py-0.5 bg-green-50 text-green-600 rounded text-xs">
                      {correction.to}
                    </code>
                    <span className="text-xs text-gray-400">({correction.count}x)</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Response Time */}
            <div>
              <h4 className="text-sm font-medium mb-2">Average Response Time</h4>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm">
                  {Math.round(
                    Object.values(preferences.avgTimeToAction).reduce((a, b) => a + b, 0) / 
                    Object.values(preferences.avgTimeToAction).length / 1000
                  )}s average time to action
                </span>
              </div>
            </div>
            
            {/* Ignored Rules */}
            {preferences.writingStyle.ignoredRules.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Rules You Often Skip</h4>
                <div className="flex flex-wrap gap-2">
                  {preferences.writingStyle.ignoredRules.map(rule => (
                    <span 
                      key={rule}
                      className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                    >
                      {rule.replace('-', ' ')}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  We'll reduce suggestions for these rules in the future
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

#### 3.2 Settings Integration
```typescript
// app/settings/page.tsx (additions)
import { AIUsageDashboard } from '@/components/settings/AIUsageDashboard';

// Add new tab for AI Usage
<TabsContent value="ai-usage">
  <AIUsageDashboard userId={session.user.id} />
</TabsContent>
```

### 4. Enhanced AI Service with Context

#### 4.1 Updated AI Enhancement Service with Streaming
```typescript
// services/ai/enhancement-service.ts (updates)
import { streamObject, APICallError } from 'ai';
import { openai } from '@ai-sdk/openai';

export class AIEnhancementService {
  private incrementalAnalyzer = new IncrementalAnalyzer();
  
  async enhanceWithContext(
    suggestions: UnifiedSuggestion[],
    context: EnhancedDocumentContext,
    userPreferences?: UserWritingPreferences
  ): Promise<IncrementalAnalysisResult> {
    // Use incremental analysis
    const result = await this.incrementalAnalyzer.analyzeIncrementally(
      context,
      suggestions,
      this
    );
    
    console.log(`[AI Enhancement] Incremental analysis:`, {
      total: result.totalParagraphs,
      analyzed: result.analyzedParagraphs,
      cacheHitRate: `${Math.round(result.cacheHitRate * 100)}%`,
      cached: result.cachedSuggestions.length,
      new: result.newSuggestions.length
    });
    
    return result;
  }
  
  // New streaming enhancement method for better UX
  async enhanceAllSuggestionsStream(
    suggestions: UnifiedSuggestion[],
    documentContext: DocumentContext | EnhancedDocumentContext,
    userPreferences?: UserWritingPreferences,
    onPartialUpdate?: (partial: Partial<EnhancedSuggestion>[]) => void
  ): Promise<EnhancedSuggestion[]> {
    // Check cache first
    const cacheKey = this.generateCacheKey(suggestions, documentContext);
    const cached = await analysisCache.getAsync<EnhancedSuggestion[]>(cacheKey);
    if (cached) {
      console.log('[AI Enhancement] Cache hit');
      return cached;
    }
    
    const prompt = this.buildEnhancedPrompt(suggestions, documentContext, userPreferences);
    
    try {
      const { partialObjectStream, object } = await streamObject({
        model: openai('gpt-4o'),
        schema: enhancementSchema,
        prompt,
        temperature: 0.3,
        onFinish: ({ usage, finishReason }) => {
          // Track token usage with AI SDK's built-in tracking
          aiPerformanceMonitor.trackTokenUsage({
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
            finishReason
          });
        }
      });
      
      // Stream partial results for immediate UI feedback
      for await (const partialObject of partialObjectStream) {
        if (partialObject.suggestions && onPartialUpdate) {
          const partialEnhanced = this.mergePartialEnhancements(
            suggestions,
            partialObject.suggestions
          );
          onPartialUpdate(partialEnhanced);
        }
      }
      
      // Get final result
      const finalResult = await object;
      const enhanced = this.mergeEnhancements(suggestions, finalResult.suggestions);
      
      // Cache for 1 hour
      analysisCache.set(cacheKey, enhanced, 3600);
      
      return enhanced;
    } catch (error) {
      // Use AI SDK's error handling
      if (APICallError.isAPICallError(error)) {
        console.error('[AI Enhancement] API Error:', {
          status: error.statusCode,
          message: error.message,
          isRetryable: error.isRetryable
        });
        
        if (error.statusCode === 429) {
          // Handle rate limit with retry-after header
          const retryAfter = error.responseHeaders?.['retry-after'];
          throw new Error(`Rate limited. Retry after ${retryAfter} seconds`);
        }
      }
      
      console.error('[AI Enhancement] Error:', error);
      return suggestions.map(s => ({ ...s, aiError: true }));
    }
  }
  
  private mergePartialEnhancements(
    suggestions: UnifiedSuggestion[],
    partialEnhancements: any[]
  ): Partial<EnhancedSuggestion>[] {
    return suggestions.map(suggestion => {
      const partial = partialEnhancements.find(e => e.id === suggestion.id);
      if (!partial) return { id: suggestion.id };
      
      return {
        id: suggestion.id,
        aiEnhanced: true,
        aiFix: partial.enhancedFix,
        aiConfidence: partial.confidence,
        isEnhancing: !partial.enhancedFix // Still processing if no fix yet
      };
    });
  }
  
  async enhanceAllSuggestions(
    suggestions: UnifiedSuggestion[],
    documentContext: DocumentContext | EnhancedDocumentContext,
    userPreferences?: UserWritingPreferences
  ): Promise<EnhancedSuggestion[]> {
    // Check cache first
    const cacheKey = this.generateCacheKey(suggestions, documentContext);
    const cached = await analysisCache.getAsync<EnhancedSuggestion[]>(cacheKey);
    if (cached) {
      console.log('[AI Enhancement] Cache hit');
      return cached;
    }
    
    // Build enhanced prompt with user preferences
    const prompt = this.buildEnhancedPrompt(
      suggestions,
      documentContext,
      userPreferences
    );
    
    try {
      const { object } = await generateObject({
        model: this.model,
        schema: enhancementSchema,
        prompt,
        temperature: 0.3,
      });
      
      const enhanced = this.mergeEnhancements(suggestions, object.suggestions);
      
      // Cache for 1 hour
      analysisCache.set(cacheKey, enhanced, 3600);
      
      return enhanced;
    } catch (error) {
      console.error('[AI Enhancement] Error:', error);
      return suggestions.map(s => ({ ...s, aiError: true }));
    }
  }
  
  private buildEnhancedPrompt(
    suggestions: UnifiedSuggestion[],
    context: DocumentContext | EnhancedDocumentContext,
    preferences?: UserWritingPreferences
  ): string {
    const isEnhanced = 'writingStyle' in context;
    
    let prompt = `You are an expert writing assistant. Analyze and enhance these writing suggestions.

Document Context:
- Title: ${context.title || 'Untitled'}
- Topic: ${context.detectedTopic || 'General'}`;

    if (isEnhanced) {
      const enhancedContext = context as EnhancedDocumentContext;
      prompt += `
- Writing Style: ${enhancedContext.writingStyle.tone} tone, ${enhancedContext.writingStyle.vocabularyLevel} vocabulary
- Document Length: ${enhancedContext.documentLength} characters
- Average Paragraph: ${enhancedContext.averageParagraphLength} characters`;
    }

    if (preferences) {
      prompt += `

User Preferences:
- Preferred tone: ${preferences.writingStyle.preferredTone}
- Often ignores: ${preferences.writingStyle.ignoredRules.join(', ')}
- Common corrections: ${preferences.writingStyle.commonCorrections.slice(0, 3).map(c => `${c.from} → ${c.to}`).join(', ')}`;
    }

    prompt += `

For each suggestion:
1. If it has fixes, evaluate if they're contextually appropriate
2. Consider the user's writing style and preferences
3. If fixes could be better, provide an enhanced fix
4. If no fixes exist, generate the best fix
5. Rate your confidence (0-1) in the enhancement
6. Explain your reasoning briefly

${isEnhanced && preferences ? 'Pay special attention to maintaining consistency with the document style and user preferences.' : ''}

Suggestions to enhance:
${suggestions.map(s => {
  const paragraphContext = isEnhanced ? 
    (context as EnhancedDocumentContext).paragraphs.find(p => 
      p.suggestions.includes(s.id)
    )?.content : '';
  
  return `
ID: ${s.id}
Category: ${s.category}
Error text: "${s.matchText}"
Issue: ${s.message}
Current fixes: ${s.actions.filter(a => a.type === 'fix').map(a => `"${a.value}"`).join(', ') || 'none'}
${paragraphContext ? `Paragraph: "${paragraphContext.substring(0, 200)}..."` : ''}
`;
}).join('\n')}`;

    return prompt;
  }
}
```

### 5. API Updates

#### 5.1 User Preferences API
```typescript
// app/api/user/preferences/[userId]/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SuggestionFeedbackTracker } from '@/services/ai/suggestion-feedback';

const feedbackTracker = new SuggestionFeedbackTracker();

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.id !== params.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const preferences = await feedbackTracker.getUserPreferences(params.userId);
    
    return NextResponse.json(preferences);
  } catch (error) {
    console.error('[User Preferences API] Error:', error);
    return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 });
  }
}
```

#### 5.2 Updated AI Enhancement API with Streaming Support
```typescript
// app/api/analysis/ai-enhance/route.ts (updates)
export async function POST(request: Request) {
  try {
    // Check if client wants streaming
    const acceptsStream = request.headers.get('accept')?.includes('text/event-stream');
    
    // ... existing auth and limit checks ...
    
    // Extract enhanced context
    const enhancedContext = contextExtractor.extract(doc, suggestions);
    enhancedContext.title = metadata?.title || enhancedContext.title;
    
    // Get user preferences
    const preferences = await feedbackTracker.getUserPreferences(session.user.id);
    
    if (acceptsStream) {
      // Return streaming response
      const stream = new TransformStream();
      const writer = stream.writable.getWriter();
      const encoder = new TextEncoder();
      
      // Start streaming in background
      (async () => {
        try {
          await enhancementService.enhanceAllSuggestionsStream(
            suggestions,
            enhancedContext,
            preferences,
            // Send partial updates
            async (partial) => {
              const data = JSON.stringify({ 
                type: 'partial',
                enhanced: partial 
              });
              await writer.write(encoder.encode(`data: ${data}\n\n`));
            }
          ).then(async (final) => {
            // Send final result
            const data = JSON.stringify({ 
              type: 'final',
              enhanced: final,
              stats: {
                total: final.length,
                withAIFixes: final.filter(s => s.aiFix).length
              }
            });
            await writer.write(encoder.encode(`data: ${data}\n\n`));
            
            // Track usage
            await trackAIUsage(session.user.id, final.length);
          });
        } catch (error) {
          const errorData = JSON.stringify({ 
            type: 'error',
            error: error.message 
          });
          await writer.write(encoder.encode(`data: ${errorData}\n\n`));
        } finally {
          await writer.close();
        }
      })();
      
      return new Response(stream.readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Non-streaming fallback
      const result = await enhancementService.enhanceWithContext(
        suggestions,
        enhancedContext,
        preferences
      );
      
      // Combine new and cached suggestions
      const allEnhanced = [...result.newSuggestions, ...result.cachedSuggestions];
      
      // Track usage (only for new enhancements)
      await trackAIUsage(session.user.id, result.newSuggestions.length);
      
      return NextResponse.json({ 
        enhanced: allEnhanced,
        stats: {
          analyzed: result.analyzedParagraphs,
          total: result.totalParagraphs,
          cacheHitRate: result.cacheHitRate
        }
      });
    }
  } catch (error) {
    // ... existing error handling ...
  }
}

// Add new hook for streaming client
// hooks/useStreamingEnhancement.ts
export function useStreamingEnhancement() {
  const [partialEnhancements, setPartialEnhancements] = useState<Map<string, Partial<EnhancedSuggestion>>>(new Map());
  const [isStreaming, setIsStreaming] = useState(false);
  
  const enhanceWithStream = useCallback(async (
    suggestions: UnifiedSuggestion[],
    doc: any,
    metadata: any
  ) => {
    setIsStreaming(true);
    setPartialEnhancements(new Map());
    
    try {
      const response = await fetch('/api/analysis/ai-enhance', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({ suggestions, doc, metadata })
      });
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');
      
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'partial') {
              // Update partial enhancements
              const newPartials = new Map();
              data.enhanced.forEach((e: Partial<EnhancedSuggestion>) => {
                if (e.id) newPartials.set(e.id, e);
              });
              setPartialEnhancements(newPartials);
            } else if (data.type === 'final') {
              // Process final result
              return data.enhanced;
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          }
        }
      }
    } finally {
      setIsStreaming(false);
    }
  }, []);
  
  return { enhanceWithStream, partialEnhancements, isStreaming };
}
```

## Database Migrations

```sql
-- migrations/add_suggestion_feedback.sql
CREATE TABLE IF NOT EXISTS suggestion_feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL,
  suggestion_id TEXT NOT NULL,
  
  -- Suggestion details
  category TEXT NOT NULL,
  sub_category TEXT NOT NULL,
  original_text TEXT NOT NULL,
  suggested_fix TEXT,
  ai_fix TEXT,
  ai_confidence REAL,
  
  -- User action
  action TEXT NOT NULL CHECK (action IN ('accepted', 'rejected', 'modified', 'ignored')),
  applied_fix TEXT,
  time_to_action INTEGER,
  
  -- Context
  document_context JSONB,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_feedback_user ON suggestion_feedback(user_id);
CREATE INDEX idx_feedback_category ON suggestion_feedback(category, sub_category);
CREATE INDEX idx_feedback_action ON suggestion_feedback(action);
CREATE INDEX idx_feedback_created ON suggestion_feedback(created_at);
```

## Testing Plan

### Unit Tests
```typescript
// tests/incremental-analysis.test.ts
describe('Incremental Analysis', () => {
  it('should only analyze changed paragraphs', () => {
    // Test paragraph change detection
  });
  
  it('should maintain cache for unchanged paragraphs', () => {
    // Test cache behavior
  });
  
  it('should calculate correct cache hit rates', () => {
    // Test metrics calculation
  });
});

// tests/user-preferences.test.ts
describe('User Preferences Analysis', () => {
  it('should correctly calculate acceptance rates', () => {
    // Test acceptance rate calculation
  });
  
  it('should identify commonly ignored rules', () => {
    // Test ignored rules detection
  });
});
```

## Success Metrics

- [ ] Incremental analysis reduces AI calls by 60%+
- [ ] User preferences successfully tracked and stored
- [ ] Context-aware enhancements show higher acceptance rate
- [ ] Usage dashboard provides clear insights
- [ ] Cache hit rate > 60% for typical editing sessions
- [ ] Preference-based suggestions have 20%+ higher acceptance

## Dependencies

- [ ] Database migrations for suggestion_feedback table
- [ ] Enhanced context extraction implemented
- [ ] User session available in suggestion context
- [ ] Sprint 001 completed successfully

## Notes

- Track feedback passively - don't interrupt user flow
- Use preferences as hints, not hard rules
- Monitor cache size to prevent memory issues
- Consider privacy implications of tracking
- Plan for data export/deletion for GDPR compliance 