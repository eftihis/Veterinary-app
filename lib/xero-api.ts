// lib/xero-api.ts - Make sure this file has the following content
import { cookies } from 'next/headers';

// Make sure to use the 'export' keyword before the function
export async function callXeroApi(endpoint: string, options: RequestInit = {}) {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('xero_access_token')?.value;
  const tenantId = cookieStore.get('xero_tenant_id')?.value;
  
  if (!accessToken) {
    throw new Error('No access token found');
  }
  
  if (!tenantId) {
    throw new Error('No tenant ID found');
  }
  
  // Make the API call
  const url = `https://api.xero.com/api.xro/2.0/${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Xero-Tenant-Id': tenantId,
      ...(options.headers || {})
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Xero API error (${endpoint}):`, response.status, errorText);
    throw new Error(`Xero API error: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}