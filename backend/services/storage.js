const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, S3Client } = require('@aws-sdk/client-s3');

const localUploadsDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads', 'projects');
const hasR2Configuration = Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET);
const configuredDriver = process.env.STORAGE_DRIVER || (hasR2Configuration ? 'r2' : 'local');

if (configuredDriver === 'r2' && !hasR2Configuration) {
  throw new Error('STORAGE_DRIVER=r2 requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET.');
}

if (process.env.NODE_ENV === 'production' && configuredDriver !== 'r2') {
  console.warn('Durable R2 storage is not configured; document uploads are disabled in production.');
}

const r2 = hasR2Configuration ? new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
}) : null;

const buildStorageKey = (projectId, originalName) => `projects/${projectId}/${Date.now()}-${crypto.randomUUID()}${path.extname(originalName || '').toLowerCase()}`;
const ensureLocalDirectory = async () => fs.promises.mkdir(localUploadsDir, { recursive: true });

const putObject = async ({ key, buffer, mimeType }) => {
  if (configuredDriver === 'r2') {
    await r2.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key, Body: buffer, ContentType: mimeType }));
    return { storageKey: key, fileUrl: null };
  }
  if (process.env.NODE_ENV === 'production') throw new Error('Document uploads require Cloudflare R2 in production.');
  await ensureLocalDirectory();
  const fileName = path.basename(key);
  await fs.promises.writeFile(path.join(localUploadsDir, fileName), buffer);
  return { storageKey: `local:${fileName}`, fileUrl: null };
};

const getObject = async (storageKey) => {
  if (storageKey.startsWith('local:')) {
    return { body: fs.createReadStream(path.join(localUploadsDir, storageKey.slice('local:'.length))), contentType: null };
  }
  const result = await r2.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: storageKey }));
  return { body: result.Body, contentType: result.ContentType };
};

const deleteObject = async (storageKey) => {
  if (!storageKey) return;
  if (storageKey.startsWith('local:')) {
    await fs.promises.unlink(path.join(localUploadsDir, storageKey.slice('local:'.length))).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
    return;
  }
  await r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: storageKey }));
};

module.exports = { buildStorageKey, deleteObject, getObject, putObject };
