import fs from "node:fs";
import path from "node:path";
import { defineCommand } from "citty";
import { consola } from "consola";
import { loadConfig } from "../config/loader";
import {
	type WorktreeStatus,
	getRepoName,
	getStatus,
	isBranchMerged,
	isGitRepo,
	listWorktrees,
} from "../core/git";
import {
	formatStatus,
	formatStatusPlain,
	padEnd,
	padEndVisible,
	relativeTime,
} from "../utils/format";
import { contractHome } from "../utils/paths";
import { isInsideWorktree } from "../utils/worktree";

interface ListRow {
	name: string;
	branch: string;
	status: WorktreeStatus;
	statusDisplay: string;
	statusPlain: string;
	isClean: boolean;
	isCurrent: boolean;
	isMain: boolean;
	merged: boolean;
	age: string;
	path: string;
}

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
		dirty: {
			type: "boolean",
			description: "Only show worktrees with uncommitted changes",
		},
		clean: {
			type: "boolean",
			description: "Only show clean worktrees",
		},
		merged: {
			type: "boolean",
			description: "Only show worktrees whose branch is merged into base",
		},
		sort: {
			type: "string",
			description: "Sort by: name, branch, age, status (default: none)",
		},
	},
	async run({ args }) {
		if (!(await isGitRepo())) {
			consola.error("Not a git repository");
			process.exit(1);
		}

		const { config } = await loadConfig();
		const baseBranch = config.defaults.baseBranch;
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

		// --- Gather info ---
		const cwd = process.cwd();
		const checkMerged = args.merged || args.sort === "status";

		const [rows, repoName] = await Promise.all([
			Promise.all(
				worktrees.map(async (wt) => {
					const name = path.basename(wt.path);
					const isCurrent = isInsideWorktree(cwd, wt.path);
					let status: WorktreeStatus = {
						modified: 0,
						added: 0,
						deleted: 0,
						renamed: 0,
						total: 0,
						isClean: true,
					};
					try {
						status = await getStatus(wt.path);
					} catch {
						// worktree may not exist on disk
					}

					const merged =
						checkMerged && !wt.isMain
							? await isBranchMerged(wt.branch, baseBranch)
							: false;

					let age = "";
					try {
						const stat = await fs.promises.stat(wt.path);
						age = relativeTime(
							stat.birthtime.getTime() > 0 ? stat.birthtime : stat.mtime,
						);
					} catch {
						age = "???";
					}

					return {
						name,
						branch: wt.branch,
						status,
						statusDisplay: formatStatus(status),
						statusPlain: formatStatusPlain(status),
						isClean: status.isClean,
						isCurrent,
						isMain: wt.isMain,
						merged,
						age,
						path: wt.path,
					} satisfies ListRow;
				}),
			),
			getRepoName(),
		]);

		// --- Filter ---
		let filtered = rows;
		if (args.dirty) filtered = filtered.filter((r) => !r.isClean);
		if (args.clean) filtered = filtered.filter((r) => r.isClean);
		if (args.merged) filtered = filtered.filter((r) => r.merged);

		if (filtered.length === 0) {
			consola.info("No worktrees match the filter");
			return;
		}

		// --- Sort ---
		if (args.sort) {
			const sortKey = args.sort.toLowerCase();
			filtered.sort((a, b) => {
				switch (sortKey) {
					case "name":
						return a.name.localeCompare(b.name);
					case "branch":
						return a.branch.localeCompare(b.branch);
					case "status":
						// dirty first, then by change count
						if (a.isClean !== b.isClean) return a.isClean ? 1 : -1;
						return b.status.total - a.status.total;
					default:
						return 0;
				}
			});
		}

		// --- JSON mode ---
		if (args.json) {
			const jsonRows = filtered.map((r) => ({
				name: r.name,
				branch: r.branch,
				status: r.statusPlain,
				...r.status,
				isClean: r.isClean,
				isCurrent: r.isCurrent,
				isMain: r.isMain,
				merged: r.merged,
				age: r.age,
				path: r.path,
			}));
			console.log(JSON.stringify(jsonRows, null, 2));
			return;
		}

		// --- Table mode ---
		consola.log("");
		consola.log(
			`  \x1b[1m${repoName}\x1b[0m \x1b[2m—\x1b[0m ${filtered.length} worktree${filtered.length !== 1 ? "s" : ""}`,
		);
		consola.log("");

		// Column widths
		const nameW = Math.max(4, ...filtered.map((r) => r.name.length)) + 2;
		const branchW = Math.max(6, ...filtered.map((r) => r.branch.length)) + 2;
		const statusW = Math.max(6, ...filtered.map((r) => r.statusPlain.length)) + 2;
		const ageW = 10;

		// Header
		consola.log(
			`  ${padEnd("Name", nameW)}${padEnd("Branch", branchW)}${padEnd("Status", statusW)}${padEnd("Age", ageW)}Path`,
		);
		consola.log(`  ${"─".repeat(nameW + branchW + statusW + ageW + 20)}`);

		for (const row of filtered) {
			const marker = row.isCurrent ? "●" : " ";
			const mergedTag = row.merged ? " \x1b[36m[merged]\x1b[0m" : "";

			consola.log(
				`${marker} ${padEnd(row.name, nameW)}${padEnd(row.branch, branchW)}${padEndVisible(row.statusDisplay, statusW)}${padEnd(row.age, ageW)}${contractHome(row.path)}${mergedTag}`,
			);
		}

		consola.log("");
	},
});
