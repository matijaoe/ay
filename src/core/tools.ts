import type { AyToolConfig } from "../config/schema";

export interface ToolPreset extends AyToolConfig {
	/** Human-readable label */
	label: string;
	/** Aliases the user can type (e.g. "cursor" or "cc") */
	aliases: string[];
}

/**
 * Built-in tool presets. These work zero-config — users don't need to
 * add anything to their config to use `ay open --tool cursor`.
 *
 * User config `tools` entries override these if the key matches.
 */
export const TOOL_PRESETS: Record<string, ToolPreset> = {
	code: {
		label: "VS Code",
		command: "code",
		aliases: ["vscode", "vs-code"],
		passArgs: true,
	},
	cursor: {
		label: "Cursor",
		command: "cursor",
		aliases: ["cur"],
		passArgs: true,
	},
	claude: {
		label: "Claude Code",
		command: "claude",
		aliases: ["claude-code", "cc"],
		passArgs: false,
	},
	codex: {
		label: "Codex CLI",
		command: "codex",
		aliases: [],
		passArgs: false,
	},
	windsurf: {
		label: "Windsurf",
		command: "windsurf",
		aliases: ["ws"],
		passArgs: true,
	},
	zed: {
		label: "Zed",
		command: "zed",
		aliases: [],
		passArgs: true,
	},
	fleet: {
		label: "Fleet",
		command: "fleet",
		aliases: [],
		passArgs: true,
	},
	idea: {
		label: "IntelliJ IDEA",
		command: "idea",
		aliases: [
			"intellij",
			"webstorm",
			"phpstorm",
			"goland",
			"pycharm",
			"rubymine",
			"rider",
			"clion",
		],
		passArgs: true,
	},
	sublime: {
		label: "Sublime Text",
		command: "subl",
		aliases: ["subl"],
		passArgs: true,
	},
	vim: {
		label: "Vim",
		command: "vim",
		aliases: ["vi"],
		passArgs: false,
	},
	nvim: {
		label: "Neovim",
		command: "nvim",
		aliases: ["neovim"],
		passArgs: false,
	},
	emacs: {
		label: "Emacs",
		command: "emacs",
		aliases: [],
		passArgs: false,
	},
	nano: {
		label: "Nano",
		command: "nano",
		aliases: [],
		passArgs: false,
	},
	helix: {
		label: "Helix",
		command: "hx",
		aliases: ["hx"],
		passArgs: false,
	},
};

/**
 * Resolve a tool by name — checks user config first, then built-in presets
 * (including aliases).
 */
export function resolveTool(
	name: string,
	userTools: Record<string, AyToolConfig>,
): { key: string; config: AyToolConfig } | undefined {
	// 1. Exact match in user config
	if (userTools[name]) {
		return { key: name, config: userTools[name] };
	}

	// 2. Exact match in presets
	if (TOOL_PRESETS[name]) {
		return { key: name, config: TOOL_PRESETS[name] };
	}

	// 3. Alias match in presets
	const lower = name.toLowerCase();
	for (const [key, preset] of Object.entries(TOOL_PRESETS)) {
		if (preset.aliases.includes(lower)) {
			return { key, config: preset };
		}
	}

	return undefined;
}

/**
 * Get all available tools — merged from presets + user config (user wins).
 */
export function getAllTools(
	userTools: Record<string, AyToolConfig>,
): Record<string, AyToolConfig & { label?: string }> {
	const merged: Record<string, AyToolConfig & { label?: string }> = {};

	// Start with presets
	for (const [key, preset] of Object.entries(TOOL_PRESETS)) {
		merged[key] = preset;
	}

	// User config overrides
	for (const [key, config] of Object.entries(userTools)) {
		merged[key] = config;
	}

	return merged;
}
