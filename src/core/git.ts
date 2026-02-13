import path from "node:path";
import { type SimpleGit, simpleGit } from "simple-git";

export interface WorktreeInfo {
	path: string;
	branch: string;
	head: string;
	isBare: boolean;
	isMain: boolean;
}

export interface WorktreeStatus {
	modified: number;
	added: number;
	deleted: number;
	renamed: number;
	total: number;
	isClean: boolean;
}

function git(cwd?: string): SimpleGit {
	return simpleGit(cwd ?? process.cwd());
}

export async function isGitRepo(cwd?: string): Promise<boolean> {
	try {
		return await git(cwd).checkIsRepo();
	} catch {
		return false;
	}
}

export async function getRepoRoot(cwd?: string): Promise<string> {
	const root = await git(cwd).revparse(["--show-toplevel"]);
	return root.trim();
}

export async function getRepoName(cwd?: string): Promise<string> {
	const g = git(cwd);
	try {
		const remotes = await g.getRemotes(true);
		const origin = remotes.find((r) => r.name === "origin") ?? remotes[0];
		if (origin?.refs?.fetch) {
			const url = origin.refs.fetch;
			// Handle ssh and https URLs
			const match = url.match(/[/:]([\w.-]+?)(\.git)?$/);
			if (match) return match[1];
		}
	} catch {
		// No remotes — fall back to directory name
	}
	const root = await getRepoRoot(cwd);
	return path.basename(root);
}

export async function getCurrentBranch(cwd?: string): Promise<string> {
	const branch = await git(cwd).revparse(["--abbrev-ref", "HEAD"]);
	return branch.trim();
}

export async function listWorktrees(cwd?: string): Promise<WorktreeInfo[]> {
	const g = git(cwd);
	const result = await g.raw(["worktree", "list", "--porcelain"]);
	const worktrees: WorktreeInfo[] = [];
	let current: Partial<WorktreeInfo> = {};

	for (const line of result.split("\n")) {
		if (line.startsWith("worktree ")) {
			current.path = line.slice("worktree ".length);
		} else if (line.startsWith("HEAD ")) {
			current.head = line.slice("HEAD ".length);
		} else if (line.startsWith("branch ")) {
			// refs/heads/main → main
			current.branch = line.slice("branch ".length).replace("refs/heads/", "");
		} else if (line === "bare") {
			current.isBare = true;
		} else if (line === "detached") {
			current.branch = current.branch ?? "(detached)";
		} else if (line === "") {
			if (current.path) {
				worktrees.push({
					path: current.path,
					branch: current.branch ?? "(unknown)",
					head: current.head ?? "",
					isBare: current.isBare ?? false,
					isMain: worktrees.length === 0, // first entry is always the main worktree
				});
			}
			current = {};
		}
	}

	return worktrees;
}

export async function createWorktree(
	worktreePath: string,
	branch: string,
	baseBranch: string,
	cwd?: string,
): Promise<void> {
	const g = git(cwd);
	await g.raw(["worktree", "add", "-b", branch, worktreePath, baseBranch]);
}

export async function removeWorktree(
	worktreePath: string,
	force = false,
	cwd?: string,
): Promise<void> {
	const g = git(cwd);
	const args = ["worktree", "remove", worktreePath];
	if (force) args.push("--force");
	await g.raw(args);
}

export async function deleteBranch(branch: string, force = false, cwd?: string): Promise<void> {
	const g = git(cwd);
	await g.branch([force ? "-D" : "-d", branch]);
}

export async function getBranches(cwd?: string): Promise<{ local: string[]; remote: string[] }> {
	const g = git(cwd);
	const summary = await g.branch(["-a"]);
	const local: string[] = [];
	const remote: string[] = [];

	for (const [name, _info] of Object.entries(summary.branches)) {
		if (name.startsWith("remotes/")) {
			// remotes/origin/main → origin/main
			remote.push(name.replace("remotes/", ""));
		} else {
			local.push(name);
		}
	}

	return { local, remote };
}

export async function getStatus(worktreePath: string): Promise<WorktreeStatus> {
	const g = git(worktreePath);
	const status = await g.status();
	const modified = status.modified.length;
	const added = status.not_added.length + status.created.length;
	const deleted = status.deleted.length;
	const renamed = status.renamed.length;
	const total = modified + added + deleted + renamed + status.staged.length;

	return { modified, added, deleted, renamed, total, isClean: total === 0 };
}

export async function getMainWorktreePath(cwd?: string): Promise<string> {
	const worktrees = await listWorktrees(cwd);
	const main = worktrees.find((w) => w.isMain);
	if (!main) throw new Error("Could not find main worktree");
	return main.path;
}

export async function isBranchMerged(
	branch: string,
	targetBranch: string,
	cwd?: string,
): Promise<boolean> {
	const g = git(cwd);
	try {
		const merged = await g.raw(["branch", "--merged", targetBranch]);
		const branches = merged
			.split("\n")
			.map((b) => b.replace(/^\*?\s+/, "").trim())
			.filter(Boolean);
		return branches.includes(branch);
	} catch {
		return false;
	}
}

export async function getLastCommitDate(worktreePath: string): Promise<Date | null> {
	const g = git(worktreePath);
	try {
		const result = await g.raw(["log", "-1", "--format=%aI"]);
		const trimmed = result.trim();
		return trimmed ? new Date(trimmed) : null;
	} catch {
		return null;
	}
}

export async function getAheadBehind(
	branch: string,
	remoteBranch: string,
	cwd?: string,
): Promise<{ ahead: number; behind: number }> {
	const g = git(cwd);
	try {
		const result = await g.raw([
			"rev-list",
			"--left-right",
			"--count",
			`${branch}...${remoteBranch}`,
		]);
		const [ahead, behind] = result.trim().split(/\s+/).map(Number);
		return { ahead: ahead ?? 0, behind: behind ?? 0 };
	} catch {
		return { ahead: 0, behind: 0 };
	}
}
