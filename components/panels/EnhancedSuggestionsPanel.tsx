'use client';

import { useSuggestions } from '@/contexts/SuggestionContext';
import { Button } from '@/components/ui/button';
import { AnimatePresence } from 'framer-motion';
import { FilterIcon, Check, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useEffect, useRef } from 'react';
import { EnhancedSuggestionCard } from './EnhancedSuggestionCard';
import { EnhancedSuggestion } from '@/types/suggestions';
import { toast } from 'sonner';

const categoryConfig = {
  spelling: {
    label: 'Spelling',
  },
  grammar: {
    label: 'Grammar',
  },
  style: {
    label: 'Style',
  },
  seo: {
    label: 'SEO',
  },
};

export const EnhancedSuggestionsPanel = () => {
  const {
    visibleSuggestions,
    applySuggestion,
    ignoreSuggestion,
    setHoveredSuggestionId,
    focusedSuggestionId,
    setFocusedSuggestionId,
    filter,
    setFilter,
  } = useSuggestions();

  const suggestionRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    if (focusedSuggestionId) {
      const node = suggestionRefs.current.get(focusedSuggestionId);
      node?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [focusedSuggestionId]);

  const handleFilterToggle = (category: string) => {
    const newCategories = filter.categories.includes(category)
      ? filter.categories.filter(c => c !== category)
      : [...filter.categories, category];
    setFilter({ categories: newCategories });
  };

  const handleApply = (suggestionId: string, value: string) => {
    applySuggestion(suggestionId, value);
  };

  const handleIgnore = (suggestionId: string) => {
    ignoreSuggestion(suggestionId);
  };

  const handleCardClick = (suggestionId: string) => {
    setHoveredSuggestionId(suggestionId);
    setFocusedSuggestionId(suggestionId);
  };

  const handleApplyAll = () => {
    const applyableSuggestions = visibleSuggestions.filter(s => 
      !s.id.endsWith('-global') && (s.actions[0]?.value || (s as EnhancedSuggestion).aiFix)
    );
    
    if (applyableSuggestions.length === 0) {
      toast.info('No suggestions with fixes to apply');
      return;
    }
    
    // Apply in reverse order to maintain positions
    const sortedSuggestions = [...applyableSuggestions].sort((a, b) => {
      const posA = a.originalFrom ?? 0;
      const posB = b.originalFrom ?? 0;
      return posB - posA; // Reverse order
    });
    
    let appliedCount = 0;
    sortedSuggestions.forEach(suggestion => {
      const fix = (suggestion as EnhancedSuggestion).aiFix || suggestion.actions[0]?.value;
      if (fix) {
        applySuggestion(suggestion.id, fix);
        appliedCount++;
      }
    });
    
    toast.success(`Applied ${appliedCount} suggestions`);
  };
  
  const handleIgnoreAll = () => {
    const count = visibleSuggestions.length;
    visibleSuggestions.forEach(s => ignoreSuggestion(s.id));
    toast.success(`Ignored ${count} suggestions`);
  };

  if (visibleSuggestions.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Suggestions</h3>
          </div>
          <div className="flex items-center">
            <div className="ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FilterIcon className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Show Categories</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Object.entries(categoryConfig).map(([key, { label }]) => (
                    <DropdownMenuCheckboxItem
                      key={key}
                      checked={filter.categories.includes(key)}
                      onCheckedChange={() => handleFilterToggle(key)}
                    >
                      {label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center flex-grow p-4 text-center">
          <p className="text-lg font-semibold">All Clear!</p>
          <p className="text-sm text-muted-foreground">No suggestions match the current filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">
            Suggestions {visibleSuggestions.length > 0 && (
              <span className="text-sm text-muted-foreground ml-2">
                ({visibleSuggestions.length})
              </span>
            )}
          </h3>
        </div>
        {visibleSuggestions.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleApplyAll}
              className="text-green-600 hover:text-green-700"
            >
              <Check className="w-4 h-4 mr-1" />
              Apply All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleIgnoreAll}
              className="text-orange-600 hover:text-orange-700"
            >
              <X className="w-4 h-4 mr-1" />
              Ignore All
            </Button>
            <div className="ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FilterIcon className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Show Categories</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Object.entries(categoryConfig).map(([key, { label }]) => (
                    <DropdownMenuCheckboxItem
                      key={key}
                      checked={filter.categories.includes(key)}
                      onCheckedChange={() => handleFilterToggle(key)}
                    >
                      {label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </div>
      <div className="relative flex-grow p-4 space-y-4 overflow-y-auto">
        <AnimatePresence initial={false}>
          {visibleSuggestions.map((suggestion) => {
            const enhancedSuggestion = suggestion as EnhancedSuggestion;

            return (
              <div
                key={suggestion.id}
                ref={(node) => {
                  if (node) suggestionRefs.current.set(suggestion.id, node);
                  else suggestionRefs.current.delete(suggestion.id);
                }}
                onMouseEnter={() => setHoveredSuggestionId(suggestion.id)}
                onMouseLeave={() => setHoveredSuggestionId(null)}
                onClick={() => handleCardClick(suggestion.id)}
              >
                <EnhancedSuggestionCard
                  suggestion={enhancedSuggestion}
                  isEnhancing={enhancedSuggestion.isEnhancing || false}
                  onApply={(fix) => handleApply(suggestion.id, fix)}
                  onIgnore={() => handleIgnore(suggestion.id)}
                />
              </div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};