import fs from "node:fs";
import path from "node:path";
import { defineCommand } from "citty";
import { consola } from "consola";
import { getRepoName, getStatus, isGitRepo, listWorktrees } from "../core/git";
import { padEnd, relativeTime } from "../utils/format";
import { contractHome } from "../utils/paths";

export default defineCommand({
	meta: {
		name: "list",
		description: "List all worktrees with status",
	},
	args: {
		json: {
			type: "boolean",
			description: "Output as JSON",
		},
		paths: {
			type: "boolean",
			description: "Output only paths (for scripting)",
		},
	},
	async run({ args }) {
		if (!(await isGitRepo())) {
			consola.error("Not a git repository");
			process.exit(1);
		}

		const worktrees = await listWorktrees();

		if (worktrees.length === 0) {
			consola.info("No worktrees found");
			return;
		}

		// --- Paths-only mode ---
		if (args.paths) {
			for (const wt of worktrees) {
				console.log(wt.path);
			}
			return;
		}

		// --- Gather status info ---
		const cwd = process.cwd();
		const rows = await Promise.all(
			worktrees.map(async (wt) => {
				const name = path.basename(wt.path);
				const isCurrent = cwd.startsWith(wt.path);
				let status = { total: 0, isClean: true };
				try {
					status = await getStatus(wt.path);
				} catch {
					// worktree may not exist on disk
				}

				let age = "";
				try {
					const stat = await fs.promises.stat(wt.path);
					age = relativeTime(stat.birthtime.getTime() > 0 ? stat.birthtime : stat.mtime);
				} catch {
					age = "???";
				}

				return {
					name,
					branch: wt.branch,
					status: status.isClean
						? "clean"
						: `${status.total} change${status.total !== 1 ? "s" : ""}`,
					isClean: status.isClean,
					isCurrent,
					isMain: wt.isMain,
					age,
					path: wt.path,
				};
			}),
		);

		// --- JSON mode ---
		if (args.json) {
			console.log(JSON.stringify(rows, null, 2));
			return;
		}

		// --- Table mode ---
		const repoName = await getRepoName();
		consola.log("");
		consola.log(
			`  \x1b[1m${repoName}\x1b[0m — ${rows.length} worktree${rows.length !== 1 ? "s" : ""}`,
		);
		consola.log("");

		// Calculate column widths
		const nameW = Math.max(6, ...rows.map((r) => r.name.length)) + 2;
		const branchW = Math.max(8, ...rows.map((r) => r.branch.length)) + 2;
		const statusW = Math.max(8, ...rows.map((r) => r.status.length)) + 2;
		const ageW = 10;

		// Header
		consola.log(
			`  ${padEnd("Name", nameW)}${padEnd("Branch", branchW)}${padEnd("Status", statusW)}${padEnd("Age", ageW)}Path`,
		);
		consola.log(`  ${"─".repeat(nameW + branchW + statusW + ageW + 20)}`);

		for (const row of rows) {
			const marker = row.isCurrent ? "●" : " ";
			const statusColor = row.isClean ? "\x1b[32m" : "\x1b[33m";
			const reset = "\x1b[0m";

			consola.log(
				`${marker} ${padEnd(row.name, nameW)}${padEnd(row.branch, branchW)}${statusColor}${padEnd(row.status, statusW)}${reset}${padEnd(row.age, ageW)}${contractHome(row.path)}`,
			);
		}

		consola.log("");
	},
});
