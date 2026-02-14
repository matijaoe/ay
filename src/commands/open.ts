import { defineCommand } from "citty";
import { consola } from "consola";
import { loadConfig } from "../config/loader";
import { isGitRepo, listWorktrees } from "../core/git";
import { whichSync } from "../core/launch";
import { openToolInWorktree } from "../core/open-tool";
import { getAllTools, resolveTool } from "../core/tools";
import { resolveWorktree } from "../utils/worktree";

export default defineCommand({
	meta: {
		name: "open",
		description: "Open a worktree in an editor or tool",
	},
	args: {
		name: {
			type: "positional",
			description: "Worktree name to open",
			required: false,
		},
		tool: {
			type: "string",
			alias: "t",
			description: "Tool name (e.g. cursor, claude, code, zed)",
		},
		list: {
			type: "boolean",
			alias: "l",
			description: "List all available tools",
		},
	},
	async run({ args }) {
		if (!(await isGitRepo())) {
			consola.error("Not a git repository");
			process.exit(1);
		}

		const { config } = await loadConfig();

		// --- List tools mode ---
		if (args.list) {
			const all = getAllTools(config.tools);
			const entries = Object.entries(all);
			if (entries.length === 0) {
				consola.info("No tools configured");
				return;
			}
			consola.log("");
			consola.log("  Available tools:");
			consola.log("");
			for (const [key, tool] of entries) {
				const label = "label" in tool && tool.label ? ` (${tool.label})` : "";
				const bin = tool.command.split(" ")[0];
				const installed = whichSync(bin);
				const status = installed ? "\x1b[32m✓\x1b[0m" : "\x1b[2m✗\x1b[0m";
				const isUser = key in config.tools;
				const tag = isUser ? " \x1b[36m[config]\x1b[0m" : "";
				consola.log(`    ${status} ${key}${label}  →  ${tool.command}${tag}`);
			}
			consola.log("");
			return;
		}

		const worktrees = await listWorktrees();

		if (worktrees.length === 0) {
			consola.info("No worktrees found");
			return;
		}

		// --- Resolve worktree ---
		const target = await resolveWorktree(worktrees, args.name, "Select worktree to open");
		if (!target) return;

		// --- Resolve tool ---
		if (args.tool) {
			const resolved = resolveTool(args.tool, config.tools);
			if (!resolved) {
				consola.error(`Unknown tool "${args.tool}"`);
				consola.info("Run `ay open --list` to see available tools");
				process.exit(1);
			}
			return openToolInWorktree(resolved.key, resolved.config, target.path);
		}

		// No --tool flag: check user config, then prompt/fallback
		const userToolNames = Object.keys(config.tools);

		if (userToolNames.length === 0) {
			const editor = process.env.EDITOR || "code";
			return openToolInWorktree(editor, { command: editor }, target.path);
		}

		if (userToolNames.length === 1) {
			const key = userToolNames[0];
			return openToolInWorktree(key, config.tools[key], target.path);
		}

		// Multiple user tools — prompt
		const selected = await consola.prompt("Select tool", {
			type: "select",
			options: userToolNames,
		});
		if (typeof selected !== "string") {
			consola.warn("Cancelled");
			return;
		}
		return openToolInWorktree(selected, config.tools[selected], target.path);
	},
});
