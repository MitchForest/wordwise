/**
 * @file services/ai/ai-queue-manager.ts
 * @purpose Smart queue management for AI enhancement requests with batching
 * @created 2024-12-28
 */

import { UnifiedSuggestion } from '@/types/suggestions';
import { AIEnhancementService } from './enhancement-service';
import { DocumentContext } from './document-context';

// Create a singleton instance
const enhancementService = new AIEnhancementService();

interface QueueItem {
  suggestion: UnifiedSuggestion;
  timestamp: number;
  category: string;
}

export class AIQueueManager {
  private queue: QueueItem[] = [];
  private processing = false;
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 1000; // 1 second
  private readonly MAX_BATCH_SIZE = 10;
  private onUpdate: ((suggestions: UnifiedSuggestion[]) => void) | null = null;
  
  /**
   * @purpose Set callback for when enhanced suggestions are ready
   * @param callback - Function to call with enhanced suggestions
   */
  setUpdateCallback(callback: (suggestions: UnifiedSuggestion[]) => void) {
    this.onUpdate = callback;
  }
  
  /**
   * @purpose Add suggestions to the enhancement queue
   * @param suggestions - Suggestions to potentially enhance
   */
  enqueueSuggestions(suggestions: UnifiedSuggestion[]) {
    console.log('[AIQueue] Enqueuing suggestions:', suggestions.length);
    
    // Filter suggestions that need enhancement
    const needsEnhancement = suggestions.filter(s => 
      this.shouldEnhance(s) && !this.isInQueue(s.id)
    );
    
    if (needsEnhancement.length === 0) {
      console.log('[AIQueue] No suggestions need enhancement');
      return;
    }
    
    // Add to queue with timestamp
    const timestamp = Date.now();
    needsEnhancement.forEach(suggestion => {
      this.queue.push({
        suggestion,
        timestamp,
        category: suggestion.category
      });
    });
    
    console.log('[AIQueue] Queue size:', this.queue.length);
    
    // Reset batch timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    // Start batch timer
    this.batchTimer = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);
  }
  
  /**
   * @purpose Process a batch of suggestions
   * @modified 2024-12-28 - Smart batching by category
   */
  private async processBatch() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    console.log('[AIQueue] Processing batch, queue size:', this.queue.length);
    
    try {
      // Group by category for better context
      const categoryGroups = new Map<string, QueueItem[]>();
      
      this.queue.forEach(item => {
        if (!categoryGroups.has(item.category)) {
          categoryGroups.set(item.category, []);
        }
        categoryGroups.get(item.category)!.push(item);
      });
      
      const allEnhanced: UnifiedSuggestion[] = [];
      
      // Process each category group
      for (const [category, items] of categoryGroups) {
        // Take up to MAX_BATCH_SIZE from this category
        const batch = items.slice(0, this.MAX_BATCH_SIZE);
        const suggestions = batch.map(item => item.suggestion);
        
        console.log(`[AIQueue] Enhancing ${batch.length} ${category} suggestions`);
        
        try {
          const enhanced = await enhancementService.enhanceAllSuggestions(suggestions, {
            title: '',
            firstParagraph: '',
            metaDescription: ''
          });
          allEnhanced.push(...enhanced);
          
          // Remove processed items from queue
          batch.forEach(item => {
            const index = this.queue.findIndex(q => q.suggestion.id === item.suggestion.id);
            if (index !== -1) {
              this.queue.splice(index, 1);
            }
          });
        } catch (error) {
          console.error(`[AIQueue] Failed to enhance ${category} batch:`, error);
          // Remove failed items from queue to prevent infinite retries
          batch.forEach(item => {
            const index = this.queue.findIndex(q => q.suggestion.id === item.suggestion.id);
            if (index !== -1) {
              this.queue.splice(index, 1);
            }
          });
        }
      }
      
      // Notify with enhanced suggestions
      if (allEnhanced.length > 0 && this.onUpdate) {
        console.log('[AIQueue] Notifying with enhanced suggestions:', allEnhanced.length);
        this.onUpdate(allEnhanced);
      }
      
      // Process remaining queue items
      if (this.queue.length > 0) {
        console.log('[AIQueue] Remaining items in queue:', this.queue.length);
        this.batchTimer = setTimeout(() => {
          this.processBatch();
        }, this.BATCH_DELAY);
      }
    } finally {
      this.processing = false;
    }
  }
  
  /**
   * @purpose Check if a suggestion should be enhanced
   * @param suggestion - Suggestion to check
   * @returns True if should enhance
   */
  private shouldEnhance(suggestion: UnifiedSuggestion): boolean {
    // Already enhanced
    if ((suggestion as any).aiEnhanced) return false;
    
    // Skip if already has good fix
    if (suggestion.actions.length > 0) {
      const firstAction = suggestion.actions[0];
      if (firstAction.value && this.isGoodFix(firstAction.value, suggestion)) {
        return false;
      }
    }
    
    // Enhance all style suggestions
    if (suggestion.category === 'style') return true;
    
    // Enhance complex grammar
    if (suggestion.category === 'grammar' && 
        ['passive-voice', 'complex-sentence'].includes(suggestion.subCategory)) {
      return true;
    }
    
    // Enhance SEO suggestions (they often need context)
    if (suggestion.category === 'seo') return true;
    
    return false;
  }
  
  /**
   * @purpose Check if a fix is already good enough
   * @param fix - The proposed fix
   * @param suggestion - The suggestion
   * @returns True if fix is good
   */
  private isGoodFix(fix: string, suggestion: UnifiedSuggestion): boolean {
    // Simple replacements are usually fine
    if (suggestion.category === 'spelling') return true;
    
    // Check if fix is just removing/adding punctuation
    const original = suggestion.matchText || '';
    if (Math.abs(fix.length - original.length) <= 2) {
      return true;
    }
    
    return false;
  }
  
  /**
   * @purpose Check if suggestion is already in queue
   * @param id - Suggestion ID
   * @returns True if in queue
   */
  private isInQueue(id: string): boolean {
    return this.queue.some(item => item.suggestion.id === id);
  }
  
  /**
   * @purpose Clear the queue
   */
  clear() {
    this.queue = [];
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.processing = false;
  }
  
  /**
   * @purpose Get queue statistics
   * @returns Queue stats
   */
  getStats() {
    const categoryCount = new Map<string, number>();
    this.queue.forEach(item => {
      categoryCount.set(item.category, (categoryCount.get(item.category) || 0) + 1);
    });
    
    return {
      totalQueued: this.queue.length,
      processing: this.processing,
      byCategory: Object.fromEntries(categoryCount),
      oldestTimestamp: this.queue.length > 0 ? 
        Math.min(...this.queue.map(q => q.timestamp)) : null
    };
  }
} 