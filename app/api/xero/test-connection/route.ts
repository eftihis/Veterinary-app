import { NextResponse } from 'next/server';
import { callXeroApi } from '@/lib/xero-auth';

export async function GET() {
  try {
    console.log("Test connection endpoint called");
    
    // Check if Xero is disabled in this environment
    if (process.env.NEXT_PUBLIC_DISABLE_XERO === 'true') {
      console.error("Xero integration is disabled in this environment");
      return NextResponse.json(
        { error: "Xero integration is disabled in this environment. Please use HTTPS/ngrok URL." },
        { status: 400 }
      );
    }
    
    try {
      // Use the callXeroApi utility which handles token refresh
      const result = await callXeroApi('Organisations');
      
      console.log('Connection successful');
      
      // Get the base URL to determine if we're in a secure environment
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      const isSecureEnvironment = baseUrl.startsWith('https://');
      
      // Create response with the data
      const response = NextResponse.json(result.data);
      
      // Set any cookies returned from token refresh
      if (result.cookies && result.cookies.length > 0) {
        console.log('Setting new cookies from token refresh');
        result.cookies.forEach(cookie => {
          // Make sure to use the environment-aware secure flag
          const cookieOptions = {
            ...cookie.options,
            secure: isSecureEnvironment,
            sameSite: isSecureEnvironment ? 'none' as const : 'lax' as const
          };
          response.cookies.set(cookie.name, cookie.value, cookieOptions);
        });
      }
      
      return response;
    } catch (apiError: Error | unknown) {
      console.error("API error:", apiError);
      
      // Check if it's an authentication error
      if (apiError instanceof Error && apiError.message.includes('Authentication error')) {
        return NextResponse.json({ 
          error: 'Authentication failed', 
          details: apiError.message 
        }, { status: 401 });
      }
      
      return NextResponse.json({ 
        error: 'Error fetching from Xero API', 
        details: apiError instanceof Error ? apiError.message : String(apiError) 
      }, { status: 500 });
    }
  } catch (error: Error | unknown) {
    console.error('Test connection error:', error);
    return NextResponse.json({ 
      error: 'Connection test failed', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}