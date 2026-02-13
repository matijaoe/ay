import path from "node:path";
import { defineCommand } from "citty";
import { consola } from "consola";
import { loadConfig } from "../config/loader";
import { getMainWorktreePath, getRepoName, isGitRepo, listWorktrees } from "../core/git";
import { runScripts, type ScriptContext } from "../core/scripts";
import { fuzzyMatch } from "../utils/names";

export default defineCommand({
	meta: {
		name: "setup",
		description: "Run setup/install scripts on an existing worktree",
	},
	args: {
		name: {
			type: "positional",
			description: "Worktree name",
			required: false,
		},
		install: {
			type: "boolean",
			description: "Run install script",
		},
		all: {
			type: "boolean",
			description: "Run all scripts",
		},
	},
	async run({ args }) {
		if (!(await isGitRepo())) {
			consola.error("Not a git repository");
			process.exit(1);
		}

		const { config } = await loadConfig();
		const worktrees = await listWorktrees();
		const repoName = await getRepoName();
		const mainWorktree = await getMainWorktreePath();

		// --- Resolve target worktree ---
		let target: (typeof worktrees)[number] | undefined;

		if (args.name) {
			const names = worktrees.map((w) => path.basename(w.path));
			const matched = fuzzyMatch(args.name, names);
			if (!matched) {
				consola.error(`Worktree "${args.name}" not found`);
				process.exit(1);
			}
			if (matched !== args.name) {
				consola.info(`Matched "${args.name}" → ${matched}`);
			}
			target = worktrees.find((w) => path.basename(w.path) === matched)!;
		} else {
			const choices = worktrees.map((w) => path.basename(w.path));
			const selected = await consola.prompt("Select worktree", {
				type: "select",
				options: choices,
			});
			if (typeof selected !== "string") {
				consola.warn("Cancelled");
				return;
			}
			target = worktrees.find((w) => path.basename(w.path) === selected)!;
		}

		// --- Resolve scripts ---
		let scriptsToRun: string[];
		if (args.all) {
			scriptsToRun = Object.keys(config.scripts);
		} else if (args.install) {
			scriptsToRun = ["install"];
		} else {
			scriptsToRun = [...config.runOnNew];
		}

		// --- Run scripts ---
		const ctx: ScriptContext = {
			worktreePath: target.path,
			mainWorktreePath: mainWorktree,
			branch: target.branch,
			repoName,
		};

		const ok = await runScripts(scriptsToRun, config, ctx);
		if (!ok) {
			consola.error("Some scripts failed");
			process.exit(1);
		}

		consola.success("Setup complete");
	},
});
