'use client';

import { useSuggestions } from '@/contexts/SuggestionContext';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckIcon, XIcon } from 'lucide-react';

export const EnhancedSuggestionsPanel = () => {
  const { suggestions, applySuggestion, ignoreSuggestion } = useSuggestions();

  const handleApply = (suggestionId: string, value: string) => {
    applySuggestion(suggestionId, value);
  };

  const handleIgnore = (suggestionId: string) => {
    ignoreSuggestion(suggestionId);
  };

  if (suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <p className="text-lg font-semibold">All Clear!</p>
        <p className="text-sm text-muted-foreground">No suggestions at the moment.</p>
      </div>
    );
  }

  return (
    <div className="relative p-4 space-y-4">
      <AnimatePresence>
        {suggestions.map(suggestion => (
          <motion.div
            key={suggestion.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            layout
            className="p-4 transition-all duration-300 bg-white border rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700"
          >
            <div className="flex-1">
              <p className="text-sm font-semibold capitalize text-primary">{suggestion.category}</p>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{suggestion.message}</p>
            </div>

            {suggestion.context?.text && suggestion.actions[0]?.value && (
              <div className="flex items-center mt-3 text-sm">
                <span className="px-2 py-1 font-mono text-red-600 bg-red-100 rounded dark:bg-red-900/50 dark:text-red-400">
                  {suggestion.context.text}
                </span>
                <span className="mx-2">→</span>
                <span className="px-2 py-1 font-mono text-green-600 bg-green-100 rounded dark:bg-green-900/50 dark:text-green-400">
                  {suggestion.actions[0].value}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between mt-4">
              <Button
                size="sm"
                onClick={() => handleApply(suggestion.id, suggestion.actions[0]?.value || '')}
                disabled={!suggestion.actions[0]?.value}
              >
                <CheckIcon className="w-4 h-4 mr-2" />
                Apply
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleIgnore(suggestion.id)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XIcon className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};