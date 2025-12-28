/**
 * File Storage
 * Handles image and file uploads to Supabase Storage or local filesystem
 */

import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import { getSupabaseClient, isSupabaseConfigured } from "@sb/db";

export interface FileUploadOptions {
  filename: string;
  contentType: string;
  data: Buffer | string; // Buffer or base64 string
  bucket?: string;
  folder?: string;
}

export interface UploadedFile {
  id: string;
  url: string;
  filename: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

/**
 * File storage interface
 */
export interface FileStorage {
  upload(options: FileUploadOptions): Promise<UploadedFile>;
  delete(fileId: string, bucket?: string): Promise<boolean>;
  getPublicUrl(fileId: string, bucket?: string): string;
}

/**
 * Local file storage implementation
 */
export class LocalFileStorage implements FileStorage {
  private storageDir: string;
  private publicBaseUrl: string;

  constructor(storageDir?: string, publicBaseUrl?: string) {
    this.storageDir = storageDir || path.join(process.cwd(), ".sb", "uploads");
    // Use full URL if available (for OpenAI Vision API), otherwise relative path
    // The server should serve /uploads to make files accessible
    if (publicBaseUrl) {
      this.publicBaseUrl = publicBaseUrl;
    } else {
      // Try to get from environment or default to localhost
      const port = process.env.PORT || "4023";
      const host = process.env.PUBLIC_HOST || "localhost";
      const protocol = process.env.PUBLIC_PROTOCOL || "http";
      this.publicBaseUrl = `${protocol}://${host}:${port}/uploads`;
    }

    // Ensure storage directory exists
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  async upload(options: FileUploadOptions): Promise<UploadedFile> {
    const { filename, contentType, data, folder } = options;

    // Generate unique ID
    const fileId = randomUUID();
    const ext = path.extname(filename);
    const storedFilename = `${fileId}${ext}`;

    // Determine folder path
    const folderPath = folder
      ? path.join(this.storageDir, folder)
      : this.storageDir;

    // Ensure folder exists
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const filePath = path.join(folderPath, storedFilename);

    // Convert data to buffer if base64
    let buffer: Buffer;
    if (typeof data === "string") {
      // Assume base64
      const base64Data = data.includes(",") ? data.split(",")[1] : data;
      buffer = Buffer.from(base64Data, "base64");
    } else {
      buffer = data;
    }

    // Write file
    fs.writeFileSync(filePath, buffer);

    // Build URL
    const url = folder
      ? `${this.publicBaseUrl}/${folder}/${storedFilename}`
      : `${this.publicBaseUrl}/${storedFilename}`;

    return {
      id: fileId,
      url,
      filename: storedFilename,
      contentType,
      size: buffer.length,
      uploadedAt: new Date().toISOString(),
    };
  }

  async delete(fileId: string, bucket?: string): Promise<boolean> {
    // Find and delete file with this ID
    const files = fs.readdirSync(this.storageDir);
    for (const file of files) {
      if (file.startsWith(fileId)) {
        const filePath = path.join(this.storageDir, file);
        fs.unlinkSync(filePath);
        return true;
      }
    }
    return false;
  }

  getPublicUrl(fileId: string, bucket?: string): string {
    // Find file with this ID
    const files = fs.readdirSync(this.storageDir);
    for (const file of files) {
      if (file.startsWith(fileId)) {
        return `${this.publicBaseUrl}/${file}`;
      }
    }
    throw new Error(`File not found: ${fileId}`);
  }
}

/**
 * Supabase storage implementation
 */
export class SupabaseFileStorage implements FileStorage {
  private supabase: ReturnType<typeof getSupabaseClient>;
  private defaultBucket: string;

  constructor(bucket: string = "product-images") {
    this.supabase = getSupabaseClient();
    this.defaultBucket = bucket;
  }

