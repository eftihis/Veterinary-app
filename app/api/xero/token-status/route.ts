// app/api/xero/token-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('xero_access_token')?.value;
    const refreshToken = cookieStore.get('xero_refresh_token')?.value;
    const tokenExpiry = cookieStore.get('xero_token_expiry')?.value;
    const tenantId = cookieStore.get('xero_tenant_id')?.value;
    
    const now = Date.now();
    const expiryTime = tokenExpiry ? parseInt(tokenExpiry, 10) : 0;
    const expiresIn = expiryTime > now ? Math.round((expiryTime - now) / 1000) : 0;
    
    return NextResponse.json({
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      hasTenantId: !!tenantId,
      tokenExpiry: expiryTime ? new Date(expiryTime).toISOString() : null,
      expiresIn: expiresIn,
      expiresInMinutes: Math.round(expiresIn / 60),
      isExpired: expiryTime <= now,
      currentTime: new Date(now).toISOString()
    });
  } catch (error) {
    console.error('Error getting token status:', error);
    return NextResponse.json({ error: 'Failed to get token status' }, { status: 500 });
  }
}

