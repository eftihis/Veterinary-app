import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';

// Initialize S3 client for Cloudflare R2 with improved error handling
let R2: S3Client;
let BUCKET_NAME: string;

try {
  // Debug log to verify environment variables
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || '';

  console.log('Cloudflare R2 configuration status:');
  console.log(`ACCOUNT_ID: ${accountId ? 'set' : 'missing'}`);
  console.log(`ACCESS_KEY_ID: ${accessKeyId ? 'set' : 'missing'}`);
  console.log(`SECRET_ACCESS_KEY: ${secretAccessKey ? 'set✓' : 'missing'}`);
  console.log(`BUCKET_NAME: ${BUCKET_NAME ? 'set✓' : 'missing'}`);

  if (!accountId || !accessKeyId || !secretAccessKey || !BUCKET_NAME) {
    throw new Error('Cloudflare R2 environment variables are not properly configured');
  }

  R2 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  console.log('Cloudflare R2 client initialized successfully');
} catch (error) {
  console.error('Error initializing Cloudflare R2 client:', error);
  // Create a dummy client that will throw helpful errors when used
  R2 = {} as S3Client;
  BUCKET_NAME = '';
}

// Generate a safe file name
export const generateSafeFileName = (originalName: string): string => {
  const extension = originalName.split('.').pop() || '';
  const uniqueId = uuidv4();
  const timestamp = Date.now();
  return `${timestamp}-${uniqueId}.${extension}`;
};

// Get a pre-signed URL for file upload
export const getUploadUrl = async (fileName: string, contentType: string) => {
  if (!BUCKET_NAME) {
    throw new Error('CLOUDFLARE_R2_BUCKET_NAME environment variable is not set');
  }
  
  try {
    const safeName = generateSafeFileName(fileName);
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: safeName,
      ContentType: contentType,
    });
    
    const signedUrl = await getSignedUrl(R2, command, { expiresIn: 3600 });
    
    return {
      uploadUrl: signedUrl,
      fileKey: safeName,
    };
  } catch (error) {
    console.error('Error generating upload URL:', error);
    throw new Error('Failed to generate upload URL due to R2 configuration issue');
  }
};

// Get a pre-signed URL for file download
export const getDownloadUrl = async (fileKey: string) => {
  if (!BUCKET_NAME) {
    throw new Error('CLOUDFLARE_R2_BUCKET_NAME environment variable is not set');
  }
  
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    });
    
    return await getSignedUrl(R2, command, { expiresIn: 3600 });
  } catch (error) {
    console.error(`Error generating download URL for ${fileKey}:`, error);
    throw new Error(`Failed to generate download URL due to R2 configuration issue`);
  }
};

// Delete a file from R2
export const deleteFile = async (fileKey: string) => {
  if (!BUCKET_NAME) {
    throw new Error('CLOUDFLARE_R2_BUCKET_NAME environment variable is not set');
  }
  
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    });
    
    return await R2.send(command);
  } catch (error) {
    console.error(`Error deleting file ${fileKey} from R2:`, error);
    throw new Error('R2 bucket name not configured');
  }
};

