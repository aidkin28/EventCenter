import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a unique ID (cuid-like format).
 * Uses crypto.randomUUID() and formats it to be more compact.
 */
export function createId(): string {
  // Use crypto.randomUUID() which is available in Node.js 19+ and all modern browsers
  const uuid = crypto.randomUUID();
  // Remove dashes and take first 25 chars for a cuid-like format
  return uuid.replace(/-/g, "").slice(0, 25);
}
