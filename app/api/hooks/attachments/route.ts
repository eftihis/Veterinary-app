import { NextResponse } from 'next/server';
import { deleteFile } from '@/lib/cloudflare-r2';

// Webhook to handle Supabase database trigger events for attachment deletions
export async function POST(request: Request) {
  try {
    // Verify webhook signature (you should add proper verification in production)
    // const signature = request.headers.get('webhook-signature');
    
    const payload = await request.json();
    
    // Check if this is a valid delete event
    if (!payload.type || payload.type !== 'DELETE' || !payload.table || !payload.record) {
      return NextResponse.json({ 
        status: 'skipped', 
        message: 'Not a valid delete event' 
      });
    }
    
    // Handle attachment deletions
    if (payload.table === 'invoice_attachments' || payload.table === 'animal_event_attachments') {
      const fileKey = payload.record.file_key;
      
      if (!fileKey) {
        return NextResponse.json({ 
          status: 'error', 
          message: 'No file key found in deleted record' 
        }, { status: 400 });
      }
      
      // Delete the file from R2
      await deleteFile(fileKey);
      
      return NextResponse.json({ 
        status: 'success', 
        message: `File ${fileKey} deleted successfully` 
      });
    }
    
    return NextResponse.json({ 
      status: 'skipped', 
      message: 'Event not applicable for attachment handling' 
    });
  } catch (error) {
    console.error('Error handling attachment webhook:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: 'Failed to process attachment webhook',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 