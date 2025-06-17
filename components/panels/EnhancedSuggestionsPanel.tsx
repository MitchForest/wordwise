'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Check, 
  X, 
  Eye,
  AlertCircle,
  AlertTriangle,
  Info,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSuggestions } from '@/contexts/SuggestionContext';
import type { Editor } from '@tiptap/react';
import type { UnifiedSuggestion } from '@/types/suggestions';

interface EnhancedSuggestionsPanelProps {
  editor: Editor | null;
  className?: string;
}

export function EnhancedSuggestionsPanel({ 
  editor, 
  className 
}: EnhancedSuggestionsPanelProps) {
  const {
    visibleSuggestions,
    hiddenSuggestionIds,
    applySuggestion,
    ignoreSuggestion,
    showAllSuggestions,
    isApplyingFix,
  } = useSuggestions();
  
  console.log('[EnhancedSuggestionsPanel] visibleSuggestions:', visibleSuggestions);
  console.log('[EnhancedSuggestionsPanel] visibleSuggestions count:', visibleSuggestions.length);

  const [animatingOutIds, setAnimatingOutIds] = useState<Set<string>>(new Set());

  // Group suggestions by priority
  const groupedSuggestions = React.useMemo(() => {
    const groups = {
      errors: visibleSuggestions.filter(s => s.severity === 'error'),
      warnings: visibleSuggestions.filter(s => s.severity === 'warning'),
      info: visibleSuggestions.filter(s => s.severity === 'info'),
    };
    return groups;
  }, [visibleSuggestions]);

  const handleApply = async (suggestion: UnifiedSuggestion) => {
    if (!editor || !suggestion.actions?.[0]) return;
    
    // Start exit animation
    setAnimatingOutIds(prev => new Set(prev).add(suggestion.id));
    
    // Apply the fix
    await applySuggestion(editor, suggestion, suggestion.actions[0]);
    
    // Remove from animating list after animation completes
    setTimeout(() => {
      setAnimatingOutIds(prev => {
        const next = new Set(prev);
        next.delete(suggestion.id);
        return next;
      });
    }, 300);
  };

  const handleIgnore = (suggestion: UnifiedSuggestion) => {
    // Start exit animation
    setAnimatingOutIds(prev => new Set(prev).add(suggestion.id));
    
    // Ignore the suggestion
    setTimeout(() => {
      ignoreSuggestion(suggestion.id);
      setAnimatingOutIds(prev => {
        const next = new Set(prev);
        next.delete(suggestion.id);
        return next;
      });
    }, 200);
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Suggestions</h3>
        {hiddenSuggestionIds.size > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={showAllSuggestions}
            className="text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            Show {hiddenSuggestionIds.size} hidden
          </Button>
        )}
      </div>

      {/* Suggestions List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <LayoutGroup>
            {/* Errors */}
            {groupedSuggestions.errors.length > 0 && (
              <SuggestionGroup
                title="Errors"
                icon={AlertCircle}
                iconColor="text-red-500"
                suggestions={groupedSuggestions.errors}
                animatingOutIds={animatingOutIds}
                onApply={handleApply}
                onIgnore={handleIgnore}
                isApplyingFix={isApplyingFix}
              />
            )}

            {/* Warnings */}
            {groupedSuggestions.warnings.length > 0 && (
              <SuggestionGroup
                title="Warnings"
                icon={AlertTriangle}
                iconColor="text-amber-500"
                suggestions={groupedSuggestions.warnings}
                animatingOutIds={animatingOutIds}
                onApply={handleApply}
                onIgnore={handleIgnore}
                isApplyingFix={isApplyingFix}
              />
            )}

            {/* Info */}
            {groupedSuggestions.info.length > 0 && (
              <SuggestionGroup
                title="Suggestions"
                icon={Info}
                iconColor="text-blue-500"
                suggestions={groupedSuggestions.info}
                animatingOutIds={animatingOutIds}
                onApply={handleApply}
                onIgnore={handleIgnore}
                isApplyingFix={isApplyingFix}
              />
            )}
          </LayoutGroup>

          {/* Empty State */}
          {visibleSuggestions.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <Sparkles className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                Great job! No suggestions at the moment.
              </p>
            </motion.div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface SuggestionGroupProps {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  suggestions: UnifiedSuggestion[];
  animatingOutIds: Set<string>;
  onApply: (suggestion: UnifiedSuggestion) => void;
  onIgnore: (suggestion: UnifiedSuggestion) => void;
  isApplyingFix: boolean;
}

function SuggestionGroup({
  title,
  icon: Icon,
  iconColor,
  suggestions,
  animatingOutIds,
  onApply,
  onIgnore,
  isApplyingFix,
}: SuggestionGroupProps) {
  return (
    <motion.div layout className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("h-4 w-4", iconColor)} />
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">({suggestions.length})</span>
      </div>
      
      <AnimatePresence mode="popLayout">
        {suggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            isAnimatingOut={animatingOutIds.has(suggestion.id)}
            onApply={() => onApply(suggestion)}
            onIgnore={() => onIgnore(suggestion)}
            isApplyingFix={isApplyingFix}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

interface SuggestionCardProps {
  suggestion: UnifiedSuggestion;
  isAnimatingOut: boolean;
  onApply: () => void;
  onIgnore: () => void;
  isApplyingFix: boolean;
}

function SuggestionCard({
  suggestion,
  isAnimatingOut,
  onApply,
  onIgnore,
  isApplyingFix,
}: SuggestionCardProps) {
  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950';
      case 'warning':
        return 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950';
      default:
        return 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950';
    }
  };
  
  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'grammar':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      case 'spelling':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      case 'style':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'seo':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'readability':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <motion.div
      id={`suggestion-${suggestion.id}`}
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ 
        opacity: isAnimatingOut ? 0 : 1, 
        y: isAnimatingOut ? -20 : 0,
        scale: isAnimatingOut ? 0.95 : 1,
      }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "p-3 rounded-lg border transition-all",
        getSeverityStyles(suggestion.severity),
        isAnimatingOut && "pointer-events-none"
      )}
    >
      {/* Category Badge and Message */}
      <div className="flex items-start gap-2 mb-3">
        <span className={cn(
          "px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0",
          getCategoryStyles(suggestion.category)
        )}>
          {suggestion.category}
        </span>
        <p className="text-sm flex-1">{suggestion.message}</p>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2">
        {suggestion.actions?.map((action, index) => (
          <Button
            key={index}
            size="sm"
            variant={index === 0 ? "default" : "secondary"}
            onClick={onApply}
            disabled={isApplyingFix}
            className="text-xs"
          >
            <Check className="h-3 w-3 mr-1" />
            {action.label}
          </Button>
        ))}
        
        <Button
          size="sm"
          variant="ghost"
          onClick={onIgnore}
          disabled={isApplyingFix}
          className="text-xs ml-auto"
        >
          <X className="h-3 w-3 mr-1" />
          Ignore
        </Button>
      </div>
    </motion.div>
  );
}