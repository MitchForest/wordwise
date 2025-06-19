'use client';

import { AnimatePresence } from 'framer-motion';
import { useSuggestions } from '@/contexts/SuggestionContext';
import { UnifiedSuggestion } from '@/types/suggestions';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EnhancedSuggestionCard } from './EnhancedSuggestionCard';

export function EnhancedSuggestionsPanel() {
  const {
    visibleSuggestions,
    applySuggestion,
    ignoreSuggestion,
    isReconciliationActive
  } = useSuggestions();

  const handleAccept = (suggestion: UnifiedSuggestion) => {
    const fixAction = suggestion.actions.find(a => a.type === 'ai-fix' || a.type === 'fix');
    if (fixAction?.value) {
      applySuggestion(suggestion.id, fixAction.value);
      toast.success(`Applied suggestion: ${suggestion.title}`);
    } else {
      toast.error('No fix available for this suggestion.');
    }
  };

  const handleDismiss = (suggestion: UnifiedSuggestion) => {
    ignoreSuggestion(suggestion.id);
    toast.info(`Dismissed suggestion: ${suggestion.title}`);
  };

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Header can be added here if needed */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          <AnimatePresence>
            {visibleSuggestions.map((suggestion: UnifiedSuggestion) => (
              <EnhancedSuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onAccept={handleAccept}
                onDismiss={handleDismiss}
              />
            ))}
          </AnimatePresence>
          {isReconciliationActive && visibleSuggestions.length === 0 && (
             <p className="text-center text-sm text-gray-500 py-4">Analyzing...</p>
          )}
          {!isReconciliationActive && visibleSuggestions.length === 0 && (
             <p className="text-center text-sm text-gray-500 py-4">No suggestions.</p>
          )}
        </div>
      </ScrollArea>
      {/* Footer can be added here if needed */}
    </div>
  );
}