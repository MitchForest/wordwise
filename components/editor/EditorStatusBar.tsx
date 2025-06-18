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
import { Separator } from '../ui/separator';

function getReadingLevel(score: number): string {
  if (score >= 90) return "5th Grade";
  if (score >= 80) return "6th Grade";
  if (score >= 70) return "7th Grade";
  if (score >= 60) return "8th-9th Grade";
  if (score >= 50) return "10th-12th Grade";
  if (score >= 30) return "College";
  return "Graduate";
}

export function EditorStatusBar() {
  const { suggestions, metrics, setFilter } = useSuggestions();

  const handleSuggestionsClick = () => {
    setFilter({ category: null });
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-4 py-2 text-sm h-14">
        <div className="flex items-center gap-x-4 text-muted-foreground">
          <Metric
            label="Grammar Score"
            value={metrics ? `${metrics.grammarScore}` : '--'}
            icon={CheckCircle}
          />
          <Metric
            label="SEO Score"
            value={metrics ? `${metrics.seoScore}` : '--'}
            icon={BarChart2}
          />
          <Metric
            label="Reading Level"
            value={metrics ? getReadingLevel(metrics.readabilityScore) : '--'}
            icon={BookOpen}
          />
        </div>
        <div className="flex items-center gap-x-4">
          <Metric
            label="words"
            value={metrics?.wordCount || 0}
            icon={Pilcrow}
          />
          <Metric
            label="min read"
            value={metrics?.readingTime?.split(' ')[0] || '0'}
            icon={Clock}
          />
           <Separator orientation="vertical" className="h-6" />
          <Button variant="ghost" size="sm" onClick={handleSuggestionsClick} className="px-2">
             <Metric
                label="Suggestions"
                value={suggestions.length}
                icon={AlertCircle}
              />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface MetricProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
}

function Metric({ icon: Icon, label, value }: MetricProps) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4" />
      <span className="font-semibold">{value}</span>
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}