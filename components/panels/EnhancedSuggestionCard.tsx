/**
 * @file components/panels/EnhancedSuggestionCard.tsx
 * @purpose Enhanced suggestion card with AI improvements, animations, and visual feedback
 * @created 2024-12-28
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EnhancedSuggestion } from '@/types/suggestions';

const categoryColorMap: Record<string, { border: string; text: string }> = {
  spelling: { border: 'border-destructive', text: 'text-destructive' },
  grammar: { border: 'border-chart-1', text: 'text-chart-1' },
  style: { border: 'border-chart-2', text: 'text-chart-2' },
  seo: { border: 'border-chart-4', text: 'text-chart-4' },
};

interface Props {
  suggestion: EnhancedSuggestion;
  isEnhancing: boolean;
  onApply: (fix: string) => void;
  onIgnore: () => void;
}

export function EnhancedSuggestionCard({ 
  suggestion, 
  isEnhancing,
  onApply,
  onIgnore 
}: Props) {
  const [showBothFixes, setShowBothFixes] = useState(false);
  
  // Determine if AI provided a different fix
  const hasAIFix = suggestion.aiFix && suggestion.aiFix !== suggestion.actions[0]?.value;
  const shouldShowConfidence = suggestion.aiConfidence !== undefined;
  
  return (
    <motion.div
      layout
      className={cn(
        "p-4 border-l-4 rounded-lg shadow-sm transition-all duration-300",
        categoryColorMap[suggestion.category]?.border,
        isEnhancing && "animate-pulse-subtle"
      )}
      animate={
        suggestion.aiEnhanced && !isEnhancing
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
            {(suggestion.aiEnhanced || isEnhancing) && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ duration: 0.3 }}
              >
                <Sparkles className={cn(
                  "w-4 h-4",
                  isEnhancing ? "text-purple-400 animate-spin" : "text-purple-500"
                )} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Confidence indicator */}
        {shouldShowConfidence && !isEnhancing && (
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
        {isEnhancing ? (
          <div className="flex items-center text-sm">
            <span className="text-purple-500 mr-2">AI analyzing...</span>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-200" />
            </div>
          </div>
        ) : (
          <>
            {/* Show primary fix */}
            <div className="flex items-center text-sm">
              <span className="text-gray-500 mr-2">Fix:</span>
              <code className="px-2 py-1 bg-green-50 text-green-700 rounded">
                {suggestion.aiFix || suggestion.actions[0]?.value || 'No fix available'}
              </code>
              {hasAIFix && (
                <button
                  onClick={() => setShowBothFixes(!showBothFixes)}
                  className="ml-2 text-xs text-purple-600 hover:text-purple-700"
                >
                  {showBothFixes ? 'Hide original' : 'Show original'}
                </button>
              )}
            </div>
            
            {/* Show both fixes if requested */}
            <AnimatePresence>
              {showBothFixes && hasAIFix && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="ml-4 space-y-1 overflow-hidden"
                >
                  <div className="flex items-center text-xs">
                    <span className="text-gray-400 mr-2">Original:</span>
                    <code className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {suggestion.actions[0]?.value}
                    </code>
                  </div>
                  <div className="flex items-center text-xs">
                    <Sparkles className="w-3 h-3 text-purple-500 mr-1" />
                    <span className="text-purple-600 mr-2">AI Enhanced:</span>
                    <code className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded">
                      {suggestion.aiFix}
                    </code>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
        
        {/* AI reasoning (if available) */}
        {suggestion.aiReasoning && !isEnhancing && (
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
          onClick={() => onApply(suggestion.aiFix || suggestion.actions[0]?.value || '')}
          disabled={!suggestion.actions[0]?.value && !suggestion.aiFix}
          className={cn(
            "transition-all duration-200",
            suggestion.aiEnhanced && "ring-1 ring-purple-200"
          )}
        >
          <Check className="w-4 h-4 mr-2" />
          Apply
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onIgnore}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
} 