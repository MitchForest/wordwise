'use client';

import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedSuggestionsPanel } from './EnhancedSuggestionsPanel';
import { AIChatPanel } from './AIChatPanel';
import { motion } from 'framer-motion';
import type { Editor } from '@tiptap/react';

interface RightPanelProps {
  documentId: string;
  title: string;
  content: string;
  metaDescription: string;
  targetKeyword?: string;
  keywords?: string[];
  editor: Editor | null;
}

export function RightPanel({ 
  documentId, 
  title, 
  content, 
  metaDescription,
  targetKeyword,
  keywords
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState('suggestions');

  // Create document object for AI chat - also memoized
  const documentForAI = useMemo(() => ({
    id: documentId,
    title: title || 'Untitled Document',
    content: content || '',
    seoData: {
      targetKeyword: targetKeyword || '',
      keywords: keywords || [],
      metaDescription: metaDescription || '',
      seoScore: 0, // Simplified: Score will come from context later
    },
  }), [documentId, title, content, targetKeyword, keywords, metaDescription]);

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
            Suggestions
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex-1">
            AI Chat
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="suggestions" className="flex-1 m-0 min-h-0">
          <EnhancedSuggestionsPanel />
        </TabsContent>
        
        <TabsContent value="ai" className="flex-1 m-0">
          <AIChatPanel document={documentForAI} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
} 