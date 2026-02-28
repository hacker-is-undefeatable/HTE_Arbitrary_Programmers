import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

let s3Client: S3Client | null = null;

export class S3ConfigError extends Error {
  constructor(message = 'Missing AWS S3 environment variables.') {
    super(message);
    this.name = 'S3ConfigError';
  }
}

export function isS3Configured(): boolean {
  return Boolean(
    process.env.AWS_S3_BUCKET &&
      process.env.AWS_REGION &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
  );
}

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  return s3Client;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function uploadFileToS3(params: {
  userId: string;
  file: File;
  folder: 'videos' | 'audio' | 'notes';
}): Promise<string> {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION;

  if (!isS3Configured() || !bucket || !region) {
    throw new S3ConfigError();
  }

  const now = Date.now();
  const ext = params.file.name.includes('.') ? params.file.name.split('.').pop() : 'bin';
  const key = `quick-create/${params.userId}/${params.folder}/${now}-${sanitizeFileName(params.file.name)}.${ext}`;

  const body = Buffer.from(await params.file.arrayBuffer());

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: params.file.type || 'application/octet-stream',
    })
  );

  const explicitBase = process.env.AWS_S3_PUBLIC_BASE_URL;
  if (explicitBase) {
    return `${explicitBase.replace(/\/$/, '')}/${key}`;
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
