import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
    xeroClientId: process.env.XERO_CLIENT_ID ? 'Set (hidden)' : 'Not set',
    xeroClientSecret: process.env.XERO_CLIENT_SECRET ? 'Set (hidden)' : 'Not set',
    webhookUrl: process.env.NEXT_PUBLIC_WEBHOOK_URL ? 'Set (hidden)' : 'Not set',
  });
} 