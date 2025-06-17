'use client';

import { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function AIChatPanel({ document }: { 
  document: {
    id: string;
    title: string;
    content: string;
    seoData: {
      targetKeyword: string;
      keywords: string[];
      metaDescription: string;
      seoScore: number;
    };
  };
}) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `I'm here to help you optimize "${document.title}". What would you like to improve?`,
    },
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      setMessages([...messages, { role: 'user', content: input }]);
      setInput('');
      // Simulate AI response
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'I understand. Let me help you with that...',
        }]);
      }, 1000);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-neutral-200 bg-white h-16 flex items-center">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <Sparkles className="h-4 w-4 text-blue-600" />
          </div>
          <h2 className="font-semibold text-neutral-900">AI Assistant</h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] animate-slide-in",
              message.role === 'user' ? 'ml-auto' : ''
            )}
          >
            <div
              className={cn(
                "rounded-lg px-4 py-2 shadow-sm",
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-100 text-neutral-900'
              )}
            >
              <p className="text-sm leading-relaxed">{message.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-neutral-200 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <Button 
            type="submit" 
            size="icon"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
} 