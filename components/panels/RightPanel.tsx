'use client';

import { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedSuggestionsPanel } from './EnhancedSuggestionsPanel';
import { AIChatPanel } from './AIChatPanel';
import { motion } from 'framer-motion';
import { useOptimizedAnalysis } from '@/hooks/useOptimizedAnalysis';
import type { Editor } from '@tiptap/react';
import type { UnifiedSuggestion } from '@/types/suggestions';

interface RightPanelProps {
  documentId: string;
  title: string;
  content: string;
  metaDescription: string;
  targetKeyword?: string;
  keywords?: string[];
  editor: Editor | null;
  onSuggestionsUpdate?: (suggestions: UnifiedSuggestion[]) => void;
  onScoresUpdate?: (scores: {
    overall: number;
    grammar: number;
    readability: number;
    seo: number;
  }) => void;
}

export function RightPanel({ 
  documentId, 
  title, 
  content, 
  metaDescription,
  targetKeyword,
  keywords,
  editor,
  onSuggestionsUpdate,
  onScoresUpdate
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState('suggestions');

  // Create document object for analysis - memoized to prevent infinite re-renders
  const document = useMemo(() => ({
    id: documentId,
    title,
    metaDescription,
    targetKeyword: targetKeyword || '',
    keywords: keywords || [],
  }), [documentId, title, metaDescription, targetKeyword, keywords]);

  // Use the optimized analysis hook with three-tier system
  const { suggestions, scores } = useOptimizedAnalysis(editor, document);
  
  console.log('RightPanel suggestions:', suggestions);
  
  // Call onSuggestionsUpdate when suggestions change
  useEffect(() => {
    if (onSuggestionsUpdate) {
      onSuggestionsUpdate(suggestions);
    }
  }, [suggestions, onSuggestionsUpdate]);
  
  // Call onScoresUpdate when scores change
  useEffect(() => {
    if (onScoresUpdate) {
      onScoresUpdate(scores);
    }
  }, [scores, onScoresUpdate]);


  // Create document object for AI chat - also memoized
  const documentForAI = useMemo(() => ({
    id: documentId,
    title: title || 'Untitled Document',
    content: content || '',
    seoData: {
      targetKeyword: targetKeyword || '',
      keywords: keywords || [],
      metaDescription: metaDescription || '',
      seoScore: scores.seo,
    },
  }), [documentId, title, content, targetKeyword, keywords, metaDescription, scores.seo]);

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 384, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="w-96 h-full bg-white border-l border-neutral-200 flex flex-col overflow-hidden"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full rounded-none border-b">
          <TabsTrigger value="suggestions" className="flex-1">
            Suggestions {suggestions.length > 0 && `(${suggestions.length})`}
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex-1">
            AI Chat
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="suggestions" className="flex-1 m-0">
          <EnhancedSuggestionsPanel 
            editor={editor}
            className="h-full"
          />
        </TabsContent>
        
        <TabsContent value="ai" className="flex-1 m-0">
          <AIChatPanel document={documentForAI} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
} 