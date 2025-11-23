const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');

/**
 * AWS S3 Service for BibleOps
 * Handles PDF upload and generates presigned URLs with 7-day expiration (AWS maximum)
 */

// Initialize S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'bibleops-pdfs';
const PRESIGNED_URL_EXPIRATION = 7 * 24 * 60 * 60; // 7 days in seconds (AWS maximum for SigV4)

/**
 * Upload a PDF file to S3
 * @param {string} filePath - Local file path to upload
 * @param {string} s3Key - S3 object key (filename in bucket)
 * @returns {Promise<string>} - S3 object key
 */
async function uploadPDFToS3(filePath, s3Key) {
    try {
        // Read file from local filesystem
        const fileContent = fs.readFileSync(filePath);

        // Upload to S3
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            Body: fileContent,
            ContentType: 'application/pdf',
            ContentDisposition: 'attachment', // Force download instead of browser preview
            Metadata: {
                'uploaded-at': new Date().toISOString(),
                'service': 'bibleops'
            }
        });

        await s3Client.send(command);
        console.log(`✅ Uploaded to S3: ${s3Key}`);

        return s3Key;

    } catch (error) {
        console.error(`❌ Error uploading to S3:`, error);
        throw error;
    }
}

/**
 * Generate a presigned URL for downloading a file
 * @param {string} s3Key - S3 object key
 * @param {number} expiresIn - Expiration time in seconds (default: 7 days)
 * @returns {Promise<string>} - Presigned URL
 */
async function generatePresignedUrl(s3Key, expiresIn = PRESIGNED_URL_EXPIRATION) {
    try {
        // Use GetObjectCommand for download URLs (not PutObjectCommand)
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key
        });

        const url = await getSignedUrl(s3Client, command, {
            expiresIn: expiresIn
        });

        return url;

    } catch (error) {
        console.error(`❌ Error generating presigned URL:`, error);
        throw error;
    }
}

/**
 * Upload PDF and generate presigned download URL
 * @param {string} filePath - Local file path
 * @param {string} filename - Desired filename in S3
 * @returns {Promise<{s3Key: string, downloadUrl: string, expiresAt: Date}>}
 */
async function uploadAndGetDownloadUrl(filePath, filename) {
    try {
        // Create S3 key with organized folder structure
        const timestamp = Date.now();
        const s3Key = `pdfs/${timestamp}/${filename}`;

        // Upload to S3
        await uploadPDFToS3(filePath, s3Key);

        // Generate presigned URL
        const downloadUrl = await generatePresignedUrl(s3Key);

        // Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + PRESIGNED_URL_EXPIRATION);

        return {
            s3Key,
            downloadUrl,
            expiresAt
        };

    } catch (error) {
        console.error(`❌ Error in uploadAndGetDownloadUrl:`, error);
        throw error;
    }
}

/**
 * Delete a file from S3 (optional - lifecycle policy will auto-delete)
 * @param {string} s3Key - S3 object key to delete
 */
async function deleteFromS3(s3Key) {
    try {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key
        });

        await s3Client.send(command);
        console.log(`🗑️ Deleted from S3: ${s3Key}`);

    } catch (error) {
        console.error(`❌ Error deleting from S3:`, error);
        throw error;
    }
}

/**
 * Test S3 connection and credentials
 * @returns {Promise<boolean>}
 */
async function testS3Connection() {
    try {
        // Try to list bucket (this will fail if credentials are wrong)
        const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            MaxKeys: 1
        });

        await s3Client.send(command);
        console.log('✅ S3 connection successful');
        return true;

    } catch (error) {
        console.error('❌ S3 connection failed:', error.message);
        return false;
    }
}

module.exports = {
    uploadPDFToS3,
    generatePresignedUrl,
    uploadAndGetDownloadUrl,
    deleteFromS3,
    testS3Connection
};
