/**
 * @file components/editor/AIEnhancementStatus.tsx
 * @purpose Display AI enhancement status in the editor status bar
 * @created 2024-12-28
 */

import { Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AIEnhancementStatusProps {
  enhancementState: 'idle' | 'enhancing' | 'enhanced';
  enhancedCount?: number;
  totalCount?: number;
}

export function AIEnhancementStatus({ 
  enhancementState, 
  enhancedCount = 0, 
  totalCount = 0 
}: AIEnhancementStatusProps) {
  if (enhancementState === 'idle' || totalCount === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="flex items-center gap-2 text-sm"
      >
        <Sparkles className={cn(
          "w-4 h-4",
          enhancementState === 'enhancing' 
            ? "text-purple-400 animate-spin" 
            : "text-purple-500"
        )} />
        
        <span className={cn(
          "text-muted-foreground",
          enhancementState === 'enhancing' && "animate-pulse"
        )}>
          {enhancementState === 'enhancing' 
            ? 'AI enhancing suggestions...' 
            : `${enhancedCount} suggestions enhanced`
          }
        </span>
      </motion.div>
    </AnimatePresence>
  );
} 