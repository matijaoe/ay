import { defineCommand } from "citty";
import { isGitRepo, listWorktrees } from "../core/git";
import { resolveWorktree } from "../utils/worktree";

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

		const target = await resolveWorktree(worktrees, args.name);
		if (!target) {
			process.exit(1);
		}
		console.log(target.path);
	},
});
