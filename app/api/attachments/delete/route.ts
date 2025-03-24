import { NextResponse } from 'next/server';
import { deleteFile } from '@/lib/cloudflare-r2';
import { supabase } from '@/lib/supabase';

export async function DELETE(request: Request) {
  try {
    const { fileKey } = await request.json();
    
    if (!fileKey) {
      return NextResponse.json({ error: 'fileKey is required' }, { status: 400 });
    }
    
    // First, check if any records in both attachment tables use this fileKey
    // This is to ensure we don't leave orphaned database records
    
    // Check invoice attachments
    const { data: invoiceAttachments, error: invoiceError } = await supabase
      .from('invoice_attachments')
      .delete()
      .eq('file_key', fileKey)
      .select();
    
    if (invoiceError) {
      console.error('Error deleting from invoice_attachments:', invoiceError);
    }
    
    // Check animal event attachments
    const { data: eventAttachments, error: eventError } = await supabase
      .from('animal_event_attachments')
      .delete()
      .eq('file_key', fileKey)
      .select();
    
    if (eventError) {
      console.error('Error deleting from animal_event_attachments:', eventError);
    }
    
    // Delete the file from R2 storage
    await deleteFile(fileKey);
    
    return NextResponse.json({ 
      success: true,
      deletedRecords: {
        invoiceAttachments: invoiceAttachments?.length || 0,
        eventAttachments: eventAttachments?.length || 0
      }
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
} 