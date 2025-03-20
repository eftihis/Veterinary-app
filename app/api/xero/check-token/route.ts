// app/api/xero/check-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('xero_access_token')?.value;
    const tokenExpiry = cookieStore.get('xero_token_expiry')?.value;
    
    const now = Date.now();
    const expiryTime = tokenExpiry ? parseInt(tokenExpiry, 10) : 0;
    const isExpired = expiryTime <= now;
    
    return NextResponse.json({
      hasAccessToken: !!accessToken,
      tokenExpiry: expiryTime ? new Date(expiryTime).toISOString() : null,
      currentTime: new Date(now).toISOString(),
      isExpired: isExpired,
      timeUntilExpiry: expiryTime > now ? (expiryTime - now) / 1000 : 'Expired'
    });
  } catch (error) {
    console.error('Error checking token:', error);
    return NextResponse.json({ error: 'Failed to check token' }, { status: 500 });
  }
}