'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface SEOSettingsProps {
  targetKeyword?: string;
  keywords: string[];
  metaDescription: string;
  onTargetKeywordChange?: (keyword: string) => void;
  onKeywordsChange: (keywords: string[]) => void;
  onMetaDescriptionChange: (description: string) => void;
}

export function SEOSettings({
  targetKeyword = '',
  keywords,
  metaDescription,
  onTargetKeywordChange,
  onKeywordsChange,
  onMetaDescriptionChange,
}: SEOSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');

  const addKeyword = () => {
    const trimmedKeyword = newKeyword.trim().toLowerCase();
    if (trimmedKeyword && !keywords.includes(trimmedKeyword)) {
      onKeywordsChange([...keywords, trimmedKeyword]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    onKeywordsChange(keywords.filter((k) => k !== keyword));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  return (
    <div className="px-8 py-4 bg-gray-50 border-b">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
      >
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        SEO Settings
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Target Keyword */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Target Keyword
            </label>
            <Input
              value={targetKeyword}
              onChange={(e) => onTargetKeywordChange?.(e.target.value)}
              placeholder="Enter your main keyword or phrase"
              className="text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              This is the main keyword you want to rank for
            </p>
          </div>

          {/* Keywords */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Keywords</label>
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword) => (
                <Badge 
                  key={keyword} 
                  variant="secondary" 
                  className="pl-3 pr-1 py-1 bg-gray-200 hover:bg-gray-300 transition-colors"
                >
                  {keyword}
                  <button
                    onClick={() => removeKeyword(keyword)}
                    className="ml-2 hover:text-red-600 transition-colors"
                    aria-label={`Remove ${keyword}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <div className="flex items-center gap-1">
                <Input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add keyword"
                  className="h-7 w-32 text-sm"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={addKeyword}
                  className="h-7 w-7 p-0"
                  disabled={!newKeyword.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Meta Description */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Meta Description ({metaDescription.length}/160)
            </label>
            <Textarea
              value={metaDescription}
              onChange={(e) => onMetaDescriptionChange(e.target.value)}
              placeholder="Write a compelling description for search engines..."
              className="resize-none"
              rows={3}
              maxLength={160}
            />
            {metaDescription.length > 140 && (
              <p className="text-xs text-yellow-600 mt-1">
                {160 - metaDescription.length} characters remaining
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 