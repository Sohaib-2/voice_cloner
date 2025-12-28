// Cloudflare R2 REST API Client
// For uploading and managing audio files

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

export class R2Client {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor() {
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${R2_BUCKET_NAME}`;
    this.headers = {
      'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
    };
  }

  /**
   * Upload a file to R2
   * @param key - The file path/key in R2 (e.g., "recordings/user123/audio1.mp3")
   * @param data - The file data as Buffer or Blob
   * @param contentType - MIME type (e.g., "audio/mpeg")
   */
  async upload(key: string, data: Buffer | Blob, contentType: string = 'audio/mpeg'): Promise<boolean> {
    try {
      // Convert Buffer to Uint8Array then to Blob for fetch API compatibility
      const bodyData = data instanceof Buffer
        ? new Blob([new Uint8Array(data)], { type: contentType })
        : data;

      const response = await fetch(`${this.baseUrl}/objects/${key}`, {
        method: 'PUT',
        headers: {
          ...this.headers,
          'Content-Type': contentType,
        },
        body: bodyData,
      });

      return response.ok;
    } catch (error) {
      console.error('R2 Upload Error:', error);
      return false;
    }
  }

  /**
   * Delete a file from R2
   * @param key - The file path/key to delete
   */
  async delete(key: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/objects/${key}`, {
        method: 'DELETE',
        headers: this.headers,
      });

      return response.ok;
    } catch (error) {
      console.error('R2 Delete Error:', error);
      return false;
    }
  }

  /**
   * Get public URL for a file
   * Requires R2 bucket to have public R2.dev subdomain enabled
   * @param key - The file path/key in R2
   */
  getPublicUrl(key: string): string {
    if (!R2_PUBLIC_URL) {
      console.warn('R2_PUBLIC_URL not configured. Please enable R2.dev subdomain in Cloudflare dashboard.');
      return '';
    }
    // Remove trailing slash from R2_PUBLIC_URL if present
    const baseUrl = R2_PUBLIC_URL.replace(/\/$/, '');
    return `${baseUrl}/${key}`;
  }

  /**
   * Get a public URL for a file (no presigned URL needed with public R2.dev subdomain)
   * @param key - The file path/key in R2
   * @param expiresIn - Not used, kept for API compatibility (files are public)
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // With public R2.dev subdomain enabled, we just return the public URL
    // No need for presigned URLs or blob URLs
    return this.getPublicUrl(key);
  }

  /**
   * List files with a prefix
   * @param prefix - The prefix to filter files (e.g., "recordings/user123/")
   */
  async list(prefix: string = ''): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/objects?prefix=${encodeURIComponent(prefix)}`,
        {
          method: 'GET',
          headers: this.headers,
        }
      );

      const data = await response.json();
      if (data.success && data.result) {
        return data.result.map((obj: any) => obj.key);
      }

      return [];
    } catch (error) {
      console.error('R2 List Error:', error);
      return [];
    }
  }
}

// Singleton instance
export const r2 = new R2Client();
