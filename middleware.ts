import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res: response });
  
  // This will refresh the session if it exists and is expired
  await supabase.auth.getSession();
  
  return response;
}

// This ensures the middleware runs for all routes
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}; 