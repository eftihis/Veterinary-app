import { S3Client } from '@aws-sdk/client-s3';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

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