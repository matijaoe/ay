import fs from "node:fs";
import path from "node:path";
import { defineCommand } from "citty";
import { consola } from "consola";
import { loadConfig } from "../config/loader";
import {
	type WorktreeStatus,
	getAheadBehind,
	getLastCommitDate,
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

interface WorktreeDetail {
	name: string;
	branch: string;
	path: string;
	isCurrent: boolean;
	isMain: boolean;
	status: WorktreeStatus;
	statusDisplay: string;
	statusPlain: string;
	merged: boolean;
	ahead: number;
	behind: number;
	syncDisplay: string;
	syncPlain: string;
	lastCommit: string;
	age: string;
}

function formatSync(ahead: number, behind: number): { display: string; plain: string } {
	const reset = "\x1b[0m";
	if (ahead > 0 && behind > 0) {
		return {
			display: `\x1b[33m↑${ahead} ↓${behind}${reset}`,
			plain: `↑${ahead} ↓${behind}`,
		};
	}
	if (ahead > 0) {
		return { display: `\x1b[32m↑${ahead}${reset}`, plain: `↑${ahead}` };
	}
	if (behind > 0) {
		return { display: `\x1b[31m↓${behind}${reset}`, plain: `↓${behind}` };
	}
	return { display: "\x1b[2m—\x1b[0m", plain: "—" };
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

			const sync = formatSync(ahead, behind);

			return {
				name,
				branch: wt.branch,
				path: wt.path,
				isCurrent,
				isMain: wt.isMain,
				status,
				statusDisplay: formatStatus(status),
				statusPlain: formatStatusPlain(status),
				merged,
				ahead,
				behind,
				syncDisplay: sync.display,
				syncPlain: sync.plain,
				lastCommit,
				age,
			};
		}),
	);
}

function renderTableLines(rows: WorktreeDetail[]): string[] {
	const nameW = Math.max(4, ...rows.map((r) => r.name.length)) + 2;
	const branchW = Math.max(6, ...rows.map((r) => r.branch.length)) + 2;
	const statusW = Math.max(6, ...rows.map((r) => r.statusPlain.length)) + 2;
	const syncW = Math.max(4, ...rows.map((r) => r.syncPlain.length)) + 2;
	const commitW = 12;

	const lines: string[] = [];

	lines.push(
		`  ${padEnd("Name", nameW)}${padEnd("Branch", branchW)}${padEnd("Status", statusW)}${padEnd("Sync", syncW)}${padEnd("Last commit", commitW)}Path`,
	);
	lines.push(`  ${"─".repeat(nameW + branchW + statusW + syncW + commitW + 20)}`);

	for (const row of rows) {
		const marker = row.isCurrent ? "●" : " ";
		const mergedTag = row.merged ? " \x1b[36m[merged]\x1b[0m" : "";

		lines.push(
			`${marker} ${padEnd(row.name, nameW)}${padEnd(row.branch, branchW)}${padEndVisible(row.statusDisplay, statusW)}${padEndVisible(row.syncDisplay, syncW)}${padEnd(row.lastCommit, commitW)}${contractHome(row.path)}${mergedTag}`,
		);
	}

	return lines;
}

function renderTable(rows: WorktreeDetail[]): void {
	for (const line of renderTableLines(rows)) {
		consola.log(line);
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
		dirty: {
			type: "boolean",
			description: "Only show worktrees with uncommitted changes",
		},
		merged: {
			type: "boolean",
			description: "Only show worktrees whose branch is merged into base",
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

			const [allRows, repoName] = await Promise.all([
				gatherDetails(worktrees, baseBranch, remote, cwd),
				getRepoName(),
			]);

			// Apply filters
			let rows = allRows;
			if (args.dirty) rows = rows.filter((r) => !r.status.isClean);
			if (args.merged) rows = rows.filter((r) => r.merged);

			if (rows.length === 0) {
				consola.info("No worktrees match the filter");
				return;
			}

			if (args.json) {
				console.log(JSON.stringify(rows, null, 2));
				return;
			}

			consola.log("");
			consola.log(
				`  \x1b[1m${repoName}\x1b[0m \x1b[2m—\x1b[0m ${rows.length} worktree${rows.length !== 1 ? "s" : ""}`,
			);
			consola.log("");
			renderTable(rows);
			consola.log("");
		};

		if (args.watch) {
			const intervalSec = args.interval ? Number.parseFloat(args.interval) : 2;
			const intervalMs = Math.max(500, intervalSec * 1000);

			// Hide cursor during watch mode
			process.stdout.write("\x1b[?25l");

			process.on("SIGINT", () => {
				process.stdout.write("\x1b[?25h"); // restore cursor
				consola.log("");
				process.exit(0);
			});

			let prevLineCount = 0;

			const watchRender = async () => {
				// Move cursor up to overwrite previous output
				if (prevLineCount > 0) {
					process.stdout.write(`\x1b[${prevLineCount}A\x1b[G`);
				}

				const worktrees = await listWorktrees();
				const lines: string[] = [];

				if (worktrees.length === 0) {
					lines.push("  No worktrees found");
				} else {
					const [allRows, repoName] = await Promise.all([
						gatherDetails(worktrees, baseBranch, remote, cwd),
						getRepoName(),
					]);

					let rows = allRows;
					if (args.dirty) rows = rows.filter((r) => !r.status.isClean);
					if (args.merged) rows = rows.filter((r) => r.merged);

					if (rows.length === 0) {
						lines.push("  No worktrees match the filter");
					} else {
						lines.push("");
						lines.push(
							`  \x1b[1m${repoName}\x1b[0m \x1b[2m—\x1b[0m ${rows.length} worktree${rows.length !== 1 ? "s" : ""}`,
						);
						lines.push("");
						lines.push(...renderTableLines(rows));
						lines.push("");
					}
				}

				const now = new Date().toLocaleTimeString();
				lines.push(
					`  \x1b[2mUpdated ${now} · every ${intervalSec}s · Ctrl+C to stop\x1b[0m`,
				);

				// Write lines, clearing each to end of line
				for (const line of lines) {
					process.stdout.write(`${line}\x1b[K\n`);
				}
				// Clear any leftover lines from previous render
				if (lines.length < prevLineCount) {
					for (let i = 0; i < prevLineCount - lines.length; i++) {
						process.stdout.write("\x1b[K\n");
					}
					// Move back up past cleared lines
					process.stdout.write(`\x1b[${prevLineCount - lines.length}A`);
				}
				prevLineCount = lines.length;
			};

			await watchRender();

			while (true) {
				await new Promise((resolve) => setTimeout(resolve, intervalMs));
				await watchRender();
			}
		} else {
			await render();
		}
	},
});
