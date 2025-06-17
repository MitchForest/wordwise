'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn, signUp } from '@/lib/auth/client';
import { toast } from 'sonner';

export function AuthForms() {
  const [isSignIn, setIsSignIn] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const result = await signIn.social({
        provider: 'google',
        callbackURL: '/new',
      });
      if (result?.error) {
        toast.error(result.error.message);
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const { email, password, name } = Object.fromEntries(formData.entries());

    try {
      if (isSignIn) {
        const result = await signIn.email({
          email: email as string,
          password: password as string,
          callbackURL: '/new',
        });
        if (result?.error) {
          toast.error(result.error.message);
        }
      } else {
        const result = await signUp.email({
          email: email as string,
          password: password as string,
          name: name as string,
        });

        if (!result?.error) {
          // Now, sign in the user automatically
          const signInResult = await signIn.email({
            email: email as string,
            password: password as string,
            callbackURL: '/new',
          });

          if (signInResult?.error) {
            toast.error(signInResult.error.message);
          } else {
            window.location.href = '/new';
          }
        } else {
          toast.error(result.error.message);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Button
        variant="outline"
        className="w-full mb-4 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
        onClick={handleGoogleAuth}
        disabled={loading}
      >
        <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {loading ? 'Loading...' : 'Continue with Google'}
      </Button>

      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">or</span>
        </div>
      </div>

      <form onSubmit={handleEmailAuth}>
        <div className="grid gap-4">
          {!isSignIn && (
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Your Name"
                required
                disabled={loading}
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              required
              disabled={loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Loading...' : isSignIn ? 'Sign In' : 'Sign Up'}
          </Button>
        </div>
      </form>

      <div className="mt-4 text-center text-sm">
        {isSignIn ? "Don't have an account?" : 'Already have an account?'}
        <Button
          variant="link"
          onClick={() => setIsSignIn(!isSignIn)}
          disabled={loading}
        >
          {isSignIn ? 'Sign Up' : 'Sign In'}
        </Button>
      </div>
    </div>
  );
}