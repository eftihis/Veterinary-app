import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log("Callback endpoint called");
    console.log("Request URL:", req.url);
    
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const storedState = req.cookies.get('xero_state')?.value;

    console.log("Code present:", !!code);
    console.log("State from URL:", state);
    console.log("State from cookie:", storedState);

    // Verify state
    if (!state || !storedState || state !== storedState) {
      console.error("State verification failed");
      return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
    }

    console.log("State verified, exchanging code for tokens");
    console.log("Base URL for redirect:", process.env.NEXT_PUBLIC_BASE_URL);

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
        code: code!,
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/xero/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
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
    const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/xero-test`;
    console.log("Redirecting to:", redirectUrl);
    const response = NextResponse.redirect(redirectUrl);

    // Set tokens in cookies
    response.cookies.set('xero_access_token', tokens.access_token, {
      expires: new Date(expiryTime),
      httpOnly: true,
      secure: true,
      sameSite: 'lax'
    });
    
    // Store the expiry timestamp
    response.cookies.set('xero_token_expiry', expiryTime.toString(), {
      expires: new Date(expiryTime),
      httpOnly: true,
      secure: true,
      sameSite: 'lax'
    });
    
    if (tokens.refresh_token) {
      response.cookies.set('xero_refresh_token', tokens.refresh_token, {
        expires: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
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
            expires: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
            httpOnly: true,
            secure: true,
            sameSite: 'lax'
          });
          console.log("Tenant ID stored:", tenants[0].tenantId);
        }
      }
    } catch (error: any) {
      console.error("Error fetching tenants:", error);
      // Continue anyway, as we have the tokens
    }

    return response;
  } catch (error: any) {
    console.error('Callback error:', error);
    return NextResponse.json({ 
      error: 'Callback failed', 
      details: error.message 
    }, { status: 500 });
  }
}