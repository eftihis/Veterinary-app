// app/api/xero/filtered-items/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { callXeroApi } from '@/lib/xero-auth';

export async function GET(req: NextRequest) {
  try {
    console.log("Fetching filtered items from Xero...");
    
    // Fetch all items using our utility that handles token refresh
    const result = await callXeroApi('Items');
    const itemsData = result.data;
    
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
    
    // Create the response
    const response = NextResponse.json({ items: formattedItems });
    
    // Set any cookies from token refresh
    if (result.cookies) {
      result.cookies.forEach(cookie => {
        response.cookies.set(cookie.name, cookie.value, cookie.options);
      });
    }
    
    return response;
  } catch (error) {
    console.error('Error fetching filtered items:', error);
    
    // Check if it's an authentication error
    if (error.message.includes('Authentication error') || 
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