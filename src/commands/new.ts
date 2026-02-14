import path from "node:path";
import { defineCommand } from "citty";
import { consola } from "consola";
import { loadConfig } from "../config/loader";
import { copyEnvironment, handleNodeModules } from "../core/environment";
import {
	createWorktree,
	getBranches,
	getMainWorktreePath,
	getRepoName,
	isGitRepo,
	listWorktrees,
} from "../core/git";
import { openToolInWorktree } from "../core/open-tool";
import { detectInstallCommand } from "../core/pkg";
import { runScripts, type ScriptContext } from "../core/scripts";
import { resolveTool } from "../core/tools";
import { generateUniqueName } from "../utils/names";
import { contractHome, resolveWorktreePath } from "../utils/paths";

export default defineCommand({
	meta: {
		name: "new",
		description: "Create a new worktree",
	},
	args: {
		name: {
			type: "positional",
			description: "Worktree name (auto-generated if omitted)",
			required: false,
		},
		from: {
			type: "string",
			description: "Base branch to create from",
		},
		install: {
			type: "boolean",
			description: "Run install script after creation",
		},
		all: {
			type: "boolean",
			description: "Run all scripts after creation",
		},
		"no-setup": {
			type: "boolean",
			description: "Skip all post-creation scripts",
		},
		open: {
			type: "string",
			alias: "o",
			description: "Open in tool after creation (e.g. cursor, claude, code)",
		},
	},
	async run({ args }) {
		if (!(await isGitRepo())) {
			consola.error("Not a git repository");
			process.exit(1);
		}

		const { config } = await loadConfig();

		const repoName = await getRepoName();
		const mainWorktree = await getMainWorktreePath();
		const existingWorktrees = await listWorktrees();
		const existingNames = new Set(existingWorktrees.map((w) => path.basename(w.path)));

		// --- Resolve name ---
		let name: string;
		const isTTY = process.stdout.isTTY;

		if (args.name) {
			name = args.name;
		} else if (isTTY && config.defaults.autoName) {
			const suggestion = generateUniqueName(config.defaults.nameStyle, existingNames);
			const input = await consola.prompt("Worktree name", {
				type: "text",
				default: suggestion,
				placeholder: suggestion,
			});
			if (typeof input !== "string" || !input) {
				consola.warn("Cancelled");
				return;
			}
			name = input;
		} else if (config.defaults.autoName) {
			name = generateUniqueName(config.defaults.nameStyle, existingNames);
		} else {
			consola.error("No name provided and autoName is disabled");
			process.exit(1);
		}

		// --- Resolve branch name ---
		const branchPrefix = config.defaults.branchPrefix;
		const branch = branchPrefix ? `${branchPrefix}${name}` : name;

		// --- Resolve base branch ---
		let baseBranch: string;
		if (args.from) {
			baseBranch = args.from;
		} else if (isTTY) {
			const { local } = await getBranches();
			if (local.length > 1) {
				const selected = await consola.prompt("Base branch", {
					type: "select",
					options: local.map((b) => b),
					initial: config.defaults.baseBranch,
				});
				if (typeof selected !== "string") {
					consola.warn("Cancelled");
					return;
				}
				baseBranch = selected;
			} else {
				baseBranch = config.defaults.baseBranch;
			}
		} else {
			baseBranch = config.defaults.baseBranch;
		}

		// --- Resolve worktree path ---
		const worktreePath = resolveWorktreePath(config.worktreePath, repoName, name);

		// --- Resolve scripts to run ---
		let scriptsToRun: string[] = [];
		if (args["no-setup"]) {
			scriptsToRun = [];
		} else if (args.all) {
			scriptsToRun = Object.keys(config.scripts);
		} else if (args.install) {
			scriptsToRun = [...new Set([...config.runOnNew, "install"])];
		} else if (isTTY) {
			const allScriptNames = Object.keys(config.scripts);
			const selected = await consola.prompt("Scripts to run", {
				type: "multiselect",
				options: allScriptNames.map((s) => s),
				initial: config.runOnNew,
			});
			if (!Array.isArray(selected)) {
				consola.warn("Cancelled");
				return;
			}
			scriptsToRun = selected as string[];
		} else {
			scriptsToRun = [...config.runOnNew];
		}

		// --- Create worktree ---
		consola.start(`Creating worktree "${name}" from ${baseBranch}...`);
		try {
			await createWorktree(worktreePath, branch, baseBranch);
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			consola.error(`Failed to create worktree: ${msg}`);
			process.exit(1);
		}
		consola.success(`Worktree created at ${contractHome(worktreePath)}`);

		// --- Copy environment ---
		await copyEnvironment(mainWorktree, worktreePath, config);

		// --- Handle node_modules ---
		const installCmd = config.scripts.install || detectInstallCommand(mainWorktree) || undefined;
		await handleNodeModules(mainWorktree, worktreePath, config.defaults.nodeModules, installCmd);

		// --- Run scripts ---
		if (scriptsToRun.length > 0) {
			const ctx: ScriptContext = {
				worktreePath,
				mainWorktreePath: mainWorktree,
				branch,
				repoName,
			};
			const ok = await runScripts(scriptsToRun, config, ctx);
			if (!ok) {
				consola.warn("Some scripts failed — worktree is still created");
			}
		}

		// --- Summary ---
		consola.box({
			title: "Worktree ready",
			message: [
				`  Name:    ${name}`,
				`  Branch:  ${branch}`,
				`  Path:    ${contractHome(worktreePath)}`,
				`  Base:    ${baseBranch}`,
			].join("\n"),
		});

		// --- Open in tool ---
		if (args.open) {
			const resolved = resolveTool(args.open, config.tools);
			if (!resolved) {
				consola.warn(`Unknown tool "${args.open}" — skipping open`);
				return;
			}
			await openToolInWorktree(resolved.key, resolved.config, worktreePath);
		}
	},
});
