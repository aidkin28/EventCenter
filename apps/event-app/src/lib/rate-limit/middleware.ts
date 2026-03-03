import { NextResponse } from "next/server";
import { getRateLimiter, RATE_LIMIT_TIERS } from "./limiters";
import type {
  RateLimitTierId,
  RateLimitResult,
  RateLimitErrorResponse,
} from "./types";

/**
 * Check rate limit for a user and return result.
 * If Redis is unavailable, returns success (fail-open behavior).
 */
export async function checkRateLimit(
  userId: string,
  tierId: RateLimitTierId
): Promise<RateLimitResult> {
  const limiter = getRateLimiter(tierId);
  const tier = RATE_LIMIT_TIERS[tierId];

  // Fail-open: if limiter not available, allow request
  if (!limiter) {
    console.warn(
      `[RateLimit] Limiter unavailable for tier ${tierId}, allowing request`
    );
    return {
      success: true,
      limit: tier.limit,
      remaining: tier.limit,
      reset: Date.now() + tier.windowSeconds * 1000,
    };
  }

  try {
    const result = await limiter.limit(userId);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // Fail-open on Redis errors
    console.error(
      `[RateLimit] Error checking limit for tier ${tierId}:`,
      error
    );
    return {
      success: true,
      limit: tier.limit,
      remaining: tier.limit,
      reset: Date.now() + tier.windowSeconds * 1000,
    };
  }
}

/**
 * Format window duration for human-readable output.
 */
function formatWindow(seconds: number): string {
  if (seconds >= 3600) {
    const hours = seconds / 3600;
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  }
  if (seconds >= 60) {
    const minutes = seconds / 60;
    return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  }
  return `${seconds} second${seconds > 1 ? "s" : ""}`;
}

/**
 * Create a 429 Too Many Requests response with proper headers.
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  tierId: RateLimitTierId
): NextResponse<RateLimitErrorResponse> {
  const tier = RATE_LIMIT_TIERS[tierId];
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

  const body: RateLimitErrorResponse = {
    error: `Rate limit exceeded. You can make ${tier.limit} ${tier.description} per ${formatWindow(tier.windowSeconds)}.`,
    code: "RATE_LIMIT_EXCEEDED",
    limit: result.limit,
    remaining: result.remaining,
    retryAfter: Math.max(0, retryAfter),
  };

  return NextResponse.json(body, {
    status: 429,
    headers: {
      "X-RateLimit-Limit": String(result.limit),
      "X-RateLimit-Remaining": String(result.remaining),
      "X-RateLimit-Reset": String(result.reset),
      "Retry-After": String(Math.max(0, retryAfter)),
    },
  });
}

/**
 * Add rate limit headers to a successful response.
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(result.reset));
  return response;
}
