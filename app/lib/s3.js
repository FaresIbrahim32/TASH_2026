import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const clientConfig = {
  region: process.env.AWS_REGION || "us-east-2",
};

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

let s3Client;

if (process.env.NODE_ENV === "production") {
  s3Client = new S3Client(clientConfig);
} else {
  if (!global._s3Client) {
    global._s3Client = new S3Client(clientConfig);
  }
  s3Client = global._s3Client;
}

const EXTENSION_MAP = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "mp4",
  "audio/m4a": "m4a",
  "audio/aac": "aac",
};

/**
 * Generates a presigned S3 upload URL for a specific file payload.
 * @param {string} userId - The unique identifier of the user (e.g. usr_abc123)
 * @param {string} submissionId - The unique identifier of the submission (e.g. sub_xyz789)
 * @param {string} filenameWithoutExt - The field key name (e.g. recallAudio_en)
 * @param {string} contentType - The MIME type of the file (e.g. audio/webm)
 * @returns {Promise<{uploadUrl: string, publicUrl: string}>} - The presigned PUT URL and the final public URL.
 */
export async function getPresignedUploadUrl(userId, submissionId, filenameWithoutExt, contentType) {
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("AWS_S3_BUCKET_NAME is not set in environment variables.");
  }

  // Determine file extension
  const cleanMime = contentType.split(";")[0].trim().toLowerCase();
  const ext = EXTENSION_MAP[cleanMime] || "bin";
  const key = `${userId}/${submissionId}/${filenameWithoutExt}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  // URL expires in 15 minutes (900 seconds)
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
  const publicUrl = `https://${bucketName}.s3.${clientConfig.region}.amazonaws.com/${key}`;

  return { uploadUrl, publicUrl };
}
