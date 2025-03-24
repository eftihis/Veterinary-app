import { NextResponse } from 'next/server';
import { deleteFile } from '@/lib/cloudflare-r2';

export async function DELETE(request: Request) {
  try {
    const { fileKey } = await request.json();
    
    if (!fileKey) {
      return NextResponse.json({ error: 'fileKey is required' }, { status: 400 });
    }
    
    await deleteFile(fileKey);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
} 