import { getRequiredEnv } from "@/lib/environment";
import { defineConfig } from "drizzle-kit";
import { env } from "process";

// Build PostgreSQL connection string
const connectionString =
  getRequiredEnv("DATABASE_URL");

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
  // Use SSL for Azure PostgreSQL
  ...(env.DB_SSL !== "false" && {
    ssl: { rejectUnauthorized: false },
  }),
});
