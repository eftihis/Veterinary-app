const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: './.env.local' });

// Log environment variables (masked for security)
console.log('Environment Variables Check:');
console.log('--------------------------');
console.log(`ACCOUNT_ID: ${process.env.CLOUDFLARE_R2_ACCOUNT_ID ? 'Set ✓' : 'MISSING ❌'}`);
console.log(`ACCESS_KEY_ID: ${process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ? 'Set ✓' : 'MISSING ❌'}`);
console.log(`SECRET_ACCESS_KEY: ${process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ? 'Set ✓' : 'MISSING ❌'}`);
console.log(`BUCKET_NAME: ${process.env.CLOUDFLARE_R2_BUCKET_NAME ? 'Set ✓' : 'MISSING ❌'}`);
console.log('--------------------------');

if (!process.env.CLOUDFLARE_R2_ACCOUNT_ID ||
    !process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    !process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    !process.env.CLOUDFLARE_R2_BUCKET_NAME) {
  console.error('One or more required environment variables are missing!');
  process.exit(1);
}

async function testR2Connection() {
  try {
    console.log('Testing Cloudflare R2 connection...');
    
    // Initialize the S3 client for Cloudflare R2
    const r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      },
    });
    
    // Try to list objects in the bucket
    const command = new ListObjectsV2Command({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      MaxKeys: 1, // We only need to check if the operation succeeds
    });
    
    const response = await r2Client.send(command);
    
    console.log('✅ Successfully connected to Cloudflare R2!');
    console.log(`Bucket: ${process.env.CLOUDFLARE_R2_BUCKET_NAME}`);
    console.log(`Objects in bucket: ${response.KeyCount || 0}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Cloudflare R2:');
    console.error(error);
    return false;
  }
}

testR2Connection()
  .then(success => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 