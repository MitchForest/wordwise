'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth/client';
import { BlogEditor } from '@/components/editor/BlogEditor';
import { DocumentRecovery } from '@/components/editor/DocumentRecovery';
import { AppLayout } from '@/components/layout/AppLayout';
import type { Document } from '@/lib/db/schema';

export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const [documentId, setDocumentId] = useState<string>('');
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();

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
    if (!sessionLoading && !session) {
      router.push('/');
      return;
    }

    if (session) {
      params.then(({ id }) => {
        setDocumentId(id);
        fetchDocument(id);
      });
    }
  }, [params, session, sessionLoading, router, fetchDocument]);

  if (sessionLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <AppLayout>
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
      </AppLayout>
    );
  }

  // Convert document to format expected by BlogEditor
  const editorDocument = {
    title: document.title,
    metaDescription: document.metaDescription || undefined,
    content: document.content || undefined,
  };

  return (
    <AppLayout>
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
    </AppLayout>
  );
} 