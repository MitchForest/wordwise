/**
 * @file components/editor/EditorStatusBar.tsx
 * @purpose This component displays the document's vital statistics at the bottom of the
 * editor. It shows granular metrics like grammar score, SEO score, readability, and word
 * count. It consumes data directly from the `SuggestionContext`.
 */
'use client';

import React from 'react';
import { AlertCircle, CheckCircle, BarChart2, BookOpen, Clock, Pilcrow } from 'lucide-react';
import { useSuggestions } from '@/contexts/SuggestionContext';
import { Button } from '@/components/ui/button';

interface EditorStatusBarProps {
  onCheckSEO?: () => void;
  wordCount: number;
}

export function EditorStatusBar({ onCheckSEO, wordCount }: EditorStatusBarProps) {
  const { suggestions, metrics, setFilter } = useSuggestions();

  const handleSuggestionsClick = () => {
    setFilter({ categories: [] });
  };

  return (
    <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-evenly w-full h-14 px-2 py-1 text-sm">
        <Metric
          title="Grammar"
          value={metrics ? `${metrics.grammarScore}` : '--'}
          icon={CheckCircle}
        />
        <div className="flex items-center gap-2">
          <Metric
            title="SEO"
            value={metrics ? `${metrics.seoScore}` : '--'}
            icon={BarChart2}
          />
          {onCheckSEO && (
            <Button
              size="sm"
              variant="outline"
              onClick={onCheckSEO}
              className="h-7 px-2 text-xs"
            >
              Check SEO
            </Button>
          )}
        </div>
        <Metric
          title="Readability"
          value={metrics ? metrics.readingLevel : '--'}
          icon={BookOpen}
        />
        <Metric
          title="Word Count"
          value={wordCount}
          icon={Pilcrow}
        />
        <Metric
          title="Read Time"
          value={metrics?.readingTime?.replace(' read', '') || '0 min'}
          icon={Clock}
        />
        <button
          onClick={handleSuggestionsClick}
          className="transition-colors rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <Metric
            title="Suggestions"
            value={suggestions.length}
            icon={AlertCircle}
          />
        </button>
      </div>
    </div>
  );
}

interface MetricProps {
  icon: React.ElementType;
  title: string;
  value: number | string;
}

function Metric({ icon: Icon, title, value }: MetricProps) {
  return (
    <div className="flex flex-col items-center justify-center p-1 text-xs font-medium text-center">
      <div className="flex items-center gap-x-1.5 text-primary">
        <Icon className="w-4 h-4" />
        <span className="text-sm font-semibold">{value}</span>
      </div>
      <span className="text-muted-foreground">{title}</span>
    </div>
  );
}