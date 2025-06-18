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
      initial={{ width: 0, opacity: 0, x: 20 }}
      animate={{ width: 384, opacity: 1, x: 0 }}
      exit={{ width: 0, opacity: 0, x: 20 }}
      transition={{ 
        duration: 0.3, 
        ease: [0.4, 0.0, 0.2, 1], // Custom easing for smoother animation
        width: { duration: 0.3 },
        opacity: { duration: 0.2 }
      }}
      className="h-full bg-white border-l border-neutral-200 flex flex-col overflow-hidden"
      style={{ width: 384 }} // Set fixed width to prevent layout shift
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full rounded-none border-b shrink-0">
          <TabsTrigger value="suggestions" className="flex-1">
            Suggestions
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex-1">
            AI Chat
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="suggestions" className="flex-1 m-0 min-h-0 overflow-y-auto">
          <EnhancedSuggestionsPanel />
        </TabsContent>
        
        <TabsContent value="ai" className="flex-1 m-0">
          <AIChatPanel document={documentForAI} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
} 