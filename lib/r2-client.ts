// Cloudflare R2 REST API Client
// For uploading and managing audio files

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';

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
      const response = await fetch(`${this.baseUrl}/objects/${key}`, {
        method: 'PUT',
        headers: {
          ...this.headers,
          'Content-Type': contentType,
        },
        body: data,
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
   * Get file URL (for downloading/playing)
   * Note: R2 doesn't provide public URLs via REST API by default
   * You need to either:
   * 1. Enable public access on the bucket
   * 2. Use presigned URLs
   * 3. Use a custom domain
   *
   * For now, we'll return the object key and handle it differently
   */
  getPublicUrl(key: string): string {
    // This assumes you have public access enabled or custom domain
    // Update this based on your R2 configuration
    return `https://pub-${CLOUDFLARE_ACCOUNT_ID}.r2.dev/${key}`;
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
