import fs from "node:fs";
import path from "node:path";
import { defineCommand } from "citty";
import { consola } from "consola";
import { loadConfig } from "../config/loader";
import { launchTool } from "../core/launch";

function getNestedValue(obj: Record<string, unknown>, keyPath: string): unknown {
	const keys = keyPath.split(".");
	let current: unknown = obj;
	for (const key of keys) {
		if (current == null || typeof current !== "object") return undefined;
		current = (current as Record<string, unknown>)[key];
	}
	return current;
}

function setNestedValue(obj: Record<string, unknown>, keyPath: string, value: unknown): void {
	const keys = keyPath.split(".");
	let current: Record<string, unknown> = obj;
	for (let i = 0; i < keys.length - 1; i++) {
		const key = keys[i];
		if (current[key] == null || typeof current[key] !== "object") {
			current[key] = {};
		}
		current = current[key] as Record<string, unknown>;
	}
	current[keys[keys.length - 1]] = value;
}

function parseValue(raw: string): unknown {
	if (raw === "true") return true;
	if (raw === "false") return false;
	if (raw === "null") return null;
	if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
	// Try JSON array/object
	if ((raw.startsWith("[") && raw.endsWith("]")) || (raw.startsWith("{") && raw.endsWith("}"))) {
		try {
			return JSON.parse(raw);
		} catch {
			// fall through
		}
	}
	return raw;
}

export default defineCommand({
	meta: {
		name: "config",
		description: "Get, set, or edit configuration",
	},
	args: {
		action: {
			type: "positional",
			description: "Action: get, set, edit, list, path",
			required: false,
		},
		key: {
			type: "positional",
			description: "Config key (for get/set)",
			required: false,
		},
		value: {
			type: "positional",
			description: "Config value (for set)",
			required: false,
		},
		source: {
			type: "boolean",
			description: "Show which file each value comes from",
		},
	},
	async run({ args }) {
		const action = args.action || "list";

		switch (action) {
			case "get": {
				if (!args.key) {
					consola.error("Usage: ay config get <key>");
					process.exit(1);
				}
				const { config } = await loadConfig();
				const value = getNestedValue(config as unknown as Record<string, unknown>, args.key);
				if (value === undefined) {
					consola.error(`Key "${args.key}" not found`);
					process.exit(1);
				}
				console.log(typeof value === "object" ? JSON.stringify(value, null, 2) : String(value));
				break;
			}

			case "set": {
				if (!args.key || args.value === undefined) {
					consola.error("Usage: ay config set <key> <value>");
					process.exit(1);
				}
				const configFile = path.join(process.cwd(), ".ay", "config.jsonc");
				let existing: Record<string, unknown> = {};
				try {
					const raw = await fs.promises.readFile(configFile, "utf-8");
					// Strip JSONC comments for parsing
					const cleaned = raw.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
					existing = JSON.parse(cleaned);
				} catch {
					// file doesn't exist or invalid
				}
				setNestedValue(existing, args.key, parseValue(args.value));
				await fs.promises.mkdir(path.dirname(configFile), { recursive: true });
				await fs.promises.writeFile(configFile, JSON.stringify(existing, null, 2), "utf-8");
				consola.success(`Set ${args.key} = ${args.value}`);
				break;
			}

			case "edit": {
				const configFile = path.join(process.cwd(), ".ay", "config.jsonc");
				if (!fs.existsSync(configFile)) {
					consola.error("No config file found. Run `ay init` first.");
					process.exit(1);
				}
				const editor = process.env.EDITOR || "vi";
				await launchTool(editor, [configFile]);
				break;
			}

			case "list": {
				const { config, configFile } = await loadConfig();
				if (configFile) {
					consola.info(`Config file: ${configFile}`);
				}
				console.log(JSON.stringify(config, null, 2));
				break;
			}

			case "path": {
				const configFile = path.join(process.cwd(), ".ay", "config.jsonc");
				console.log(configFile);
				break;
			}

			default:
				consola.error(`Unknown action "${action}". Use: get, set, edit, list, path`);
				process.exit(1);
		}
	},
});
