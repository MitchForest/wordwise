/**
 * @file services/ai/types.ts
 * @purpose Type definitions for AI enhancement services
 * @created 2024-12-28
 */

import { UnifiedSuggestion } from '@/types/suggestions';

/**
 * Enhanced suggestion with AI-generated improvements
 */
export interface EnhancedSuggestion extends UnifiedSuggestion {
  // AI enhancement fields
  aiEnhanced?: boolean;
  aiFix?: string;
  aiConfidence?: number;
  aiReasoning?: string;
  shouldReplace?: boolean;
  alternativeFixes?: string[];
  aiError?: boolean;
  
  // Original fix before AI enhancement
  originalFix?: string;
  
  // UI state
  isEnhancing?: boolean;
}

/**
 * AI usage tracking for rate limiting
 */
export interface AIUsageStats {
  used: number;
  limit: number;
  remaining: number;
}

/**
 * AI enhancement request metadata
 */
export interface AIEnhancementRequest {
  suggestions: UnifiedSuggestion[];
  doc: any; // TipTap JSON document
  metadata: {
    title?: string;
    targetKeyword?: string;
    metaDescription?: string;
  };
}

/**
 * AI enhancement response
 */
export interface AIEnhancementResponse {
  enhanced: EnhancedSuggestion[];
  error?: string;
} 