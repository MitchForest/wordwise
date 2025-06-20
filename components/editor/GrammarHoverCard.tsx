'use client';

import React, { useEffect, useRef } from 'react';
import { 
  useFloating, 
  autoUpdate, 
  offset, 
  flip, 
  shift,
  arrow
} from '@floating-ui/react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { UnifiedSuggestion } from '@/types/suggestions';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Info,
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface GrammarHoverCardProps {
  suggestion: UnifiedSuggestion | null;
  targetElement: HTMLElement | null;
  onApplyFix: (suggestion: UnifiedSuggestion, fix: string) => void;
  onDismiss: () => void;
}

export function GrammarHoverCard({ 
  suggestion, 
  targetElement,
  onApplyFix,
  onDismiss 
}: GrammarHoverCardProps) {
  const arrowRef = useRef<HTMLDivElement>(null);
  
  const { refs, floatingStyles, middlewareData } = useFloating({
    open: !!suggestion,
    placement: 'top',
    middleware: [
      offset(10),
      flip(),
      shift({ padding: 10 }),
      arrow({ element: arrowRef })
    ],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    if (targetElement) {
      refs.setReference(targetElement);
    }
  }, [targetElement, refs]);

  const getSeverityIcon = () => {
    switch (suggestion?.severity) {
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
  };

  const getCategoryBadge = () => {
    const categoryLabels: Record<string, string> = {
      grammar: 'Grammar',
      spelling: 'Spelling',
      style: 'Style',
      seo: 'SEO',
      readability: 'Readability',
    };
    
    return categoryLabels[suggestion?.category || ''] || 'Suggestion';
  };

  return (
    <AnimatePresence>
      {suggestion && (
        <motion.div
          ref={refs.setFloating}
          style={floatingStyles}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          className="grammar-hover-card z-50"
          onMouseLeave={onDismiss}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-sm">
            {/* Header */}
            <div className="flex items-start gap-2 mb-3">
              {getSeverityIcon()}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    {suggestion.title}
                  </h4>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                    {getCategoryBadge()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {suggestion.message}
                </p>
              </div>
            </div>

            {/* Actions */}
            {suggestion.actions && suggestion.actions.length > 0 && (
              <div className="space-y-1 mb-3">
                {suggestion.actions.filter(action => action.type === 'fix').map((action, index) => (
                  <button
                    key={index}
                    onClick={() => onApplyFix(suggestion, action.label)}
                    className={`
                      w-full text-left px-3 py-2 rounded-md text-sm
                      transition-colors duration-150
                      ${action.primary 
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 font-medium' 
                        : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }
                    `}
                  >
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* AI Actions */}
            {suggestion.aiActions && suggestion.aiActions.length > 0 && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <Sparkles className="w-3 h-3" />
                  AI-powered actions
                </div>
                <div className="space-y-1">
                  {suggestion.aiActions.map((action, index) => (
                    <button
                      key={index}
                      className="w-full text-left px-3 py-2 rounded-md text-sm
                        bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300
                        hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors duration-150"
                    >
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5" />
                        {action.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Metrics */}
            {suggestion.metrics && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">
                    {suggestion.metrics.label}
                  </span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {suggestion.metrics.current}
                    {suggestion.metrics.unit && suggestion.metrics.unit}
                    {suggestion.metrics.target && (
                      <span className="text-gray-500 dark:text-gray-400">
                        {' '}/ {suggestion.metrics.target}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {middlewareData.arrow && (
            <div
              ref={arrowRef}
              style={{
                position: 'absolute',
                left: middlewareData.arrow.x != null ? `${middlewareData.arrow.x}px` : '',
                top: middlewareData.arrow.y != null ? `${middlewareData.arrow.y}px` : '',
              }}
              className="w-2 h-2 bg-white dark:bg-gray-800 rotate-45 border-l border-t border-gray-200 dark:border-gray-700"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}