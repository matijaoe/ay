import path from "node:path";
import { defineCommand } from "citty";
import { consola } from "consola";
import { isGitRepo, listWorktrees } from "../core/git";
import { fuzzyMatch } from "../utils/names";

export default defineCommand({
	meta: {
		name: "cd",
		description: "Print worktree path (for shell integration)",
	},
	args: {
		name: {
			type: "positional",
			description: "Worktree name (fuzzy match supported)",
			required: false,
		},
	},
	async run({ args }) {
		if (!(await isGitRepo())) {
			process.exit(1);
		}

		const worktrees = await listWorktrees();

		if (worktrees.length === 0) {
			process.exit(1);
		}

		if (args.name) {
			// Fuzzy match
			const names = worktrees.map((w) => ({ name: path.basename(w.path), wt: w }));
			const exact = names.find((n) => n.name === args.name);
			if (exact) {
				console.log(exact.wt.path);
				return;
			}
			const match = fuzzyMatch(
				args.name,
				names.map((n) => n.name),
			);
			if (match) {
				const found = names.find((n) => n.name === match);
				if (found) {
					console.log(found.wt.path);
					return;
				}
			}
			// No match — stderr so it doesn't pollute the path output
			consola.error(`No worktree matching "${args.name}"`);
			process.exit(1);
		}

		// Interactive: prompt for selection
		const choices = worktrees.map((w) => path.basename(w.path));
		const selected = await consola.prompt("Select worktree", {
			type: "select",
			options: choices,
		});
		if (typeof selected !== "string") {
			process.exit(1);
		}
		const target = worktrees.find((w) => path.basename(w.path) === selected);
		if (target) {
			console.log(target.path);
		}
	},
});
