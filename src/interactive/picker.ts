import fs from "node:fs";
import path from "node:path";
import { consola } from "consola";
import { loadConfig } from "../config/loader";
import {
	deleteBranch,
	getMainWorktreePath,
	getRepoName,
	getStatus,
	isGitRepo,
	listWorktrees,
	removeWorktree,
} from "../core/git";
import { launchTool } from "../core/launch";
import { runScripts } from "../core/scripts";
import { getAllTools } from "../core/tools";
import { relativeTime } from "../utils/format";
import { contractHome } from "../utils/paths";

export async function interactiveMode(): Promise<void> {
	if (!(await isGitRepo())) {
		consola.error("Not a git repository");
		process.exit(1);
	}

	const { config } = await loadConfig();
	const worktrees = await listWorktrees();
	const repoName = await getRepoName();
	const cwd = process.cwd();

	if (worktrees.length === 0) {
		consola.info("No worktrees. Run `ay new` to create one.");
		return;
	}

	// Build display labels
	const labels = await Promise.all(
		worktrees.map(async (wt) => {
			const name = path.basename(wt.path);
			const isCurrent = cwd.startsWith(wt.path);
			let statusStr = "";
			try {
				const status = await getStatus(wt.path);
				statusStr = status.isClean
					? "\x1b[32mclean\x1b[0m"
					: `\x1b[33m${status.total} change${status.total !== 1 ? "s" : ""}\x1b[0m`;
			} catch {
				statusStr = "???";
			}

			let age = "";
			try {
				const stat = await fs.promises.stat(wt.path);
				age = relativeTime(stat.birthtime.getTime() > 0 ? stat.birthtime : stat.mtime);
			} catch {
				age = "";
			}

			const marker = isCurrent ? "● " : "  ";
			return {
				label: `${marker}${name}  ${wt.branch}  ${statusStr}  ${age}`,
				value: name,
				wt,
			};
		}),
	);

	consola.log("");
	consola.log(
		`  \x1b[1may — ${repoName}\x1b[0m — ${worktrees.length} worktree${worktrees.length !== 1 ? "s" : ""}`,
	);
	consola.log("");

	// Select worktree
	const selected = await consola.prompt("Select worktree", {
		type: "select",
		options: labels.map((l) => l.label),
	});
	if (typeof selected !== "string") {
		return;
	}

	const choice = labels.find((l) => l.label === selected);
	if (!choice) return;

	// Select action
	const actions = ["Open in editor", "Run setup", "Delete", "Cancel"];
	const action = await consola.prompt(`Action for ${choice.value}`, {
		type: "select",
		options: actions,
	});

	if (typeof action !== "string" || action === "Cancel") return;

	switch (action) {
		case "Open in editor": {
			const allTools = getAllTools(config.tools);
			const toolNames = Object.keys(allTools);
			let toolKey: string;

			if (toolNames.length === 1) {
				toolKey = toolNames[0];
			} else {
				const sel = await consola.prompt("Tool", {
					type: "select",
					options: toolNames,
				});
				if (typeof sel !== "string") return;
				toolKey = sel;
			}

			const toolConfig = allTools[toolKey];
			const cmdParts = toolConfig.command.split(" ");
			const launchArgs =
				"cwdOnly" in toolConfig && toolConfig.cwdOnly
					? cmdParts.slice(1)
					: [...cmdParts.slice(1), choice.wt.path];
			try {
				await launchTool(cmdParts[0], launchArgs, { cwd: choice.wt.path });
				consola.success(`Opened with ${toolKey}`);
			} catch (error: unknown) {
				const msg = error instanceof Error ? error.message : String(error);
				consola.error(msg);
			}
			break;
		}
		case "Run setup": {
			const mainWt = await getMainWorktreePath();
			const ok = await runScripts(config.runOnNew, config, {
				worktreePath: choice.wt.path,
				mainWorktreePath: mainWt,
				branch: choice.wt.branch,
				repoName,
			});
			if (!ok) consola.error("Some scripts failed");
			break;
		}
		case "Delete": {
			if (choice.wt.isMain) {
				consola.error("Cannot delete the main worktree");
				return;
			}
			const confirmed = await consola.prompt(`Delete "${choice.value}" (${choice.wt.branch})?`, {
				type: "confirm",
				initial: false,
			});
			if (!confirmed) return;
			try {
				await removeWorktree(choice.wt.path);
				consola.success(`Removed worktree at ${contractHome(choice.wt.path)}`);
				await deleteBranch(choice.wt.branch);
				consola.success(`Deleted branch ${choice.wt.branch}`);
			} catch (error: unknown) {
				const msg = error instanceof Error ? error.message : String(error);
				consola.error(`Failed: ${msg}`);
			}
			break;
		}
	}
}
