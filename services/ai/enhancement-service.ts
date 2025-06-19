/**
 * @file services/ai/enhancement-service.ts
 * @purpose AI service that enhances all suggestions with context-aware improvements
 * using GPT-4o for better fixes and contextual understanding
 * @created 2024-12-28
 */

import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { UnifiedSuggestion } from '@/types/suggestions';
import { analysisCache } from '@/services/analysis/cache';
import { DocumentContext } from './document-context';
import { EnhancedSuggestion } from './types';

// SCHEMA: Define the structure for AI responses
const enhancementSchema = z.object({
  suggestions: z.array(z.object({
    id: z.string(),
    enhancedFix: z.string().optional(),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
    shouldReplace: z.boolean(),
    alternativeFixes: z.array(z.string()).optional()
  }))
});

export class AIEnhancementService {
  private model = openai('gpt-4o');
  
  /**
   * @purpose Determine if a suggestion needs AI enhancement
   * @param suggestion - The suggestion to evaluate
   * @returns true if enhancement would be beneficial
   */
  private shouldEnhance(suggestion: UnifiedSuggestion): boolean {
    // Skip if already enhanced
    if ('aiEnhanced' in suggestion && suggestion.aiEnhanced) {
      return false;
    }
    
    // Document-wide suggestions don't need enhancement
    if (suggestion.id.endsWith('-global')) {
      return false;
    }
    
    // Always enhance SEO suggestions - they often need better fixes
    if (suggestion.category === 'seo') {
      return true;
    }
    
    // Style suggestions often lack fixes - always enhance
    if (suggestion.category === 'style') {
      return true;
    }
    
    // Enhance if no fix available
    if (!suggestion.actions || suggestion.actions.length === 0) {
      return true;
    }
    
    // Enhance spelling for context (their/there/they're)
    if (suggestion.category === 'spelling' && suggestion.matchText) {
      const contextualWords = ['their', 'there', 'theyre', 'its', 'your', 'youre', 'to', 'too', 'two'];
      if (contextualWords.some(word => suggestion.matchText?.toLowerCase().includes(word))) {
        return true;
      }
    }
    
    // Skip grammar suggestions that already have clear fixes
    if (suggestion.category === 'grammar' && suggestion.actions.length > 0) {
      return false;
    }
    
    return false;
  }
  
  /**
   * @purpose Enhance all suggestions with AI-powered improvements
   * @param suggestions - Array of suggestions to enhance
   * @param documentContext - Context about the document
   * @returns Array of enhanced suggestions with AI improvements
   */
  async enhanceAllSuggestions(
    suggestions: UnifiedSuggestion[],
    documentContext: DocumentContext
  ): Promise<EnhancedSuggestion[]> {
    // FILTER: Determine which suggestions need enhancement
    const toEnhance = suggestions.filter(s => this.shouldEnhance(s));
    const noEnhancement = suggestions.filter(s => !this.shouldEnhance(s));
    
    console.log('[AI Enhancement] Selective enhancement:', {
      total: suggestions.length,
      toEnhance: toEnhance.length,
      skipping: noEnhancement.length
    });
    
    if (toEnhance.length === 0) {
      // Return all suggestions unchanged
      return suggestions.map(s => ({ ...s, aiEnhanced: false } as EnhancedSuggestion));
    }
    
    // CHECK CACHE: Look for cached enhancements first
    const cacheKey = this.generateCacheKey(toEnhance, documentContext);
    const cached = await analysisCache.getAsync<EnhancedSuggestion[]>(cacheKey);
    if (cached) {
      console.log('[AI Enhancement] Cache hit');
      // Combine cached enhanced suggestions with non-enhanced ones
      const cachedMap = new Map(cached.map(s => [s.id, s]));
      return suggestions.map(s => {
        const cachedVersion = cachedMap.get(s.id);
        return cachedVersion || { ...s, aiEnhanced: false } as EnhancedSuggestion;
      });
    }
    
    // ENHANCE: Only enhance suggestions that need it
    const enhanced = await this.batchEnhance(toEnhance, documentContext);
    
    // CACHE: Store results for 1 hour (AI enhancements are expensive)
    analysisCache.set(cacheKey, enhanced, 3600);
    
    // COMBINE: Merge enhanced and non-enhanced suggestions
    const enhancedMap = new Map(enhanced.map(s => [s.id, s]));
    
    return suggestions.map(s => {
      const enhancedVersion = enhancedMap.get(s.id);
      return enhancedVersion || { ...s, aiEnhanced: false } as EnhancedSuggestion;
    });
  }
  
