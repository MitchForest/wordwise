'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

interface AIWritingPromptProps {
  onGenerate: (prompt: string) => void;
  onStartBlank: () => void;
  isGenerating?: boolean;
}

export function AIWritingPrompt({ 
  onGenerate, 
  onStartBlank, 
  isGenerating = false 
}: AIWritingPromptProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onGenerate(prompt);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen flex items-center justify-center p-8"
    >
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            What do you want to write today?
          </h1>
          <p className="text-lg text-gray-600">
            Describe your blog post idea and let AI help you create amazing content
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Write a blog post about the best coffee makers for home use..."
            className="min-h-[120px] text-lg"
            disabled={isGenerating}
          />

          <div className="flex gap-4">
            <Button
              type="submit"
              size="lg"
              className="flex-1"
              disabled={!prompt.trim() || isGenerating}
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate with AI
                </>
              )}
            </Button>

            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={onStartBlank}
              disabled={isGenerating}
            >
              <FileText className="h-4 w-4 mr-2" />
              Start Blank
            </Button>
          </div>
        </form>

        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 text-center text-gray-600"
          >
            <p>Creating your blog post...</p>
            <p className="text-sm mt-2">This may take a few moments</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
} 