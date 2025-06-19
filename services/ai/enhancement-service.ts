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
   * @purpose Enhance all suggestions with AI-powered improvements
   * @param suggestions - Array of suggestions to enhance
   * @param documentContext - Context about the document
   * @returns Array of enhanced suggestions with AI improvements
   */
  async enhanceAllSuggestions(
    suggestions: UnifiedSuggestion[],
    documentContext: DocumentContext
  ): Promise<EnhancedSuggestion[]> {
    // CHECK CACHE: Look for cached enhancements first
    const cacheKey = this.generateCacheKey(suggestions, documentContext);
    const cached = await analysisCache.getAsync<EnhancedSuggestion[]>(cacheKey);
    if (cached) {
      console.log('[AI Enhancement] Cache hit');
      return cached;
    }
    
    // ENHANCE: Batch enhance all suggestions in one API call
    const enhanced = await this.batchEnhance(suggestions, documentContext);
    
    // CACHE: Store results for 1 hour (AI enhancements are expensive)
    analysisCache.set(cacheKey, enhanced, 3600);
    
    return enhanced;
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
- First paragraph: ${context.firstParagraph}

For each suggestion:
1. If it has fixes, evaluate if they're contextually appropriate
2. If fixes could be better, provide an enhanced fix
3. If no fixes exist, generate the best fix
4. Rate your confidence (0-1) in the enhancement
5. Explain your reasoning briefly (max 20 words)

Suggestions to enhance:
${suggestions.map(s => `
ID: ${s.id}
Category: ${s.category}
Error text: "${s.matchText || s.context.text}"
Issue: ${s.message}
Current fixes: ${s.actions.filter(a => a.type === 'fix').map(a => `"${a.value}"`).join(', ') || 'none'}
Context: "${s.context.before || ''}[${s.matchText || s.context.text}]${s.context.after || ''}"
`).join('\n')}

Focus on:
- Contextual accuracy (especially for spelling suggestions)
- Clarity and conciseness
- Maintaining document tone (${context.detectedTone})
- Fixing the actual issue described
- Providing actionable alternatives when possible`;
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