import { NextResponse } from 'next/server';
import { getDownloadUrl } from '@/lib/cloudflare-r2';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const fileKey = url.searchParams.get('fileKey');
    
    if (!fileKey) {
      return NextResponse.json({ error: 'fileKey is required' }, { status: 400 });
    }
    
    const downloadUrl = await getDownloadUrl(fileKey);
    
    return NextResponse.json({ downloadUrl });
  } catch (error) {
    console.error('Error generating download URL:', error);
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
  }
} 