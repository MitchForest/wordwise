'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, X } from 'lucide-react';
import type { JSONContent } from '@tiptap/react';

interface DraftData {
  content: JSONContent;
  title: string;
  metaDescription: string;
  timestamp: string;
}

interface DocumentRecoveryProps {
  documentId: string;
  onRecover: (draftData: DraftData) => void;
  onDiscard: () => void;
}

export function DocumentRecovery({ documentId, onRecover, onDiscard }: DocumentRecoveryProps) {
  const [draftData, setDraftData] = useState<DraftData | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    const checkForDraft = () => {
      const localData = localStorage.getItem(`doc_${documentId}_draft`);
      
      if (localData) {
        try {
          const draft = JSON.parse(localData) as DraftData;
          const draftTime = new Date(draft.timestamp);
          const now = new Date();
          
          // Only show recovery if draft is less than 24 hours old
          const hoursDiff = (now.getTime() - draftTime.getTime()) / (1000 * 60 * 60);
          
          if (hoursDiff < 24) {
            setDraftData(draft);
            setShowDialog(true);
          } else {
            // Auto-cleanup old drafts
            localStorage.removeItem(`doc_${documentId}_draft`);
          }
        } catch (error) {
          console.error('Failed to parse draft data:', error);
          localStorage.removeItem(`doc_${documentId}_draft`);
        }
      }
    };

    checkForDraft();
  }, [documentId]);

  const handleRecover = () => {
    if (draftData) {
      onRecover(draftData);
      setShowDialog(false);
      localStorage.removeItem(`doc_${documentId}_draft`);
    }
  };

  const handleDiscard = () => {
    onDiscard();
    setShowDialog(false);
    localStorage.removeItem(`doc_${documentId}_draft`);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  if (!showDialog || !draftData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Unsaved Changes Found
            </h2>
          </div>
          <button
            onClick={handleDiscard}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            We found unsaved changes from your previous session. Would you like to recover them?
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Clock className="w-4 h-4" />
              <span>Last saved {formatTime(draftData.timestamp)}</span>
            </div>
            
            {draftData.title && (
              <div className="mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Title</span>
                <p className="text-sm text-gray-900 truncate">{draftData.title}</p>
              </div>
            )}
            
            {draftData.metaDescription && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Meta Description</span>
                <p className="text-sm text-gray-900 line-clamp-2">{draftData.metaDescription}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleRecover}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Recover Changes
            </button>
            <button
              onClick={handleDiscard}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Start Fresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 