// Identify and clean up orphaned files
export const cleanupOrphanedFiles = async () => {
  console.log('Starting orphaned files cleanup process...');
  
  try {
    // Get all files from R2
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
    });
    
    const { Contents: files } = await R2.send(command);
    
    if (!files || files.length === 0) {
      console.log('No files found in R2 bucket');
      return { success: true, removedFiles: 0 };
    }
    
    // Extract file keys
    const fileKeys = files.map(file => file.Key);
    
    console.log(`Found ${fileKeys.length} files in R2 bucket`);
    
    // Get all file keys from both attachment tables
    const { data: invoiceAttachments, error: invoiceError } = await supabase
      .from('invoice_attachments')
      .select('file_key');
      
    if (invoiceError) {
      console.error('Error getting invoice attachments:', invoiceError);
      throw new Error('Failed to fetch invoice attachments');
    }
    
    const { data: eventAttachments, error: eventError } = await supabase
      .from('animal_event_attachments')
      .select('file_key');
      
    if (eventError) {
      console.error('Error getting event attachments:', eventError);
      throw new Error('Failed to fetch event attachments');
    }
    
    // Combine all valid file keys from the database
    const validFileKeys = [
      ...(invoiceAttachments || []).map(a => a.file_key),
      ...(eventAttachments || []).map(a => a.file_key)
    ];
    
    console.log(`Found ${validFileKeys.length} valid files in database`);
    
    // Find orphaned files (files in R2 but not in database)
    const orphanedFileKeys = fileKeys.filter(key => 
      key && !validFileKeys.includes(key)
    );
    
    console.log(`Found ${orphanedFileKeys.length} orphaned files to delete`);
    
    // Delete orphaned files
    const deletionPromises = orphanedFileKeys.map(async (fileKey) => {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileKey,
      });
      
      await R2.send(deleteCommand);
      console.log(`Deleted orphaned file: ${fileKey}`);
      return fileKey;
    });
    
    const deletedFiles = await Promise.all(deletionPromises);
    
    return { 
      success: true, 
      removedFiles: deletedFiles.length,
      filesRemoved: deletedFiles
    };
  } catch (error) {
    console.error('Error cleaning up orphaned files:', error);
    throw error;
  }
};

// Delete all attachments for a specific invoice
export const deleteInvoiceAttachments = async (invoiceId: string) => {
  console.log(`Deleting attachments for invoice: ${invoiceId}`);
  
  try {
    // 1. First, fetch all attachments for this invoice
    const { data: attachments, error } = await supabase
      .from('invoice_attachments')
      .select('file_key')
      .eq('invoice_id', invoiceId);
      
    if (error) {
      console.error('Error fetching invoice attachments:', error);
      throw error;
    }
    
    if (!attachments || attachments.length === 0) {
      console.log(`No attachments found for invoice: ${invoiceId}`);
      return { success: true, removedFiles: 0 };
    }
    
    console.log(`Found ${attachments.length} attachments to delete for invoice: ${invoiceId}`);
    
    // 2. Delete each attachment file from R2
    const fileKeys = attachments.map(attachment => attachment.file_key);
    
    const deletionPromises = fileKeys.map(async (fileKey) => {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey,
        });
        
        await R2.send(deleteCommand);
        console.log(`Deleted attachment file: ${fileKey}`);
        return fileKey;
      } catch (deleteError) {
        console.error(`Error deleting file ${fileKey}:`, deleteError);
        return null;
      }
    });
    
    const results = await Promise.all(deletionPromises);
    const deletedFiles = results.filter(result => result !== null);
    
    return { 
      success: true, 
      removedFiles: deletedFiles.length,
      filesRemoved: deletedFiles
    };
  } catch (error) {
    console.error('Error deleting invoice attachments:', error);
    throw error;
  }
};

// Delete all attachments for multiple invoices
export const deleteBatchInvoiceAttachments = async (invoiceIds: string[]) => {
  console.log(`Deleting attachments for ${invoiceIds.length} invoices`);
  
  try {
    // Process each invoice
    const results = await Promise.all(invoiceIds.map(id => deleteInvoiceAttachments(id)));
    
    // Aggregate results
    const totalRemoved = results.reduce((sum, result) => sum + result.removedFiles, 0);
    
    return {
      success: true,
      removedFiles: totalRemoved,
      invoicesProcessed: invoiceIds.length
    };
  } catch (error) {
    console.error('Error in batch attachment deletion:', error);
    throw error;
  }
};

