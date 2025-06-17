import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Protected routes
  const protectedRoutes = ['/new', '/doc'];
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  if (isProtectedRoute) {
    // Check for session cookie
    const sessionCookie = request.cookies.get('better-auth.session_token');
    
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // For now, we'll just check if the cookie exists
    // In production, you'd want to validate the session
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/new/:path*', '/doc/:path*'],
}; 