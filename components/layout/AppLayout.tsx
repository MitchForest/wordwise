'use client';

import { Sidebar } from './sidebar';
import { useState } from 'react';
import { useSession } from '@/lib/auth/client';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { data: session } = useSession();
  
  if (!session) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
} 