import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    // Generate a random state value for security
    const state = randomBytes(16).toString('hex');
    
    // Construct the authorization URL
    const clientId = process.env.XERO_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/xero/callback`;
    const scope = 'offline_access accounting.transactions accounting.settings';
    
    // Debug logging
    console.log("Auth endpoint called");
    console.log("Base URL:", process.env.NEXT_PUBLIC_BASE_URL);
    console.log("Redirect URI:", redirectUri);
    
    const authUrl = new URL('https://login.xero.com/identity/connect/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', clientId!);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('state', state);

    // Debug logging
    console.log("Auth URL:", authUrl.toString());
    
    // Create response with redirect
    const response = NextResponse.redirect(authUrl.toString());
    
    // Set state cookie
    response.cookies.set('xero_state', state, {
      expires: new Date(Date.now() + 1000 * 60 * 15), // 15 minutes
      httpOnly: true,
      secure: true,
      sameSite: 'lax'
    });

    return response;
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Authorization failed' }, { status: 500 });
  }
}
