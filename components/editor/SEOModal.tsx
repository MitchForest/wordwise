'use client';

import { useState } from 'react';
import { X, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface SEOModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetKeyword?: string;
  keywords: string[];
  metaDescription: string;
  onTargetKeywordChange?: (keyword: string) => void;
  onKeywordsChange: (keywords: string[]) => void;
  onMetaDescriptionChange: (description: string) => void;
}

export function SEOModal({
  isOpen,
  onClose,
  targetKeyword = '',
  keywords,
  metaDescription,
  onTargetKeywordChange,
  onKeywordsChange,
  onMetaDescriptionChange,
}: SEOModalProps) {
  const [newKeyword, setNewKeyword] = useState('');
  const [selectedPrimaryKeyword, setSelectedPrimaryKeyword] = useState(targetKeyword);

  const addKeyword = () => {
    const trimmedKeyword = newKeyword.trim().toLowerCase();
    if (trimmedKeyword && !keywords.includes(trimmedKeyword)) {
      onKeywordsChange([...keywords, trimmedKeyword]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    onKeywordsChange(keywords.filter((k) => k !== keyword));
    if (selectedPrimaryKeyword === keyword) {
      setSelectedPrimaryKeyword('');
      onTargetKeywordChange?.('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  const handlePrimaryKeywordChange = (value: string) => {
    setSelectedPrimaryKeyword(value);
    onTargetKeywordChange?.(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            SEO Settings
          </DialogTitle>
          <DialogDescription>
            Optimize your content for search engines by setting keywords and meta description.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Keywords Section */}
          <div className="space-y-3">
            <Label>Keywords & Phrases</Label>
            <div className="flex items-center gap-2">
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add keyword or phrase..."
                className="flex-1"
              />
              <Button
                onClick={addKeyword}
                disabled={!newKeyword.trim()}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            
            {keywords.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm text-muted-foreground">
                  Select your primary keyword:
                </Label>
                <RadioGroup value={selectedPrimaryKeyword} onValueChange={handlePrimaryKeywordChange}>
                  <div className="space-y-2">
                    {keywords.map((keyword) => (
                      <div key={keyword} className="flex items-center justify-between p-2 rounded-lg border hover:bg-accent/50 transition-colors">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value={keyword} id={keyword} />
                          <Label 
                            htmlFor={keyword} 
                            className="font-normal cursor-pointer flex-1"
                          >
                            {keyword}
                          </Label>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeKeyword(keyword)}
                          className="h-6 w-6 p-0 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>

          {/* Meta Description */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Meta Description</Label>
              <span className={`text-sm ${metaDescription.length > 140 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                {metaDescription.length}/160
              </span>
            </div>
            <Textarea
              value={metaDescription}
              onChange={(e) => onMetaDescriptionChange(e.target.value)}
              placeholder="Write a compelling description that will appear in search results..."
              className="resize-none min-h-[100px]"
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground">
              Keep it between 120-160 characters for best results in search engines.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onClose}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 