// Delete all attachments for a specific animal's events
export const deleteAnimalEventAttachments = async (animalId: string) => {
  console.log(`Deleting event attachments for animal: ${animalId}`);
  
  try {
    // 1. First, fetch all events for this animal
    const { data: events, error: eventError } = await supabase
      .from('animal_events')
      .select('id')
      .eq('animal_id', animalId);
      
    if (eventError) {
      console.error('Error fetching animal events:', eventError);
      throw eventError;
    }
    
    if (!events || events.length === 0) {
      console.log(`No events found for animal: ${animalId}`);
      return { success: true, removedFiles: 0 };
    }
    
    const eventIds = events.map(event => event.id);
    console.log(`Found ${eventIds.length} events for animal: ${animalId}`);
    
    // 2. Fetch all attachments for these events
    const { data: attachments, error: attachmentError } = await supabase
      .from('animal_event_attachments')
      .select('file_key')
      .in('event_id', eventIds);
      
    if (attachmentError) {
      console.error('Error fetching event attachments:', attachmentError);
      throw attachmentError;
    }
    
    if (!attachments || attachments.length === 0) {
      console.log(`No attachments found for animal events: ${animalId}`);
      return { success: true, removedFiles: 0 };
    }
    
    console.log(`Found ${attachments.length} attachments to delete for animal: ${animalId}`);
    
    // 3. Delete each attachment file from R2
    const fileKeys = attachments.map(attachment => attachment.file_key);
    
    const deletionPromises = fileKeys.map(async (fileKey) => {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey,
        });
        
        await R2.send(deleteCommand);
        console.log(`Deleted event attachment file: ${fileKey}`);
        return fileKey;
      } catch (deleteError) {
        console.error(`Error deleting file ${fileKey}:`, deleteError);
        return null;
      }
    });
    
    const results = await Promise.all(deletionPromises);
    const deletedFiles = results.filter(result => result !== null);
    
    return { 
      success: true, 
      removedFiles: deletedFiles.length,
      filesRemoved: deletedFiles
    };
  } catch (error) {
    console.error('Error deleting animal event attachments:', error);
    throw error;
  }
};

// Delete all attachments for events from multiple animals
export const deleteBatchAnimalEventAttachments = async (animalIds: string[]) => {
  console.log(`Deleting event attachments for ${animalIds.length} animals`);
  
  try {
    // Process each animal
    const results = await Promise.all(animalIds.map(id => deleteAnimalEventAttachments(id)));
    
    // Aggregate results
    const totalRemoved = results.reduce((sum, result) => sum + result.removedFiles, 0);
    
    return {
      success: true,
      removedFiles: totalRemoved,
      animalsProcessed: animalIds.length
    };
  } catch (error) {
    console.error('Error in batch animal event attachment deletion:', error);
    throw error;
  }
};

// Delete all attachments for a specific animal event
export const deleteEventAttachments = async (eventId: string) => {
  console.log(`Deleting attachments for event: ${eventId}`);
  
  try {
    // Fetch all attachments for this event
    const { data: attachments, error } = await supabase
      .from('animal_event_attachments')
      .select('file_key')
      .eq('event_id', eventId);
      
    if (error) {
      console.error('Error fetching event attachments:', error);
      throw error;
    }
    
    if (!attachments || attachments.length === 0) {
      console.log(`No attachments found for event: ${eventId}`);
      return { success: true, removedFiles: 0 };
    }
    
    console.log(`Found ${attachments.length} attachments to delete for event: ${eventId}`);
    
    // Delete each attachment file from R2
    const fileKeys = attachments.map(attachment => attachment.file_key);
    
    const deletionPromises = fileKeys.map(async (fileKey) => {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey,
        });
        
        await R2.send(deleteCommand);
        console.log(`Deleted event attachment file: ${fileKey}`);
        return fileKey;
      } catch (deleteError) {
        console.error(`Error deleting file ${fileKey}:`, deleteError);
        return null;
      }
    });
    
    const results = await Promise.all(deletionPromises);
    const deletedFiles = results.filter(result => result !== null);
    
    return { 
      success: true, 
      removedFiles: deletedFiles.length,
      filesRemoved: deletedFiles
    };
  } catch (error) {
    console.error('Error deleting event attachments:', error);
    throw error;
  }
}; 