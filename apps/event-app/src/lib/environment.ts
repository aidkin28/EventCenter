import { env } from "process";

/**
 * Validates that an environment variable is set and returns its value.
 * Throws an error if the variable is missing.
 */
export function getRequiredEnv(name: string): string {
	const value = env[name];
	if (!value) {
		throw new Error(`Environment variable ${name} is required but was not found.`);
	}
	return value;
}