  async upload(options: FileUploadOptions): Promise<UploadedFile> {
    const { filename, contentType, data, bucket, folder } = options;

    // Generate unique ID
    const fileId = randomUUID();
    const ext = path.extname(filename);
    const storedFilename = `${fileId}${ext}`;

    // Build storage path
    const bucketName = bucket || this.defaultBucket;
    const storagePath = folder
      ? `${folder}/${storedFilename}`
      : storedFilename;

    // Convert data to buffer if base64
    let buffer: Buffer;
    if (typeof data === "string") {
      const base64Data = data.includes(",") ? data.split(",")[1] : data;
      buffer = Buffer.from(base64Data, "base64");
    } else {
      buffer = data;
    }

    // Upload to Supabase
    const { data: uploadData, error } = await this.supabase.storage
      .from(bucketName)
      .upload(storagePath, buffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      // If bucket doesn't exist, throw a specific error that can be caught
      const errorMsg = (error.message || '').toLowerCase();
      if (errorMsg.includes('bucket') && errorMsg.includes('not found')) {
        throw new Error(`BUCKET_NOT_FOUND: ${bucketName}. Please create the bucket in Supabase or use local storage mode.`);
      }
      // Check for RLS policy violations
      if (errorMsg.includes('row-level security') || errorMsg.includes('policy')) {
        throw new Error(`RLS_POLICY_VIOLATION: ${error.message}. Use SUPABASE_SERVICE_ROLE_KEY (not SUPABASE_ANON_KEY) in your .env file for backend operations. The service role key bypasses RLS policies.`);
      }
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = this.supabase.storage
      .from(bucketName)
      .getPublicUrl(storagePath);

    return {
      id: fileId,
      url: urlData.publicUrl,
      filename: storedFilename,
      contentType,
      size: buffer.length,
      uploadedAt: new Date().toISOString(),
    };
  }

  async delete(fileId: string, bucket?: string): Promise<boolean> {
    const bucketName = bucket || this.defaultBucket;

    // List files to find the one with this ID
    const { data: files, error: listError } = await this.supabase.storage
      .from(bucketName)
      .list();

    if (listError || !files) {
      return false;
    }

    const file = files.find((f) => f.name.startsWith(fileId));
    if (!file) {
      return false;
    }

    const { error } = await this.supabase.storage
      .from(bucketName)
      .remove([file.name]);

    return !error;
  }

  getPublicUrl(fileId: string, bucket?: string): string {
    // This is a simplified version - in production you'd query to find the exact filename
    const bucketName = bucket || this.defaultBucket;
    const { data } = this.supabase.storage
      .from(bucketName)
      .getPublicUrl(fileId);

    return data.publicUrl;
  }
}

/**
 * Get the appropriate file storage instance
 */
let fileStorageInstance: FileStorage | null = null;

export function getFileStorage(bucket?: string): FileStorage {
  if (fileStorageInstance) {
    return fileStorageInstance;
  }

  // Check if local storage is forced via environment variable
  const forceLocal = process.env.STORAGE_MODE === 'local' || process.env.FORCE_LOCAL_STORAGE === 'true';

  if (forceLocal) {
    console.log("[@sb/storage] Using local file storage");
    fileStorageInstance = new LocalFileStorage();
    return fileStorageInstance;
  }

  if (isSupabaseConfigured()) {
    try {
      fileStorageInstance = new SupabaseFileStorage(bucket);
      return fileStorageInstance;
    } catch (error) {
      console.warn("Failed to initialize Supabase file storage, falling back to local:", error);
      fileStorageInstance = new LocalFileStorage();
      return fileStorageInstance;
    }
  }

  fileStorageInstance = new LocalFileStorage();
  return fileStorageInstance;
}

/**
 * Upload a file
 * Automatically falls back to local storage if Supabase bucket doesn't exist
 */
export async function uploadFile(options: FileUploadOptions & { publicBaseUrl?: string }): Promise<UploadedFile> {
  let storage = getFileStorage(options.bucket);
  
  try {
    return await storage.upload(options);
  } catch (error) {
    // If bucket not found and we're using Supabase, fall back to local storage
    if (error instanceof Error && error.message.includes('BUCKET_NOT_FOUND')) {
      console.warn(`[@sb/storage] Bucket '${options.bucket || 'product-images'}' not found in Supabase. Falling back to local file storage.`);
      console.warn(`[@sb/storage] To use Supabase storage, create the bucket in your Supabase dashboard.`);
      console.warn(`[@sb/storage] To force local storage, set STORAGE_MODE=local in your .env file.`);
      
      // Reset the instance and force local storage with proper URL
      fileStorageInstance = null;
      const originalMode = process.env.STORAGE_MODE;
      process.env.STORAGE_MODE = 'local';
      try {
        // Create new LocalFileStorage with public URL if provided
        const localStorage = new LocalFileStorage(undefined, options.publicBaseUrl);
        const result = await localStorage.upload(options);
        // Restore original mode
        process.env.STORAGE_MODE = originalMode;
        return result;
      } catch (fallbackError) {
        process.env.STORAGE_MODE = originalMode;
        throw fallbackError;
      }
    }
    throw error;
  }
}

/**
 * Delete a file
 */
export async function deleteFile(fileId: string, bucket?: string): Promise<boolean> {
  const storage = getFileStorage(bucket);
  return storage.delete(fileId, bucket);
}

/**
 * Get public URL for a file
 */
export function getFileUrl(fileId: string, bucket?: string): string {
  const storage = getFileStorage(bucket);
  return storage.getPublicUrl(fileId, bucket);
}
