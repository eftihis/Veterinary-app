// app/api/xero/filtered-items/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log("Fetching filtered items from Xero...");
    
    const accessToken = req.cookies.get('xero_access_token')?.value;
    const tenantId = req.cookies.get('xero_tenant_id')?.value;
    
    if (!accessToken || !tenantId) {
      return NextResponse.json({ error: 'Not authenticated with Xero' }, { status: 401 });
    }

    // First, we need to fetch all items
    const itemsResponse = await fetch('https://api.xero.com/api.xro/2.0/Items', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Xero-Tenant-Id': tenantId
      },
    });
    
    if (!itemsResponse.ok) {
      const errorText = await itemsResponse.text();
      console.error('Failed to fetch items:', itemsResponse.status, errorText);
      return NextResponse.json({ 
        error: `Failed to fetch items: ${itemsResponse.status}`, 
        details: errorText 
      }, { status: itemsResponse.status });
    }

    const itemsData = await itemsResponse.json();
    
    // Filter items by account code
    // Note: We need to check if the item has a purchase details with the specified account code
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
    return NextResponse.json({ 
      error: 'Failed to fetch filtered items', 
      details: error.message 
    }, { status: 500 });
  }
}