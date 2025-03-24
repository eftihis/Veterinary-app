import { NextResponse } from 'next/server';
import { getUploadUrl } from '@/lib/cloudflare-r2';

export async function POST(request: Request) {
  try {
    const { fileName, contentType } = await request.json();
    
    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'fileName and contentType are required' }, { status: 400 });
    }
    
    const { uploadUrl, fileKey } = await getUploadUrl(fileName, contentType);
    
    return NextResponse.json({ uploadUrl, fileKey });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
} 