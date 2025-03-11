import { NextRequest, NextResponse } from 'next/server';
import { callXeroApi } from '@/lib/xero-auth';

export async function GET(req: NextRequest) {
  try {
    console.log("Test connection endpoint called");
    
    try {
      // Use the callXeroApi utility which handles token refresh
      const result = await callXeroApi('Organisations');
      
      console.log('Connection successful');
      
      // Create response with the data
      const response = NextResponse.json(result.data);
      
      // Set any cookies returned from token refresh
      if (result.cookies && result.cookies.length > 0) {
        console.log('Setting new cookies from token refresh');
        result.cookies.forEach(cookie => {
          response.cookies.set(cookie.name, cookie.value, cookie.options);
        });
      }
      
      return response;
    } catch (apiError) {
      console.error("API error:", apiError);
      
      // Check if it's an authentication error
      if (apiError.message && apiError.message.includes('Authentication error')) {
        return NextResponse.json({ 
          error: 'Authentication failed', 
          details: apiError.message 
        }, { status: 401 });
      }
      
      return NextResponse.json({ 
        error: 'Error fetching from Xero API', 
        details: apiError.message 
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