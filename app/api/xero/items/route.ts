import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log("Fetching items from Xero...");
    
    const accessToken = req.cookies.get('xero_access_token')?.value;
    const tenantId = req.cookies.get('xero_tenant_id')?.value;
    
    console.log("Access token exists:", !!accessToken);
    console.log("Tenant ID exists:", !!tenantId);

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token found' }, { status: 401 });
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant ID found' }, { status: 401 });
    }

    // Fetch items from Xero
    console.log("Making API request to Xero for items...");
    
    const response = await fetch('https://api.xero.com/api.xro/2.0/Items', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Xero-Tenant-Id': tenantId
      },
    });
    
    console.log("Xero API response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API request failed:', response.status, errorText);
      return NextResponse.json({ 
        error: `API request failed: ${response.status}`, 
        details: errorText 
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('Items fetched successfully');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch items', 
      details: error.message 
    }, { status: 500 });
  }
}