  /**
   * @purpose Batch enhance multiple suggestions in a single API call
   * @param suggestions - Suggestions to enhance
   * @param context - Document context
   * @returns Enhanced suggestions
   */
  private async batchEnhance(
    suggestions: UnifiedSuggestion[],
    context: DocumentContext
  ): Promise<EnhancedSuggestion[]> {
    const prompt = this.buildEnhancementPrompt(suggestions, context);
    
    try {
      const { object } = await generateObject({
        model: this.model,
        schema: enhancementSchema,
        prompt,
        temperature: 0.3, // Lower for consistency
      });
      
      return this.mergeEnhancements(suggestions, object.suggestions);
    } catch (error) {
      console.error('[AI Enhancement] Error:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          console.log('[AI Enhancement] Rate limit exceeded');
        } else if (error.message.includes('timeout')) {
          console.log('[AI Enhancement] Request timeout');
        } else if (error.message.includes('Invalid API Key')) {
          console.error('[AI Enhancement] Invalid OpenAI API key');
        }
      }
      
      // FALLBACK: Return original suggestions on error with error flag
      return suggestions.map(s => ({ 
        ...s, 
        aiError: true,
        aiEnhanced: false,
        isEnhancing: false
      } as EnhancedSuggestion));
    }
  }
  
  /**
   * @purpose Build a comprehensive prompt for AI enhancement
   * @param suggestions - Suggestions to enhance
   * @param context - Document context
   * @returns Formatted prompt string
   */
  private buildEnhancementPrompt(
    suggestions: UnifiedSuggestion[],
    context: DocumentContext
  ): string {
    return `You are an expert writing assistant. Analyze and enhance these writing suggestions.

Document Context:
- Title: ${context.title || 'Untitled'}
- Topic: ${context.detectedTopic || 'General'}
- Tone: ${context.detectedTone || 'Neutral'}
- Target Keyword: ${context.targetKeyword || 'None specified'}
- Meta Description: ${context.metaDescription || 'Not set'}
- First paragraph: ${context.firstParagraph}

For each suggestion:
1. If it has fixes, evaluate if they're contextually appropriate
2. If fixes could be better, provide an enhanced fix
3. If no fixes exist, generate the best fix
4. Rate your confidence (0-1) in the enhancement
5. Explain your reasoning briefly (max 20 words)

CRITICAL STYLE RULES:
- For passive voice: ALWAYS restructure to active voice (e.g., "was written by" → "wrote")
- For weasel words: REMOVE them entirely or replace with specific facts
- For wordiness: Simplify and make concise
- For complex sentences: Break into shorter, clearer sentences

Examples:
- Passive: "The report was completed by the team" → "The team completed the report"
- Weasel: "Some experts believe" → "Dr. Smith's research shows" OR remove entirely
- Wordy: "due to the fact that" → "because"

For SEO suggestions specifically:
- If missing target keyword, suggest one based on the content
- Ensure keyword appears naturally in title, meta description, and H1
- Provide specific text improvements, not just advice
- Consider search intent and user value

Suggestions to enhance:
${suggestions.map(s => `
ID: ${s.id}
Category: ${s.category}
Error text: "${s.matchText || s.context.text}"
Issue: ${s.message}
Current fixes: ${s.actions.filter(a => a.type === 'fix').map(a => `"${a.value}"`).join(', ') || 'none'}
Context: "${s.context.before || ''}[${s.matchText || s.context.text}]${s.context.after || ''}"
${s.category === 'seo' ? `SEO Type: ${s.id.includes('title') ? 'Title' : s.id.includes('meta') ? 'Meta Description' : 'Content'}` : ''}
`).join('\n')}

Focus on:
- Contextual accuracy (especially for spelling suggestions)
- Clarity and conciseness
- Maintaining document tone (${context.detectedTone})
- Fixing the actual issue described
- Providing actionable alternatives when possible
- For SEO: specific keyword-optimized rewrites
- For style: MUST fix the underlying issue (passive→active, remove weasels, etc.)`;
  }
  
  /**
   * @purpose Generate a stable cache key for the enhancement request
   * @param suggestions - Suggestions being enhanced
   * @param context - Document context
   * @returns Cache key string
   */
  private generateCacheKey(
    suggestions: UnifiedSuggestion[],
    context: DocumentContext
  ): string {
    // Use Web Crypto API for Edge runtime compatibility
    const content = JSON.stringify({
      suggestionIds: suggestions.map(s => s.id).sort(),
      contextHash: this.simpleHash(context.firstParagraph)
    });
    return `ai-enhance-${this.simpleHash(content)}`;
  }
  
  /**
   * @purpose Simple hash function for Edge runtime compatibility
   * @param str - String to hash
   * @returns Hash string
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  /**
   * @purpose Merge AI enhancements with original suggestions
   * @param suggestions - Original suggestions
   * @param enhancements - AI enhancement results
   * @returns Merged enhanced suggestions
   */
  private mergeEnhancements(
    suggestions: UnifiedSuggestion[],
    enhancements: any[]
  ): EnhancedSuggestion[] {
    const enhancementMap = new Map(
      enhancements.map(e => [e.id, e])
    );
    
    return suggestions.map(suggestion => {
      const enhancement = enhancementMap.get(suggestion.id);
      if (!enhancement) {
        return suggestion as EnhancedSuggestion;
      }
      
      const originalFix = suggestion.actions.find(a => a.type === 'fix')?.value;
      
      return {
        ...suggestion,
        aiEnhanced: true,
        aiFix: enhancement.enhancedFix || originalFix,
        aiConfidence: enhancement.confidence,
        aiReasoning: enhancement.reasoning,
        shouldReplace: enhancement.shouldReplace,
        alternativeFixes: enhancement.alternativeFixes,
        originalFix: originalFix
      } as EnhancedSuggestion;
    });
  }
} 