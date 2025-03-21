// app/api/xero/expire-token/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Set token expiry to a past time
    const pastTime = Date.now() - 3600 * 1000; // 1 hour ago
    
    // Create response
    const response = NextResponse.json({ message: "Token expired for testing" });
    
    // Set the cookie on the response
    response.cookies.set('xero_token_expiry', pastTime.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    
    return response;
  } catch (error) {
    console.error('Error expiring token:', error);
    return NextResponse.json({ error: 'Failed to expire token' }, { status: 500 });
  }
}