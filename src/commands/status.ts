import fs from "node:fs";
import path from "node:path";
import { defineCommand } from "citty";
import { consola } from "consola";
import { loadConfig } from "../config/loader";
import {
	getAheadBehind,
	getLastCommitDate,
	getRepoName,
	getStatus,
	isBranchMerged,
	isGitRepo,
	listWorktrees,
} from "../core/git";
import { padEnd, relativeTime } from "../utils/format";
import { contractHome } from "../utils/paths";
import { isInsideWorktree } from "../utils/worktree";

interface WorktreeDetail {
	name: string;
	branch: string;
	path: string;
	isCurrent: boolean;
	isMain: boolean;
	status: {
		modified: number;
		added: number;
		deleted: number;
		renamed: number;
		total: number;
		isClean: boolean;
	};
	merged: boolean;
	ahead: number;
	behind: number;
	lastCommit: string;
	age: string;
}

async function gatherDetails(
	worktrees: Awaited<ReturnType<typeof listWorktrees>>,
	baseBranch: string,
	remote: string,
	cwd: string,
): Promise<WorktreeDetail[]> {
	return Promise.all(
		worktrees.map(async (wt) => {
			const name = path.basename(wt.path);
			const isCurrent = isInsideWorktree(cwd, wt.path);

			let status = { modified: 0, added: 0, deleted: 0, renamed: 0, total: 0, isClean: true };
			try {
				status = await getStatus(wt.path);
			} catch {
				// path may not exist
			}

			const merged = wt.isMain ? false : await isBranchMerged(wt.branch, baseBranch);

			let ahead = 0;
			let behind = 0;
			try {
				const remoteBranch = `${remote}/${wt.branch}`;
				const result = await getAheadBehind(wt.branch, remoteBranch);
				ahead = result.ahead;
				behind = result.behind;
			} catch {
				// no remote tracking
			}

			let lastCommit = "";
			try {
				const date = await getLastCommitDate(wt.path);
				lastCommit = date ? relativeTime(date) : "";
			} catch {
				lastCommit = "";
			}

			let age = "";
			try {
				const stat = await fs.promises.stat(wt.path);
				age = relativeTime(stat.birthtime.getTime() > 0 ? stat.birthtime : stat.mtime);
			} catch {
				age = "";
			}

			return {
				name,
				branch: wt.branch,
				path: wt.path,
				isCurrent,
				isMain: wt.isMain,
				status,
				merged,
				ahead,
				behind,
				lastCommit,
				age,
			};
		}),
	);
}

function renderTable(rows: WorktreeDetail[]): void {
	const nameW = Math.max(6, ...rows.map((r) => r.name.length)) + 2;
	const branchW = Math.max(8, ...rows.map((r) => r.branch.length)) + 2;

	// Header
	consola.log(
		`  ${padEnd("Name", nameW)}${padEnd("Branch", branchW)}Status       Sync        Last commit  Path`,
	);
	consola.log(`  ${"─".repeat(nameW + branchW + 50)}`);

	for (const row of rows) {
		const marker = row.isCurrent ? "●" : " ";
		const reset = "\x1b[0m";

		// Status
		let statusStr: string;
		if (row.status.isClean) {
			statusStr = "\x1b[32mclean\x1b[0m";
		} else {
			const parts: string[] = [];
			if (row.status.modified > 0) parts.push(`~${row.status.modified}`);
			if (row.status.added > 0) parts.push(`+${row.status.added}`);
			if (row.status.deleted > 0) parts.push(`-${row.status.deleted}`);
			if (row.status.renamed > 0) parts.push(`r${row.status.renamed}`);
			statusStr = `\x1b[33m${parts.join(" ")}${reset}`;
		}

		// Sync info
		let syncStr = "";
		if (row.ahead > 0 && row.behind > 0) {
			syncStr = `\x1b[33m↑${row.ahead} ↓${row.behind}${reset}`;
		} else if (row.ahead > 0) {
			syncStr = `\x1b[32m↑${row.ahead}${reset}`;
		} else if (row.behind > 0) {
			syncStr = `\x1b[31m↓${row.behind}${reset}`;
		} else {
			syncStr = "\x1b[2m—\x1b[0m";
		}

		// Merged indicator
		const mergedTag = row.merged ? " \x1b[36m[merged]\x1b[0m" : "";

		consola.log(
			`${marker} ${padEnd(row.name, nameW)}${padEnd(row.branch, branchW)}${padEnd(statusStr, 22)}${padEnd(syncStr, 20)}${padEnd(row.lastCommit, 13)}${contractHome(row.path)}${mergedTag}`,
		);
	}
}

export default defineCommand({
	meta: {
		name: "status",
		description: "Show detailed worktree status",
	},
	args: {
		json: {
			type: "boolean",
			description: "Output as JSON",
		},
		watch: {
			type: "boolean",
			alias: "w",
			description: "Live-refresh mode",
		},
		interval: {
			type: "string",
			alias: "i",
			description: "Refresh interval in seconds (default: 2)",
		},
	},
	async run({ args }) {
		if (!(await isGitRepo())) {
			consola.error("Not a git repository");
			process.exit(1);
		}

		const { config } = await loadConfig();
		const baseBranch = config.defaults.baseBranch;
		const remote = config.provider.remote;
		const cwd = process.cwd();

		const render = async () => {
			const worktrees = await listWorktrees();
			if (worktrees.length === 0) {
				consola.info("No worktrees found");
				return;
			}

			const [rows, repoName] = await Promise.all([
				gatherDetails(worktrees, baseBranch, remote, cwd),
				getRepoName(),
			]);

			if (args.json) {
				console.log(JSON.stringify(rows, null, 2));
				return;
			}

			consola.log("");
			consola.log(
				`  \x1b[1m${repoName}\x1b[0m — ${rows.length} worktree${rows.length !== 1 ? "s" : ""}`,
			);
			consola.log("");
			renderTable(rows);
			consola.log("");
		};

		if (args.watch) {
			const intervalSec = args.interval ? Number.parseFloat(args.interval) : 2;
			const intervalMs = Math.max(500, intervalSec * 1000);

			process.on("SIGINT", () => {
				consola.log("");
				process.exit(0);
			});

			// Initial render
			await render();
			consola.log(`  \x1b[2mRefreshing every ${intervalSec}s — press Ctrl+C to stop\x1b[0m`);

			// Watch loop
			while (true) {
				await new Promise((resolve) => setTimeout(resolve, intervalMs));
				process.stdout.write("\x1b[2J\x1b[H");
				await render();
			}
		} else {
			await render();
		}
	},
});
