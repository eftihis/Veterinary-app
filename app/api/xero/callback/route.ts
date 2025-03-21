import { NextRequest, NextResponse } from 'next/server';

// Prevent Next.js from attempting to statically generate this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    console.log("Callback endpoint called");
    console.log("Request URL:", req.url);
    
    // Check if Xero is disabled in this environment
    if (process.env.NEXT_PUBLIC_DISABLE_XERO === 'true') {
      console.error("Xero integration is disabled in this environment");
      return NextResponse.json(
        { error: "Xero integration is disabled in this environment. Please use HTTPS/localtunnel URL." },
        { status: 400 }
      );
    }
    
    // Get base URL from environment
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      console.error("Missing NEXT_PUBLIC_BASE_URL environment variable");
      return NextResponse.json({ error: "Missing base URL configuration" }, { status: 500 });
    }
    
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const storedState = req.cookies.get('xero_state')?.value;

    console.log("Code present:", !!code);
    console.log("State from URL:", state);
    console.log("State from cookie:", storedState);
    
    // Check for error parameter from Xero
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    if (errorParam) {
      console.error(`Xero returned an error: ${errorParam} - ${errorDescription}`);
      return NextResponse.json({ 
        error: 'Xero authorization error', 
        details: errorDescription || errorParam 
      }, { status: 400 });
    }

    // Verify we have a code
    if (!code) {
      console.error("Missing code parameter in callback");
      return NextResponse.json({ error: 'No authorization code received' }, { status: 400 });
    }

    // Verify state
    if (!state || !storedState || state !== storedState) {
      console.error("State verification failed");
      return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
    }

    console.log("State verified, exchanging code for tokens");
    console.log("Base URL for redirect:", baseUrl);

    // Exchange code for tokens
    const tokenResponse = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${baseUrl}/api/xero/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', tokenResponse.status, errorData);
      return NextResponse.json({ 
        error: 'Token exchange failed', 
        details: errorData 
      }, { status: tokenResponse.status });
    }

    const tokens = await tokenResponse.json();
    console.log('Tokens received successfully');

    // Calculate expiry time
    const expiryTime = Date.now() + tokens.expires_in * 1000;
    
    // Create response with redirect
    const redirectUrl = `${baseUrl}/xero-test`;
    console.log("Redirecting to:", redirectUrl);
    const response = NextResponse.redirect(redirectUrl);

    // Check if we're in a secure environment (HTTPS)
    const isSecureEnvironment = baseUrl.startsWith('https://');
    const cookieOptions = {
      httpOnly: true,
      secure: isSecureEnvironment,
      sameSite: isSecureEnvironment ? 'none' as const : 'lax' as const,
      path: '/'
    };

    // Set tokens in cookies
    response.cookies.set('xero_access_token', tokens.access_token, {
      ...cookieOptions,
      expires: new Date(expiryTime)
    });
    
    // Store the expiry timestamp
    response.cookies.set('xero_token_expiry', expiryTime.toString(), {
      ...cookieOptions,
      expires: new Date(expiryTime)
    });
    
    if (tokens.refresh_token) {
      response.cookies.set('xero_refresh_token', tokens.refresh_token, {
        ...cookieOptions,
        expires: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days
      });
    }

    // Get tenant ID and store it
    try {
      const tenantsResponse = await fetch('https://api.xero.com/connections', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (tenantsResponse.ok) {
        const tenants = await tenantsResponse.json();
        if (tenants && tenants.length > 0) {
          response.cookies.set('xero_tenant_id', tenants[0].tenantId, {
            ...cookieOptions,
            expires: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days
          });
          console.log("Tenant ID stored:", tenants[0].tenantId);
        }
      }
    } catch (error: Error | unknown) {
      console.error("Error fetching tenants:", error);
      // Continue anyway, as we have the tokens
    }

    return response;
  } catch (error: Error | unknown) {
    console.error('Xero callback error:', error);
    return NextResponse.json({ 
      error: 'Xero callback processing failed', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}