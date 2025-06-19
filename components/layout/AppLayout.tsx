'use client';

import { Sidebar } from './sidebar';
import { useState, createContext, useContext, useRef, useCallback } from 'react';
import { useSession } from '@/lib/auth/client';

// Context for document title updates
interface DocumentTitleContextType {
  onDocumentTitleChange: (documentId: string, newTitle: string) => void;
  refreshDocuments: () => void;
  documentUpdates: { [key: string]: { title?: string; timestamp: number } };
}

const DocumentTitleContext = createContext<DocumentTitleContextType | null>(null);

export const useDocumentTitleUpdate = () => {
  const context = useContext(DocumentTitleContext);
  return context?.onDocumentTitleChange;
};

export const useDocumentRefresh = () => {
  const context = useContext(DocumentTitleContext);
  return context?.refreshDocuments;
};

export const useDocumentUpdates = () => {
  const context = useContext(DocumentTitleContext);
  return context?.documentUpdates || {};
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { data: session } = useSession();
  const refreshDocumentsRef = useRef<() => void>(() => {});
  const [documentUpdates, setDocumentUpdates] = useState<{ [key: string]: { title?: string; timestamp: number } }>({});
  
  const handleDocumentTitleChange = useCallback((documentId: string, newTitle: string) => {
    // Refresh the sidebar documents list when title changes
    refreshDocumentsRef.current();
    
    // Store the update for the editor to pick up
    setDocumentUpdates(prev => ({
      ...prev,
      [documentId]: { title: newTitle, timestamp: Date.now() }
    }));
  }, []);
  
  const refreshDocuments = useCallback(() => {
    refreshDocumentsRef.current();
  }, []);
  
  if (!session) {
    return <div>Loading...</div>;
  }
  
  return (
    <DocumentTitleContext.Provider value={{ onDocumentTitleChange: handleDocumentTitleChange, refreshDocuments, documentUpdates }}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onDocumentTitleChange={handleDocumentTitleChange}
          refreshDocumentsRef={refreshDocumentsRef}
        />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </DocumentTitleContext.Provider>
  );
} 