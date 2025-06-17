'use client';

import { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SuggestionsPanel } from './SuggestionsPanel';
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
}

export function RightPanel({ 
  documentId, 
  title, 
  content, 
  metaDescription,
  targetKeyword,
  keywords,
  editor,
  onSuggestionsUpdate
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
  const { suggestions, scores, isAnalyzing } = useOptimizedAnalysis(editor, document);
  
  // Call onSuggestionsUpdate when suggestions change
  useEffect(() => {
    if (onSuggestionsUpdate) {
      onSuggestionsUpdate(suggestions);
    }
  }, [suggestions, onSuggestionsUpdate]);

  // Handle applying suggestions
  const handleApplySuggestion = async (_suggestion: UnifiedSuggestion, action: UnifiedSuggestion['actions'][0]) => {
    await action.handler();
    // The handler should update the editor directly
  };

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
          <SuggestionsPanel 
            suggestions={suggestions}
            scores={scores}
            isAnalyzing={isAnalyzing}
            onApplySuggestion={handleApplySuggestion}
          />
        </TabsContent>
        
        <TabsContent value="ai" className="flex-1 m-0">
          <AIChatPanel document={documentForAI} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
} 