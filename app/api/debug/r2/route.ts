import { NextResponse } from 'next/server';
import { debugR2Config } from '@/lib/cloudflare-r2-debug';

export async function GET() {
  try {
    const result = await debugR2Config();
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to check R2 configuration',
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
} 