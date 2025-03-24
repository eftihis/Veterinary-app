import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';

// Initialize S3 client for Cloudflare R2
const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

// Generate a safe file name
export const generateSafeFileName = (originalName: string): string => {
  const extension = originalName.split('.').pop() || '';
  const uniqueId = uuidv4();
  const timestamp = Date.now();
  return `${timestamp}-${uniqueId}.${extension}`;
};

// Get a pre-signed URL for file upload
export const getUploadUrl = async (fileName: string, contentType: string) => {
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
};

// Get a pre-signed URL for file download
export const getDownloadUrl = async (fileKey: string) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });
  
  return await getSignedUrl(R2, command, { expiresIn: 3600 });
};

// Delete a file from R2
export const deleteFile = async (fileKey: string) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });
  
  return await R2.send(command);
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