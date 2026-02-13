import path from "node:path";
import { defineCommand } from "citty";
import { consola } from "consola";
import { deleteBranch, getStatus, isGitRepo, listWorktrees, removeWorktree } from "../core/git";
import { fuzzyMatch } from "../utils/names";
import { contractHome } from "../utils/paths";

export default defineCommand({
	meta: {
		name: "delete",
		description: "Remove a worktree and its branch",
	},
	args: {
		name: {
			type: "positional",
			description: "Worktree name to delete",
			required: false,
		},
		force: {
			type: "boolean",
			description: "Skip confirmation prompt",
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

		const worktrees = await listWorktrees();
		const nonMain = worktrees.filter((w) => !w.isMain);

		if (nonMain.length === 0) {
			consola.info("No worktrees to delete (only main worktree exists)");
			return;
		}

		// --- Resolve which worktree to delete ---
		let target: (typeof worktrees)[number] | undefined;

		if (args.name) {
			const names = nonMain.map((w) => path.basename(w.path));
			const matched = fuzzyMatch(args.name, names);
			if (!matched) {
				consola.error(`Worktree "${args.name}" not found`);
				consola.info("Available:", names.join(", "));
				process.exit(1);
			}
			if (matched !== args.name) {
				consola.info(`Matched "${args.name}" → ${matched}`);
			}
			target = nonMain.find((w) => path.basename(w.path) === matched)!;
		} else {
			const choices = nonMain.map((w) => path.basename(w.path));
			const selected = await consola.prompt("Select worktree to delete", {
				type: "select",
				options: choices,
			});
			if (typeof selected !== "string") {
				consola.warn("Cancelled");
				return;
			}
			target = nonMain.find((w) => path.basename(w.path) === selected)!;
		}

		const name = path.basename(target.path);

		// --- Warn if dirty ---
		try {
			const status = await getStatus(target.path);
			if (!status.isClean) {
				consola.warn(`Worktree "${name}" has ${status.total} uncommitted change(s)`);
			}
		} catch {
			// path might not exist
		}

		// --- Confirm ---
		if (!args.force) {
			const confirmed = await consola.prompt(`Delete worktree "${name}" (${target.branch})?`, {
				type: "confirm",
				initial: false,
			});
			if (!confirmed) {
				consola.info("Cancelled");
				return;
			}
		}

		// --- Remove worktree ---
		try {
			await removeWorktree(target.path, args.force);
			consola.success(`Removed worktree at ${contractHome(target.path)}`);
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			consola.error(`Failed to remove worktree: ${msg}`);
			if (!args.force) {
				consola.info("Retry with --force to force removal");
			}
			process.exit(1);
		}

		// --- Delete branch ---
		if (!args["keep-branch"] && !target.isMain) {
			try {
				await deleteBranch(target.branch);
				consola.success(`Deleted branch ${target.branch}`);
			} catch (error: unknown) {
				const msg = error instanceof Error ? error.message : String(error);
				consola.warn(`Could not delete branch: ${msg}`);
			}
		}
	},
});
