/**
 * @file services/ai/enhancement-service.ts
 * @purpose AI service that enhances all suggestions with context-aware improvements
 * using a dedicated server-side endpoint.
 * @created 2024-07-26
 */

import { z } from 'zod';
import { UnifiedSuggestion, SuggestionAction } from '@/types/suggestions';
import { analysisCache } from '@/services/analysis/cache';
import { DocumentContext } from './document-context';

// SCHEMA: Define the structure for AI responses from our API endpoint
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
  ): Promise<UnifiedSuggestion[]> {
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
      return suggestions.map(s => ({ ...s, aiEnhanced: false } as UnifiedSuggestion));
    }
    
    // CHECK CACHE: Look for cached enhancements first
    const cacheKey = this.generateCacheKey(toEnhance, documentContext);
    const cached = await analysisCache.getAsync<UnifiedSuggestion[]>(cacheKey);
    if (cached) {
      console.log('[AI Enhancement] Cache hit');
      // Combine cached enhanced suggestions with non-enhanced ones
      const cachedMap = new Map(cached.map(s => [s.id, s]));
      return suggestions.map(s => {
        const cachedVersion = cachedMap.get(s.id);
        return cachedVersion || { ...s, aiEnhanced: false } as UnifiedSuggestion;
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
      return enhancedVersion || { ...s, aiEnhanced: false } as UnifiedSuggestion;
    });
  }
  
  /**
   * @purpose Batch enhance multiple suggestions by calling the server-side API
   * @param suggestions - Suggestions to enhance
   * @param context - Document context
   * @returns Enhanced suggestions
   */
  private async batchEnhance(
    suggestions: UnifiedSuggestion[],
    context: DocumentContext
  ): Promise<UnifiedSuggestion[]> {
    try {
      const response = await fetch('/api/analysis/ai-enhance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ suggestions, documentContext: context }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const result = await response.json();
      const validation = enhancementSchema.safeParse(result);

      if (!validation.success) {
        console.error('[AI Enhancement] Invalid response from server:', validation.error);
        throw new Error('Invalid response from enhancement API');
      }

      return this.mergeEnhancements(suggestions, validation.data.suggestions);

    } catch (error) {
      console.error('[AI Enhancement] Error:', error);
      
      // FALLBACK: Return original suggestions on error with error flag
      return suggestions.map(s => ({ 
        ...s, 
        aiError: true,
        aiEnhanced: false,
        isEnhancing: false
      } as UnifiedSuggestion));
    }
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
    // Generate a simple hash from key components
    const suggestionIds = suggestions.map(s => s.id).join(',');
    const contextString = `${context.title}-${context.detectedTopic}-${context.detectedTone}`;
    const fullString = `${suggestionIds}-${contextString}`;
    return `enhance-${this.simpleHash(fullString)}`;
  }

  /**
   * @purpose Simple hash function for cache key generation
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(16);
  }
  
  /**
   * @purpose Merge the AI enhancements back into the original suggestion objects
   * @param suggestions - The original suggestions
   * @param enhancements - The AI-generated enhancements from the API
   * @returns A new array of fully-enhanced suggestion objects
   */
  private mergeEnhancements(
    suggestions: UnifiedSuggestion[],
    enhancements: any[]
  ): UnifiedSuggestion[] {
    const enhancementMap = new Map(enhancements.map(e => [e.id, e]));
    
    return suggestions.map(original => {
      const enhancement = enhancementMap.get(original.id);
      
      if (enhancement) {
        let newActions: SuggestionAction[] = original.actions;

        if (enhancement.shouldReplace && enhancement.enhancedFix) {
          newActions = [{ 
            type: 'ai-fix',
            label: 'Accept AI Fix',
            value: enhancement.enhancedFix 
          }];
        }

        return {
          ...original,
          aiEnhanced: true,
          aiConfidence: enhancement.confidence,
          aiReasoning: enhancement.reasoning,
          isEnhancing: false,
          actions: newActions,
          alternativeFixes: enhancement.alternativeFixes || [],
        };
      }
      
      return { ...original, aiEnhanced: false, isEnhancing: false };
    });
  }
} 