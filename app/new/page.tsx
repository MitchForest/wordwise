'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth/client';
import { AIWritingPrompt } from '@/components/editor/AIWritingPrompt';

export default function NewDocumentPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!sessionLoading && !session) {
      router.push('/');
    }
  }, [session, sessionLoading, router]);

  const handleGenerate = async (prompt: string) => {
    setIsGenerating(true);
    
    try {
      // For now, just create a blank document with the prompt as a starting point
      // TODO: Implement actual AI generation
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Blog Post',
          content: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: `AI generation coming soon! Your prompt was: "${prompt}"`
                  }
                ]
              }
            ]
          }
        }),
      });
      
      const { document } = await response.json();
      router.push(`/doc/${document.id}`);
    } catch (error) {
      console.error('Failed to generate content:', error);
      setIsGenerating(false);
    }
  };

  const handleStartBlank = async () => {
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: 'Untitled Document',
          content: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: []
              }
            ]
          }
        }),
      });
      
      const { document } = await response.json();
      router.push(`/doc/${document.id}`);
    } catch (error) {
      console.error('Failed to create document:', error);
    }
  };

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <AIWritingPrompt
      onGenerate={handleGenerate}
      onStartBlank={handleStartBlank}
      isGenerating={isGenerating}
    />
  );
} 