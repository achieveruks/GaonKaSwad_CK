import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const AWS_REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1';
const S3_MEDIA_BUCKET = process.env.S3_MEDIA_BUCKET || 'swadclick-media-prod';

// Singleton S3 client instance
export const s3Client = new S3Client({
  region: AWS_REGION,
});

/**
 * Upload a binary buffer (e.g. generated PDF or image) to S3
 */
export async function uploadBufferToS3(
  key: string,
  buffer: Buffer,
  contentType: string = 'application/octet-stream',
  bucketName: string = S3_MEDIA_BUCKET
): Promise<{ success: boolean; key: string; error?: string }> {
  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);
    return { success: true, key };
  } catch (err: any) {
    console.error(`[S3 Storage] Failed to upload ${key} to ${bucketName}:`, err);
    return { success: false, key, error: err.message || 'S3 upload failed' };
  }
}

/**
 * Generate a secure presigned download URL for a file in S3
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresInSeconds: number = 900, // 15 minutes default
  bucketName: string = S3_MEDIA_BUCKET
): Promise<string | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: expiresInSeconds,
    });
    return presignedUrl;
  } catch (err: any) {
    console.error(`[S3 Storage] Failed to generate presigned URL for ${key}:`, err);
    return null;
  }
}

/**
 * Check if running inside AWS Lambda environment
 */
export function isLambdaEnvironment(): boolean {
  return Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
}
