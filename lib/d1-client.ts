// Cloudflare D1 REST API Client
// Since we're using Next.js (not Workers), we'll access D1 via REST API

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const DATABASE_ID = process.env.DATABASE_ID || '';

interface D1Result {
  success: boolean;
  results: any[];
  meta?: any;
  errors?: any[];
}

export class D1Client {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor() {
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${DATABASE_ID}`;
    this.headers = {
      'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    };
  }

  async query(sql: string, params: any[] = []): Promise<D1Result> {
    try {
      const response = await fetch(`${this.baseUrl}/query`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          sql,
          params
        }),
      });

      const data = await response.json();

      // Handle Cloudflare API response format
      if (!data.success) {
        return { success: false, results: [], errors: data.errors };
      }

      // data.result is an array of query results
      const queryResult = data.result?.[0];
      if (!queryResult) {
        return { success: false, results: [] };
      }

      return {
        success: queryResult.success || true,
        results: queryResult.results || [],
        meta: queryResult.meta
      };
    } catch (error) {
      return { success: false, results: [], errors: [error] };
    }
  }

  prepare(sql: string) {
    return {
      bind: (...params: any[]) => ({
        first: async () => {
          const result = await this.query(sql, params);
          return result.results[0] || null;
        },
        all: async () => {
          const result = await this.query(sql, params);
          return { results: result.results };
        },
        run: async () => {
          return await this.query(sql, params);
        }
      })
    };
  }
}

// Singleton instance
export const db = new D1Client();
