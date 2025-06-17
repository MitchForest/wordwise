'use client';

import { Sidebar } from './sidebar';
import { useState, createContext, useContext } from 'react';
import { useSession } from '@/lib/auth/client';

// Context for document title updates
interface DocumentTitleContextType {
  onDocumentTitleChange: (documentId: string, newTitle: string) => void;
}

const DocumentTitleContext = createContext<DocumentTitleContextType | null>(null);

export const useDocumentTitleUpdate = () => {
  const context = useContext(DocumentTitleContext);
  return context?.onDocumentTitleChange;
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { data: session } = useSession();
  
  const handleDocumentTitleChange = () => {
    // This will trigger a re-render and the sidebar will update through its own state management
    // The callback here mainly serves to provide a centralized way to handle title changes
    // if we need to add additional logic in the future (like updating browser title, etc.)
    
    // For now, the sidebar handles its own state updates via API calls
    // but this provides a hook for future enhancements
  };
  
  if (!session) {
    return <div>Loading...</div>;
  }
  
  return (
    <DocumentTitleContext.Provider value={{ onDocumentTitleChange: handleDocumentTitleChange }}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onDocumentTitleChange={handleDocumentTitleChange}
        />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </DocumentTitleContext.Provider>
  );
} 