'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth/client';
import { BlogEditor } from '@/components/editor/BlogEditor';
import { DocumentRecovery } from '@/components/editor/DocumentRecovery';
import { AppLayout, useDocumentUpdates } from '@/components/layout/AppLayout';
import { SuggestionProvider } from '@/contexts/SuggestionContext';
import type { Document } from '@/lib/db/schema';

function DocumentPageContent({ documentId }: { documentId: string }) {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(0);
  const documentUpdates = useDocumentUpdates();
  
  const router = useRouter();
  const { data: session } = useSession();

  const fetchDocument = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/documents/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Document not found');
        } else if (response.status === 401) {
          router.push('/');
          return;
        } else {
          setError('Failed to load document');
        }
        return;
      }
      
      const data = await response.json();
      setDocument(data.document);
    } catch (error) {
      console.error('Failed to fetch document:', error);
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!session) {
      router.push('/');
      return;
    }

    if (documentId) {
      fetchDocument(documentId);
    }
  }, [documentId, session, router, fetchDocument]);
  
  // Listen for title updates from sidebar
  useEffect(() => {
    const update = documentUpdates[documentId];
    if (update?.title && update.timestamp > lastUpdateTimestamp) {
      setDocument(prev => prev ? { ...prev, title: update.title! } : null);
      setLastUpdateTimestamp(update.timestamp);
    }
  }, [documentId, documentUpdates, lastUpdateTimestamp]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Document not found'}
          </h1>
          <button
            onClick={() => router.push('/new')}
            className="text-blue-600 hover:underline"
          >
            Create a new document
          </button>
        </div>
      </div>
    );
  }

  // Convert document to format expected by BlogEditor
  const editorDocument = {
    title: document.title,
    metaDescription: document.metaDescription || undefined,
    content: document.content || undefined,
  };

  return (
    <SuggestionProvider>
      <DocumentRecovery
        documentId={documentId}
        onRecover={(draft) => {
          if (document) {
            setDocument({
              ...document,
              title: draft.title || document.title,
              metaDescription: draft.metaDescription || document.metaDescription,
              content: draft.content || document.content,
            });
          }
        }}
        onDiscard={() => {}}
      />
      
      <div className="h-full">
        <BlogEditor 
          documentId={documentId}
          initialDocument={editorDocument}
        />
      </div>
    </SuggestionProvider>
  );
}

export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const [documentId, setDocumentId] = useState<string>('');
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();

  useEffect(() => {
    if (!sessionLoading && !session) {
      router.push('/');
      return;
    }

    if (session) {
      params.then(({ id }) => {
        setDocumentId(id);
      });
    }
  }, [params, session, sessionLoading, router]);

  if (sessionLoading || !documentId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <AppLayout>
      <DocumentPageContent documentId={documentId} />
    </AppLayout>
  );
} 