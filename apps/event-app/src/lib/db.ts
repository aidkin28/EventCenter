/**
 * Database client
 *
 * Re-exports the Drizzle database client for use throughout the application.
 */

export { db, pool, type Database } from "@/db/client";
export * as schema from "@/db/schema";
