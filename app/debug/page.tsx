'use client';

import { useSession, signOut } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function DebugPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      // Clear any local storage
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('doc_') && key.endsWith('_draft')) {
            localStorage.removeItem(key);
          }
        });
      }
      router.push('/');
    } catch (error) {
      console.error('Sign out failed:', error);
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6">Debug Page</h1>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Session Status:</p>
            <p className="font-medium">{session ? 'Logged In' : 'Not Logged In'}</p>
          </div>

          {session && (
            <div>
              <p className="text-sm text-gray-600">User:</p>
              <p className="font-medium">{session.user.email}</p>
            </div>
          )}

          <div className="pt-4 space-y-2">
            <Button
              onClick={handleSignOut}
              className="w-full"
              variant="destructive"
            >
              Sign Out
            </Button>
            
            <Button
              onClick={() => router.push('/')}
              className="w-full"
              variant="outline"
            >
              Go to Homepage
            </Button>

            {session && (
              <Button
                onClick={() => router.push('/new')}
                className="w-full"
                variant="outline"
              >
                Go to Editor
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 