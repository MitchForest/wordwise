'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { SaveIndicator, type SaveState } from './SaveIndicator';

interface DocumentHeaderProps {
  title: string;
  author: string;
  lastUpdated: Date | null;
  saveState: SaveState;
  rightPanelOpen: boolean;
  onTitleChange: (title: string) => void;
  onAuthorChange: (author: string) => void;
  onPreview: () => void;
  onPublish: () => void;
  onToggleRightPanel: () => void;
}

export function DocumentHeader({
  title,
  author,
  lastUpdated,
  saveState,
  rightPanelOpen,
  onTitleChange,
  onAuthorChange,
  onPreview,
  onPublish,
  onToggleRightPanel,
}: DocumentHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingAuthor, setIsEditingAuthor] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const [tempAuthor, setTempAuthor] = useState(author);

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const handleTitleSave = () => {
    onTitleChange(tempTitle || 'Untitled Document');
    setIsEditingTitle(false);
  };

  const handleAuthorSave = () => {
    onAuthorChange(tempAuthor);
    setIsEditingAuthor(false);
  };

  return (
    <div className="px-8 py-6 bg-white border-b">
      {/* Top Row - Metadata and Actions */}
      <div className="flex items-start justify-between mb-4">
        {/* Left - Last Updated and Author */}
        <div className="text-sm text-gray-600">
          <span>Last Updated: {formatDate(lastUpdated)}</span>
          <span className="mx-2">|</span>
          <span>Author: </span>
          {isEditingAuthor ? (
            <Input
              value={tempAuthor}
              onChange={(e) => setTempAuthor(e.target.value)}
              onBlur={handleAuthorSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAuthorSave();
                }
                if (e.key === 'Escape') {
                  setTempAuthor(author);
                  setIsEditingAuthor(false);
                }
              }}
              className="inline-block w-32 h-6 text-sm border-0 p-0 focus:ring-0 focus:outline-none"
              placeholder="Anonymous"
              autoFocus
            />
          ) : (
            <span
              onClick={() => {
                setTempAuthor(author);
                setIsEditingAuthor(true);
              }}
              className="cursor-pointer hover:text-gray-900 underline transition-colors"
            >
              {author || 'Anonymous'}
            </span>
          )}
        </div>

        {/* Right - Actions and Save Status */}
        <div className="flex items-start gap-2">
          <div className="flex flex-col items-end gap-2">
            {/* Buttons Row */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onPreview}>
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </Button>
              <Button size="sm" onClick={onPublish} className="bg-green-600 hover:bg-green-700">
                <Send className="h-4 w-4 mr-1" />
                Publish
              </Button>
            </div>
            
            {/* Save Indicator Below Buttons */}
            <SaveIndicator state={saveState} />
          </div>

          {/* Right Panel Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleRightPanel}
            className="h-8 w-8 p-0"
          >
            {rightPanelOpen ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Bottom Row - Title */}
      <div>
        {isEditingTitle ? (
          <Input
            value={tempTitle}
            onChange={(e) => setTempTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleTitleSave();
              }
              if (e.key === 'Escape') {
                setTempTitle(title);
                setIsEditingTitle(false);
              }
            }}
            className="text-3xl font-bold border-0 p-0 h-auto focus:ring-0 focus:outline-none w-full"
            placeholder="Untitled Document"
            autoFocus
          />
        ) : (
          <h1
            onClick={() => {
              setTempTitle(title);
              setIsEditingTitle(true);
            }}
            className="text-3xl font-bold cursor-pointer hover:text-gray-700 transition-colors"
          >
            {title || 'Untitled Document'}
          </h1>
        )}
      </div>
    </div>
  );
} 