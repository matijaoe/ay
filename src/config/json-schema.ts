import { z } from "zod";
import { configSchema } from "./schema";

/**
 * Generate a JSON Schema from the Zod config schema.
 * Used for editor autocomplete in .ay/config.jsonc files.
 */
export function generateJsonSchema() {
	return z.toJSONSchema(configSchema);
}
