'use client';

import { useSession } from '@/lib/auth/client';
import { createContext, useContext, ReactNode } from 'react';

const SessionContext = createContext<ReturnType<typeof useSession> | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSessionContext = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within SessionProvider');
  }
  return context;
}; 