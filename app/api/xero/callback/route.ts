import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const storedState = req.cookies.get('xero_state')?.value;

    // Verify state
    if (!state || !storedState || state !== storedState) {
      return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
    }

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
      throw new Error(`Token exchange failed: ${errorData}`);
    }

    const tokens = await tokenResponse.json();
    console.log('Tokens received:', tokens);

    // Create response with redirect
    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/xero-test`);

    // Set tokens in cookies
    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);
    response.cookies.set('xero_access_token', tokens.access_token, {
      expires: tokenExpiry,
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

    // Get the tenant ID
    const tenantsResponse = await fetch('https://api.xero.com/connections', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (tenantsResponse.ok) {
      const tenants = await tenantsResponse.json();
      if (tenants && tenants.length > 0) {
        // Store the first tenant ID in a cookie
        response.cookies.set('xero_tenant_id', tenants[0].tenantId, {
          expires: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
          httpOnly: true,
          secure: true,
          sameSite: 'lax'
        });
        console.log("Tenant ID stored:", tenants[0].tenantId);
      }
    }

    return response;
  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.json({ error: 'Callback failed' }, { status: 500 });
  }
}