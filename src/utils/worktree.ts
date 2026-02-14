import path from "node:path";
import { consola } from "consola";
import type { WorktreeInfo } from "../core/git";
import { fuzzyMatch } from "./names";

/**
 * Check if `cwd` is inside the given worktree path.
 * Uses path separator boundary to avoid `/wt1` matching `/wt1-other`.
 */
export function isInsideWorktree(cwd: string, wtPath: string): boolean {
	return cwd === wtPath || cwd.startsWith(`${wtPath}/`);
}

/**
 * Resolve a worktree by name (with fuzzy matching) or prompt for selection.
 *
 * @param worktrees  - List of worktrees to search
 * @param name       - Optional name to fuzzy match against
 * @param promptMsg  - Prompt message for interactive selection
 * @returns The matched worktree, or undefined if cancelled
 */
export async function resolveWorktree(
	worktrees: WorktreeInfo[],
	name: string | undefined,
	promptMsg = "Select worktree",
): Promise<WorktreeInfo | undefined> {
	if (name) {
		const names = worktrees.map((w) => path.basename(w.path));
		const matched = fuzzyMatch(name, names);
		if (!matched) {
			consola.error(`Worktree "${name}" not found`);
			if (names.length > 0) {
				consola.info("Available:", names.join(", "));
			}
			process.exit(1);
		}
		if (matched !== name) {
			consola.info(`Matched "${name}" → ${matched}`);
		}
		return worktrees.find((w) => path.basename(w.path) === matched)!;
	}

	const choices = worktrees.map((w) => path.basename(w.path));
	const selected = await consola.prompt(promptMsg, {
		type: "select",
		options: choices,
	});
	if (typeof selected !== "string") {
		return undefined;
	}
	return worktrees.find((w) => path.basename(w.path) === selected)!;
}
