import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log("Test connection endpoint called");
    
    const accessToken = req.cookies.get('xero_access_token')?.value;
    console.log("Access token exists:", !!accessToken);

    if (!accessToken) {
      console.log("No access token found in cookies");
      return NextResponse.json({ error: 'No access token found' }, { status: 401 });
    }

    const tenantId = req.cookies.get('xero_tenant_id')?.value;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant ID found' }, { status: 401 });
    }

    // Test the connection by fetching organisations
    console.log("Attempting to fetch from Xero API...");
    
    try {
      const response = await fetch('https://api.xero.com/api.xro/2.0/Organisations', {
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
      console.log('Connection successful');
      return NextResponse.json(data);
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      return NextResponse.json({ 
        error: 'Error fetching from Xero API', 
        details: fetchError.message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Test connection error:', error);
    return NextResponse.json({ 
      error: 'Connection test failed', 
      details: error.message 
    }, { status: 500 });
  }
}