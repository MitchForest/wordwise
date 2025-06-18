'use client';

import { useSuggestions } from '@/contexts/SuggestionContext';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckIcon, XIcon, SpellCheck, PenTool, TextSearch, ShieldCheck, FilterIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useEffect, useRef } from 'react';

const categoryConfig = {
  spelling: {
    label: 'Spelling',
    icon: SpellCheck,
    color: 'text-destructive',
  },
  grammar: {
    label: 'Grammar',
    icon: PenTool,
    color: 'text-chart-1',
  },
  style: {
    label: 'Style',
    icon: TextSearch,
    color: 'text-chart-2',
  },
  seo: {
    label: 'SEO',
    icon: ShieldCheck,
    color: 'text-chart-4',
  },
};

const categoryColorMap: Record<string, { border: string; text: string }> = {
  spelling: {
    border: 'border-destructive',
    text: 'text-destructive',
  },
  grammar: {
    border: 'border-chart-1',
    text: 'text-chart-1',
  },
  style: {
    border: 'border-chart-2',
    text: 'text-chart-2',
  },
  seo: {
    border: 'border-chart-4',
    text: 'text-chart-4',
  },
};

export const EnhancedSuggestionsPanel = () => {
  const {
    visibleSuggestions,
    applySuggestion,
    ignoreSuggestion,
    hoveredSuggestionId,
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
            const colorClasses = categoryColorMap[suggestion.category] || { border: 'border-gray-700', text: 'text-primary' };
            const isHovered = suggestion.id === hoveredSuggestionId;

            return (
              <motion.div
                key={suggestion.id}
                ref={(node) => {
                  if (node) suggestionRefs.current.set(suggestion.id, node);
                  else suggestionRefs.current.delete(suggestion.id);
                }}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0, transition: { duration: 0.2 } }}
                onMouseEnter={() => setHoveredSuggestionId(suggestion.id)}
                onMouseLeave={() => setHoveredSuggestionId(null)}
                onClick={() => handleCardClick(suggestion.id)}
                className={cn(
                  'p-4 transition-all duration-300 bg-background border-l-4 rounded-lg shadow-sm cursor-pointer',
                  colorClasses.border,
                  { 'bg-muted': isHovered },
                )}
              >
                <div className="flex-1">
                  <p className={cn('text-sm font-semibold capitalize', colorClasses.text)}>{suggestion.category}</p>
                  <p className="mt-1 text-sm text-foreground/80">{suggestion.message}</p>
                </div>

                {suggestion.context?.text && suggestion.actions[0]?.value && (
                  <div className="flex items-center mt-3 text-sm">
                    <span className="px-2 py-1 font-mono rounded bg-muted text-muted-foreground line-through">
                      {suggestion.context.text}
                    </span>
                    <span className="mx-2">→</span>
                    <span className="px-2 py-1 font-mono rounded bg-primary/10 text-primary">
                      {suggestion.actions[0].value}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-end mt-4">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApply(suggestion.id, suggestion.actions[0]?.value || '');
                    }}
                    disabled={!suggestion.actions[0]?.value}
                  >
                    <CheckIcon className="w-4 h-4 mr-2" />
                    Apply
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleIgnore(suggestion.id);
                    }}
                    className="ml-2 text-muted-foreground hover:text-foreground"
                  >
                    <XIcon className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};