import path from "node:path";
import { defineCommand } from "citty";
import { consola } from "consola";
import { loadConfig } from "../config/loader";
import { isGitRepo, listWorktrees } from "../core/git";
import { launchTool, whichSync } from "../core/launch";
import { getAllTools, resolveTool } from "../core/tools";

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
		let targetPath: string;

		if (args.name) {
			const found = worktrees.find((w) => path.basename(w.path) === args.name);
			if (!found) {
				consola.error(`Worktree "${args.name}" not found`);
				process.exit(1);
			}
			targetPath = found.path;
		} else {
			const choices = worktrees.map((w) => path.basename(w.path));
			const selected = await consola.prompt("Select worktree to open", {
				type: "select",
				options: choices,
			});
			if (typeof selected !== "string") {
				consola.warn("Cancelled");
				return;
			}
			targetPath = worktrees.find((w) => path.basename(w.path) === selected)!.path;
		}

		// --- Resolve tool ---
		if (args.tool) {
			const resolved = resolveTool(args.tool, config.tools);
			if (!resolved) {
				consola.error(`Unknown tool "${args.tool}"`);
				consola.info("Run `ay open --list` to see available tools");
				process.exit(1);
			}
			return launchResolved(resolved.key, resolved.config, targetPath);
		}

		// No --tool flag: check user config, then prompt/fallback
		const userToolNames = Object.keys(config.tools);

		if (userToolNames.length === 0) {
			const editor = process.env.EDITOR || "code";
			return launchResolved(editor, { command: editor }, targetPath);
		}

		if (userToolNames.length === 1) {
			const key = userToolNames[0];
			return launchResolved(key, config.tools[key], targetPath);
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
		return launchResolved(selected, config.tools[selected], targetPath);
	},
});

async function launchResolved(
	key: string,
	toolConfig: { command: string; passArgs?: boolean; cwdOnly?: boolean },
	targetPath: string,
): Promise<void> {
	const cmdParts = toolConfig.command.split(" ");
	const bin = cmdParts[0];
	const cmdArgs = [...cmdParts.slice(1)];

	// cwdOnly tools (claude, codex) don't take a path arg — they use cwd
	if (!toolConfig.cwdOnly) {
		const dotIndex = cmdArgs.indexOf(".");
		if (dotIndex !== -1) {
			cmdArgs[dotIndex] = targetPath;
		} else {
			cmdArgs.push(targetPath);
		}
	}

	consola.start(`Opening with ${key}: ${bin}${cmdArgs.length ? ` ${cmdArgs.join(" ")}` : ""}`);
	try {
		await launchTool(bin, cmdArgs, { cwd: targetPath });
		consola.success(`Launched ${key}`);
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : String(error);
		consola.error(msg);
		consola.info("Run `ay open --list` to see installed tools");
		process.exit(1);
	}
}
