'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { useSuggestions } from '@/contexts/SuggestionContext';
import { cn } from '@/lib/utils';

export function EditorStatusBar() {
  const { suggestions } = useSuggestions();

  const errorCount = suggestions.filter(s => s.category === 'spelling').length;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-4 py-2 h-12">
        <div className="flex items-center gap-3">
          <IssueCount
            icon={AlertCircle}
            count={errorCount}
            color="text-red-500"
            label="spelling errors"
          />
        </div>
      </div>
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