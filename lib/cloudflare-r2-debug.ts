import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

/**
 * Debug utility for Cloudflare R2 configuration and connectivity
 */
export async function debugR2Config(): Promise<{
  status: 'success' | 'error';
  message: string;
  configStatus: {
    accountId: boolean;
    accessKeyId: boolean;
    secretAccessKey: boolean;
    bucketName: boolean;
  };
  connectionSuccess?: boolean;
  details?: any;
}> {
  // Check environment variables
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  
  const configStatus = {
    accountId: !!accountId,
    accessKeyId: !!accessKeyId,
    secretAccessKey: !!secretAccessKey,
    bucketName: !!bucketName,
  };
  
  // If any configuration is missing, return error
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return {
      status: 'error',
      message: 'R2 configuration incomplete - missing environment variables',
      configStatus,
    };
  }
  
  try {
    // Try to initialize R2 client and list objects
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 1,
    });
    
    const response = await client.send(command);
    
    return {
      status: 'success',
      message: 'R2 configuration valid and connection successful',
      configStatus,
      connectionSuccess: true,
      details: {
        bucketName,
        objectCount: response.KeyCount || 0,
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'R2 configuration valid but connection failed',
      configStatus,
      connectionSuccess: false,
      details: error,
    };
  }
} 