// app/api/xero/filtered-items/route.ts
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { callXeroApi } from '@/lib/xero-auth';

// Define types for Xero items
type XeroItem = {
  ItemID: string;
  Name: string;
  Code: string;
  Description?: string;
  PurchaseDetails?: {
    AccountCode?: string;
  };
};

type FormattedXeroItem = {
  value: string;
  label: string;
  code: string;
  description?: string;
  accountCode?: string;
};

// Cache implementation
let cachedItems: FormattedXeroItem[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function GET(_req: NextRequest) {
  try {
    // Check if we have valid cached data
    const currentTime = Date.now();
    if (cachedItems && (currentTime - cacheTimestamp) < CACHE_TTL) {
      console.log("Returning cached Xero items");
      return NextResponse.json({ items: cachedItems });
    }
    
    console.log("Fetching filtered items from Xero...");
    
    // Fetch all items using our utility that handles token refresh
    const result = await callXeroApi('Items');
    const itemsData = result.data;
    
    // Filter items by account code
    const filteredItems = itemsData.Items ? itemsData.Items.filter((item: XeroItem) => {
      if (!item.PurchaseDetails || !item.PurchaseDetails.AccountCode) {
        return false;
      }
      
      const accountCode = item.PurchaseDetails.AccountCode;
      return ['430', '431', '432'].includes(accountCode);
    }) : [];
    
    // Format the items for the combo box
    const formattedItems = filteredItems.map((item: XeroItem) => ({
      value: item.ItemID,
      label: item.Name,
      code: item.Code,
      description: item.Description,
      accountCode: item.PurchaseDetails?.AccountCode
    }));
    
    console.log(`Found ${formattedItems.length} items with account codes 430, 431, or 432`);
    
    // Update the cache
    cachedItems = formattedItems;
    cacheTimestamp = currentTime;
    
    // Create the response
    const response = NextResponse.json({ items: formattedItems });
    
    // Set any cookies from token refresh
    if (result.cookies) {
      result.cookies.forEach(cookie => {
        response.cookies.set(cookie.name, cookie.value, cookie.options);
      });
    }
    
    return response;
  } catch (error: unknown) {
    console.error('Error fetching filtered items:', error);
    
    // Check if it's an authentication error
    if (error instanceof Error && (
        error.message.includes('Authentication error') || 
        error.message.includes('No tenant ID found'))) {
      return NextResponse.json({ 
        error: 'Authentication error', 
        details: error.message,
        needsReauth: true
      }, { status: 401 });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to fetch filtered items', 
      details: errorMessage 
    }, { status: 500 });
  }
}