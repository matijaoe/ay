import path from "node:path";
import { defineCommand } from "citty";
import { consola } from "consola";
import { loadConfig } from "../config/loader";
import {
	deleteBranch,
	getStatus,
	isBranchMerged,
	isGitRepo,
	listWorktrees,
	removeWorktree,
} from "../core/git";
import { contractHome } from "../utils/paths";

export default defineCommand({
	meta: {
		name: "clean",
		description: "Remove merged or stale worktrees",
	},
	args: {
		merged: {
			type: "boolean",
			description: "Only remove worktrees whose branch is merged into base",
		},
		force: {
			type: "boolean",
			description: "Skip confirmation",
		},
		"dry-run": {
			type: "boolean",
			description: "Show what would be deleted without doing it",
		},
		"keep-branch": {
			type: "boolean",
			description: "Don't delete the git branch",
		},
	},
	async run({ args }) {
		if (!(await isGitRepo())) {
			consola.error("Not a git repository");
			process.exit(1);
		}

		const { config } = await loadConfig();
		const worktrees = await listWorktrees();
		const nonMain = worktrees.filter((w) => !w.isMain);

		if (nonMain.length === 0) {
			consola.info("No worktrees to clean (only main worktree exists)");
			return;
		}

		const baseBranch = config.defaults.baseBranch;

		// Gather info about each worktree in parallel
		const candidates = await Promise.all(
			nonMain.map(async (wt) => {
				const name = path.basename(wt.path);
				const merged = await isBranchMerged(wt.branch, baseBranch);
				let isClean = true;
				try {
					const status = await getStatus(wt.path);
					isClean = status.isClean;
				} catch {
					// path may not exist
				}
				return { wt, name, merged, isClean };
			}),
		);

		// Filter: if --merged flag, only show merged worktrees; otherwise show all merged
		const toClean = args.merged
			? candidates.filter((c) => c.merged)
			: candidates.filter((c) => c.merged);

		if (toClean.length === 0) {
			consola.info(`No merged worktrees found (checked against ${baseBranch})`);
			return;
		}

		// Display candidates
		consola.log("");
		consola.log(`  Found ${toClean.length} merged worktree${toClean.length !== 1 ? "s" : ""}:`);
		consola.log("");
		for (const c of toClean) {
			const dirty = c.isClean ? "" : " \x1b[33m(has uncommitted changes)\x1b[0m";
			consola.log(`    ${c.name}  ${c.wt.branch}${dirty}`);
		}
		consola.log("");

		if (args["dry-run"]) {
			consola.info("Dry run — no changes made");
			return;
		}

		// Confirm
		if (!args.force) {
			const hasDirty = toClean.some((c) => !c.isClean);
			const message = hasDirty
				? `Delete ${toClean.length} worktree(s)? Some have uncommitted changes!`
				: `Delete ${toClean.length} merged worktree(s)?`;
			const confirmed = await consola.prompt(message, {
				type: "confirm",
				initial: false,
			});
			if (!confirmed) {
				consola.info("Cancelled");
				return;
			}
		}

		// Delete worktrees
		let removed = 0;
		for (const c of toClean) {
			try {
				await removeWorktree(c.wt.path, args.force);
				consola.success(`Removed worktree at ${contractHome(c.wt.path)}`);
				removed++;

				if (!args["keep-branch"]) {
					try {
						await deleteBranch(c.wt.branch);
						consola.success(`Deleted branch ${c.wt.branch}`);
					} catch (error: unknown) {
						const msg = error instanceof Error ? error.message : String(error);
						consola.warn(`Could not delete branch ${c.wt.branch}: ${msg}`);
					}
				}
			} catch (error: unknown) {
				const msg = error instanceof Error ? error.message : String(error);
				consola.error(`Failed to remove ${c.name}: ${msg}`);
			}
		}

		consola.log("");
		consola.info(`Cleaned ${removed}/${toClean.length} worktree(s)`);
	},
});
