/**
 * @file components/panels/EnhancedSuggestionCard.tsx
 * @purpose Enhanced suggestion card with AI improvements, animations, and visual feedback
 * @created 2024-12-28
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UnifiedSuggestion } from '@/types/suggestions';

const categoryColorMap: Record<string, { border: string; text: string }> = {
  spelling: { border: 'border-destructive', text: 'text-destructive' },
  grammar: { border: 'border-chart-1', text: 'text-chart-1' },
  style: { border: 'border-chart-2', text: 'text-chart-2' },
  seo: { border: 'border-chart-4', text: 'text-chart-4' },
};

interface EnhancedSuggestionCardProps {
  suggestion: UnifiedSuggestion;
  onAccept: (suggestion: UnifiedSuggestion) => void;
  onDismiss: (suggestion: UnifiedSuggestion) => void;
}

export function EnhancedSuggestionCard({ suggestion, onAccept, onDismiss }: EnhancedSuggestionCardProps) {
  const aiFixAction = suggestion.actions.find(a => a.type === 'ai-fix');
  const originalFixAction = suggestion.actions.find(a => a.type === 'fix');
  
  const shouldShowConfidence = suggestion.aiConfidence && suggestion.aiConfidence > 0;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      className={cn(
        "p-4 border-l-4 rounded-lg shadow-sm transition-all duration-300",
        categoryColorMap[suggestion.category]?.border,
        suggestion.isEnhancing && "animate-pulse-subtle"
      )}
      animate={
        suggestion.aiEnhanced && !suggestion.isEnhancing
          ? { scale: [1, 1.02, 1] }
          : {}
      }
      transition={{ duration: 0.3 }}
    >
      {/* Header with AI indicator */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <p className={cn(
            "text-sm font-semibold capitalize",
            categoryColorMap[suggestion.category]?.text
          )}>
            {suggestion.category}
          </p>
          
          <AnimatePresence>
            {(suggestion.aiEnhanced || suggestion.isEnhancing) && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ duration: 0.3 }}
              >
                <Sparkles className={cn(
                  "w-4 h-4",
                  suggestion.isEnhancing ? "text-purple-400 animate-spin" : "text-purple-500"
                )} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Confidence indicator */}
        {shouldShowConfidence && !suggestion.isEnhancing && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-purple-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(suggestion.aiConfidence || 0) * 100}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />
            </div>
            <span className="text-xs text-gray-500">
              {Math.round((suggestion.aiConfidence || 0) * 100)}%
            </span>
          </motion.div>
        )}
      </div>
      
      {/* Message */}
      <p className="text-sm text-foreground/80 mb-3">{suggestion.message}</p>
      
      {/* Error text and fixes */}
      <div className="space-y-2">
        {/* Original error */}
        <div className="flex items-center text-sm">
          <span className="text-gray-500 mr-2">Error:</span>
          <code className="px-2 py-1 bg-red-50 text-red-700 rounded line-through">
            {suggestion.context?.text || suggestion.matchText}
          </code>
        </div>
        
        {/* Fix options */}
        {suggestion.isEnhancing ? (
          <div className="flex items-center text-sm">
            <span className="text-purple-500 mr-2">AI analyzing...</span>
          </div>
        ) : (
          <div className="flex items-center text-sm">
            {aiFixAction && (
              <span className="text-purple-500 mr-2">{aiFixAction.value}</span>
            )}
            {originalFixAction && (
              <span className="text-gray-400 line-through">{originalFixAction.value}</span>
            )}
          </div>
        )}
        
        {/* AI reasoning (if available) */}
        {suggestion.aiReasoning && !suggestion.isEnhancing && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-gray-500 italic mt-2"
          >
            AI: {suggestion.aiReasoning}
          </motion.p>
        )}
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-end mt-4 gap-2">
        <Button
          size="sm"
          onClick={() => onAccept(suggestion)}
          disabled={!aiFixAction && !originalFixAction}
          className={cn(
            "bg-green-100 text-green-800 hover:bg-green-200",
            suggestion.aiEnhanced && "ring-1 ring-purple-200"
          )}
        >
          <Check className="w-4 h-4 mr-2" />
          Apply
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDismiss(suggestion)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
} 