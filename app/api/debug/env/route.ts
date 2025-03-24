import { NextResponse } from 'next/server';

export async function GET() {
  // Get environment variables
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  
  // Mask secret values for security but show enough to verify
  const maskedSecretKey = secretAccessKey 
    ? `${secretAccessKey.substring(0, 4)}...${secretAccessKey.substring(secretAccessKey.length - 4)}`
    : null;
  
  const maskedAccessKey = accessKeyId
    ? `${accessKeyId.substring(0, 4)}...${accessKeyId.substring(accessKeyId.length - 4)}`
    : null;
  
  return NextResponse.json({
    cloudflareR2Config: {
      accountId: accountId || 'Not set',
      accessKeyId: maskedAccessKey || 'Not set',
      secretAccessKey: maskedSecretKey || 'Not set',
      bucketName: bucketName || 'Not set',
    },
    envLoadedCorrectly: !!(accountId && accessKeyId && secretAccessKey && bucketName),
    nodeEnv: process.env.NODE_ENV,
    nextPublicEnvExample: process.env.NEXT_PUBLIC_BASE_URL || 'Not set',
  });
} 