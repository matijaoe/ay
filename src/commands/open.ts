import path from "node:path";
import { defineCommand } from "citty";
import { consola } from "consola";
import { loadConfig } from "../config/loader";
import { isGitRepo, listWorktrees } from "../core/git";
import { launchTool } from "../core/launch";

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
			description: "Tool name from config (e.g. cursor, code)",
		},
	},
	async run({ args }) {
		if (!(await isGitRepo())) {
			consola.error("Not a git repository");
			process.exit(1);
		}

		const { config } = await loadConfig();
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
		const toolNames = Object.keys(config.tools);
		let toolKey: string | undefined;

		if (args.tool) {
			toolKey = args.tool;
		} else if (toolNames.length === 0) {
			const editor = process.env.EDITOR || "code";
			consola.start(`Opening with ${editor}...`);
			await launchTool(editor, [targetPath], { cwd: targetPath });
			consola.success(`Opened with ${editor}`);
			return;
		} else if (toolNames.length === 1) {
			toolKey = toolNames[0];
		} else {
			const selected = await consola.prompt("Select tool", {
				type: "select",
				options: toolNames,
			});
			if (typeof selected !== "string") {
				consola.warn("Cancelled");
				return;
			}
			toolKey = selected;
		}

		const toolConfig = config.tools[toolKey];
		if (!toolConfig) {
			consola.error(`Tool "${toolKey}" not found in config`);
			consola.info("Available tools:", toolNames.join(", ") || "(none)");
			process.exit(1);
		}

		// --- Launch tool ---
		const cmdParts = toolConfig.command.split(" ");
		const bin = cmdParts[0];
		const cmdArgs = [...cmdParts.slice(1)];

		// If command contains "." as a placeholder, replace with worktree path
		// Otherwise append worktree path
		const dotIndex = cmdArgs.indexOf(".");
		if (dotIndex !== -1) {
			cmdArgs[dotIndex] = targetPath;
		} else {
			cmdArgs.push(targetPath);
		}

		// Forward extra args if passArgs is true
		if (toolConfig.passArgs) {
			const extraArgs = args._.slice(0);
			cmdArgs.push(...extraArgs);
		}

		consola.start(`Opening with ${toolKey}: ${bin} ${cmdArgs.join(" ")}`);
		await launchTool(bin, cmdArgs, { cwd: targetPath });
		consola.success(`Launched ${toolKey}`);
	},
});
