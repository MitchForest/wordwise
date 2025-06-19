'use client';

import { useSuggestions } from '@/contexts/SuggestionContext';
import { Button } from '@/components/ui/button';
import { AnimatePresence } from 'framer-motion';
import { FilterIcon } from 'lucide-react';
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

  if (visibleSuggestions.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Suggestions</h3>
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
        <div className="flex flex-col items-center justify-center flex-grow p-4 text-center">
          <p className="text-lg font-semibold">All Clear!</p>
          <p className="text-sm text-muted-foreground">No suggestions match the current filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">Suggestions</h3>
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