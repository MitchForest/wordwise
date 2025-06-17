'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { useSuggestions } from '@/contexts/SuggestionContext';
import { cn } from '@/lib/utils';

interface StatusBarProps {
  scores: {
    overall: number;
    grammar: number;
    readability: number;
    seo: number;
  };
  isAnalyzing?: boolean;
}

export function EditorStatusBar({ scores, isAnalyzing = false }: StatusBarProps) {
  const { errorCount, warningCount, infoCount } = useSuggestions();

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-4 py-2 h-12">
        {/* Left side - Overall score */}
        <div className="flex items-center gap-4">
          <ScoreIndicator
            label="Overall"
            score={scores.overall}
            isAnalyzing={isAnalyzing}
            isPrimary
          />
          
          {/* Issue counts */}
          <div className="flex items-center gap-3 pl-4 border-l">
            <IssueCount
              icon={AlertCircle}
              count={errorCount}
              color="text-red-500"
              label="errors"
            />
            <IssueCount
              icon={AlertTriangle}
              count={warningCount}
              color="text-amber-500"
              label="warnings"
            />
            <IssueCount
              icon={Info}
              count={infoCount}
              color="text-blue-500"
              label="suggestions"
            />
          </div>
        </div>

        {/* Right side - Category scores */}
        <div className="flex items-center gap-6">
          <ScoreIndicator label="Grammar" score={scores.grammar} />
          <ScoreIndicator label="Readability" score={scores.readability} />
          <ScoreIndicator label="SEO" score={scores.seo} />
        </div>
      </div>
    </div>
  );
}

interface ScoreIndicatorProps {
  label: string;
  score: number;
  isAnalyzing?: boolean;
  isPrimary?: boolean;
}

function ScoreIndicator({ label, score, isAnalyzing, isPrimary }: ScoreIndicatorProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return 'bg-green-500/10';
    if (score >= 60) return 'bg-amber-500/10';
    return 'bg-red-500/10';
  };

  return (
    <div className={cn("flex items-center gap-2", isPrimary && "pr-4")}>
      <span className="text-sm text-muted-foreground">{label}</span>
      
      <AnimatePresence mode="wait">
        {isAnalyzing ? (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center"
          >
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
          </motion.div>
        ) : (
          <motion.div
            key="score"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium",
              getScoreColor(score),
              getScoreBackground(score),
              isPrimary && "text-base px-3 py-1"
            )}
          >
            {isPrimary && score >= 80 && <CheckCircle className="h-4 w-4" />}
            <span>{score}%</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface IssueCountProps {
  icon: React.ElementType;
  count: number;
  color: string;
  label: string;
}

function IssueCount({ icon: Icon, count, color, label }: IssueCountProps) {
  return (
    <motion.div
      className="flex items-center gap-1.5"
      initial={{ scale: 1 }}
      animate={{ scale: count > 0 ? [1, 1.1, 1] : 1 }}
      transition={{ duration: 0.2 }}
    >
      <Icon className={cn("h-4 w-4", color)} />
      <span className={cn("text-sm font-medium", count > 0 ? color : "text-muted-foreground")}>
        {count}
      </span>
      <span className="sr-only">{label}</span>
    </motion.div>
  );
}