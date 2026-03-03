import { Redis } from "@upstash/redis";

let redisClient: Redis | null = null;

/**
 * Get or create singleton Redis client for rate limiting.
 * Returns null if Redis is not configured (fallback mode).
 */
export function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  // If env vars are not set, return null to enable fallback mode
  if (!url || !token) {
    console.warn(
      "[RateLimit] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not configured. Rate limiting disabled."
    );
    return null;
  }

  try {
    redisClient = new Redis({ url, token });
    return redisClient;
  } catch (error) {
    console.error("[RateLimit] Failed to create Redis client:", error);
    return null;
  }
}

/**
 * Check if Redis is available and connected
 */
export async function isRedisHealthy(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.ping();
    return true;
  } catch {
    return false;
  }
}
