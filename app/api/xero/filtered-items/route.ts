// app/api/xero/filtered-items/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Define the function inline
async function callXeroApi(endpoint: string, options: RequestInit = {}) {
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

export async function GET(req: NextRequest) {
  try {
    console.log("Fetching filtered items from Xero...");
    
    // Fetch all items using the inline function
    const itemsData = await callXeroApi('Items');
    
    // Filter items by account code
    const filteredItems = itemsData.Items ? itemsData.Items.filter(item => {
      if (!item.PurchaseDetails || !item.PurchaseDetails.AccountCode) {
        return false;
      }
      
      const accountCode = item.PurchaseDetails.AccountCode;
      return ['430', '431', '432'].includes(accountCode);
    }) : [];
    
    // Format the items for the combo box
    const formattedItems = filteredItems.map(item => ({
      value: item.ItemID,
      label: item.Name,
      code: item.Code,
      description: item.Description,
      accountCode: item.PurchaseDetails?.AccountCode
    }));
    
    console.log(`Found ${formattedItems.length} items with account codes 430, 431, or 432`);
    
    return NextResponse.json({ items: formattedItems });
  } catch (error) {
    console.error('Error fetching filtered items:', error);
    
    // Check if it's an authentication error
    if (error.message.includes('No access token found') || 
        error.message.includes('No tenant ID found')) {
      return NextResponse.json({ 
        error: 'Authentication error', 
        details: error.message,
        needsReauth: true
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch filtered items', 
      details: error.message 
    }, { status: 500 });
  }
}