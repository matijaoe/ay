import { loadConfig as c12LoadConfig } from "c12";
import { consola } from "consola";
import { defaultConfig } from "./defaults";
import { type AyConfig, configSchema } from "./schema";

export interface LoadConfigResult {
	config: AyConfig;
	configFile?: string;
	layers?: Array<{ config: Record<string, unknown>; configFile?: string }>;
}

/**
 * Load, merge, and validate the ay config.
 *
 * Resolution order (later wins):
 *   1. Built-in defaults
 *   2. User global config   ~/.config/ay/config.jsonc
 *   3. Project config        .ay/config.jsonc (or .ay/config.ts, etc.)
 *   4. CLI flag overrides    (passed via `overrides`)
 */
export async function loadConfig(overrides?: Partial<AyConfig>): Promise<LoadConfigResult> {
	const {
		config: raw,
		configFile,
		layers,
	} = await c12LoadConfig({
		name: "config",
		cwd: process.cwd(),
		configFile: ".ay/config",
		rcFile: false,
		globalRc: false,
		packageJson: false,
		defaults: defaultConfig as Record<string, unknown>,
		overrides: (overrides ?? {}) as Record<string, unknown>,
	});

	// Validate & apply Zod defaults/coercion
	const parsed = configSchema.safeParse(raw);

	if (!parsed.success) {
		consola.warn("Invalid ay config — falling back to defaults");
		for (const issue of parsed.error.issues) {
			consola.warn(`  ${issue.path.join(".")}: ${issue.message}`);
		}
		return {
			config: configSchema.parse(defaultConfig),
			configFile: undefined,
			layers: [],
		};
	}

	return {
		config: parsed.data,
		configFile: configFile ?? undefined,
		layers: layers as LoadConfigResult["layers"],
	};
}

/**
 * Helper to define a typed ay config file (for .ay/config.ts usage).
 */
export function defineConfig(config: Partial<AyConfig>): Partial<AyConfig> {
	return config;
}
