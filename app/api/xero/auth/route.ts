import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export async function GET() {
  try {
    // Check if Xero is disabled in this environment
    if (process.env.NEXT_PUBLIC_DISABLE_XERO === 'true') {
      console.error("Xero integration is disabled in this environment");
      return NextResponse.json(
        { error: "Xero integration is disabled in this environment. Please use HTTPS/ngrok URL." },
        { status: 400 }
      );
    }

    // Generate a random state value for security
    const state = randomBytes(16).toString('hex');
    
    // Get environment variables
    const clientId = process.env.XERO_CLIENT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    
    if (!clientId || !baseUrl) {
      console.error("Missing required environment variables:", { 
        clientId: !!clientId, 
        baseUrl: !!baseUrl 
      });
      return NextResponse.json(
        { error: "Missing required environment variables" },
        { status: 500 }
      );
    }

    // Construct redirect URL
    const redirectUri = `${baseUrl}/api/xero/callback`;
    const scope = 'offline_access accounting.transactions accounting.settings';
    
    // Debug logging
    console.log("Auth endpoint called");
    console.log("Base URL:", baseUrl);
    console.log("Redirect URI:", redirectUri);
    
    const authUrl = new URL('https://login.xero.com/identity/connect/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('state', state);

    // Debug logging
    console.log("Auth URL:", authUrl.toString());
    
    // Create response with redirect
    const response = NextResponse.redirect(authUrl.toString());
    
    // Set state cookie with proper options
    const isSecureEnvironment = baseUrl.startsWith('https://');
    response.cookies.set('xero_state', state, {
      expires: new Date(Date.now() + 1000 * 60 * 15), // 15 minutes
      httpOnly: true,
      secure: isSecureEnvironment,
      sameSite: isSecureEnvironment ? 'none' : 'lax',
      path: '/'
    });
    
    return response;
  } catch (error) {
    console.error('Xero auth error:', error);
    return NextResponse.json(
      { error: 'Xero authentication initialization failed' },
      { status: 500 }
    );
  }
}
