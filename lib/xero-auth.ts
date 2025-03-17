// lib/xero-auth.ts
import { cookies } from 'next/headers';

interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  error?: string;
  cookies?: {
    name: string;
    value: string;
    options: any;
  }[];
}

/**
 * Checks if the current access token is valid or needs refreshing
 * If needed, it will refresh the token automatically
 */
export async function ensureValidToken(): Promise<TokenRefreshResult> {
  // Check if Xero is disabled in this environment
  if (process.env.NEXT_PUBLIC_DISABLE_XERO === 'true') {
    console.error("Xero integration is disabled in this environment");
    return { 
      success: false, 
      error: 'Xero integration is disabled in this environment. Please use HTTPS/ngrok URL.' 
    };
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('xero_access_token')?.value;
  const refreshToken = cookieStore.get('xero_refresh_token')?.value;
  const tokenExpiry = cookieStore.get('xero_token_expiry')?.value;
  
  // If we don't have tokens, we can't refresh
  if (!accessToken || !refreshToken) {
    return { success: false, error: 'No tokens available' };
  }
  
  // Check if token is expired or will expire soon (within 5 minutes)
  const now = Date.now();
  const expiryTime = tokenExpiry ? parseInt(tokenExpiry, 10) : 0;
  const fiveMinutesInMs = 5 * 60 * 1000;
  
  // If token is still valid for more than 5 minutes, no need to refresh
  if (expiryTime > now + fiveMinutesInMs) {
    console.log('Token validation:');
    console.log('- Current time:', new Date(now).toISOString());
    console.log('- Token expiry:', expiryTime ? new Date(expiryTime).toISOString() : 'Not set');
    console.log('- Is expired:', expiryTime <= now);
    console.log('- Time until expiry:', expiryTime > now ? (expiryTime - now) / 1000 + ' seconds' : 'Expired');
    return { success: true, accessToken };
  }
  
  console.log('Access token expired or expiring soon. Refreshing...');
  
  try {
    // Refresh the token
    const response = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token refresh failed:', response.status, errorText);
      return { success: false, error: `Token refresh failed: ${response.status}` };
    }
    
    const tokens = await response.json();
    console.log('Token refreshed successfully');
    
    // Calculate expiry time
    const expiryTime = Date.now() + tokens.expires_in * 1000;
    
    // Get base URL to determine if we're in secure environment
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const isSecureEnvironment = baseUrl.startsWith('https://');
    
    // Instead of setting cookies directly, return them to be set by the API route
    const newCookies = [
      {
        name: 'xero_access_token',
        value: tokens.access_token,
        options: {
          expires: new Date(expiryTime),
          httpOnly: true,
          secure: isSecureEnvironment,
          sameSite: isSecureEnvironment ? 'none' : 'lax',
          path: '/'
        }
      },
      {
        name: 'xero_token_expiry',
        value: expiryTime.toString(),
        options: {
          expires: new Date(expiryTime),
          httpOnly: true,
          secure: isSecureEnvironment,
          sameSite: isSecureEnvironment ? 'none' : 'lax',
          path: '/'
        }
      }
    ];
    
    if (tokens.refresh_token) {
      newCookies.push({
        name: 'xero_refresh_token',
        value: tokens.refresh_token,
        options: {
          expires: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
          httpOnly: true,
          secure: isSecureEnvironment,
          sameSite: isSecureEnvironment ? 'none' : 'lax',
          path: '/'
        }
      });
    }
    
    return { 
      success: true, 
      accessToken: tokens.access_token,
      cookies: newCookies
    };
  } catch (error: any) {
    console.error('Token refresh error:', error);
    return { success: false, error: error.message || 'Token refresh failed' };
  }
}

/**
 * Makes an authenticated call to the Xero API with automatic token refresh
 */
export async function callXeroApi(endpoint: string, options: RequestInit = {}) {
  // Check if Xero is disabled in this environment
  if (process.env.NEXT_PUBLIC_DISABLE_XERO === 'true') {
    throw new Error('Xero integration is disabled in this environment. Please use HTTPS/ngrok URL.');
  }

  // First, ensure we have a valid token
  const tokenResult = await ensureValidToken();
  
  if (!tokenResult.success) {
    throw new Error(`Authentication error: ${tokenResult.error}`);
  }
  
  const cookieStore = await cookies();
  const tenantId = cookieStore.get('xero_tenant_id')?.value;
  
  if (!tenantId) {
    throw new Error('No tenant ID found');
  }
  
  // Prepare headers
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${tokenResult.accessToken}`);
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  headers.set('Xero-Tenant-Id', tenantId);
  
  // Make the API call
  const url = `https://api.xero.com/api.xro/2.0/${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Xero API error (${endpoint}):`, response.status, errorText);
    throw new Error(`Xero API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  
  // Return both the data and any cookies that need to be set
  return {
    data,
    cookies: tokenResult.cookies
  };
}