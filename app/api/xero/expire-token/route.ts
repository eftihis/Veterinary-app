// app/api/xero/expire-token/route.ts
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
// Commenting out unused imports since we don't need them
// import { cookies } from 'next/headers';

export async function GET(_req: NextRequest) {
  try {
    // Set token expiry to a past time
    const response = NextResponse.json({ success: true });
    
    // Clear cookies by setting expired dates
    response.cookies.set('xero_access_token', '', { maxAge: 0 });
    response.cookies.set('xero_refresh_token', '', { maxAge: 0 });
    response.cookies.set('xero_id_token', '', { maxAge: 0 });
    response.cookies.set('xero_expires_at', '', { maxAge: 0 });
    
    return response;
  } catch (error) {
    console.error('Error expiring tokens:', error);
    return NextResponse.json({ success: false, error: 'Failed to expire tokens' }, { status: 500 });
  }
}