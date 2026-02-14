import { consola } from "consola";
import type { AyToolConfig } from "../config/schema";
import { launchTool } from "./launch";

/**
 * Launch a resolved tool for a worktree path.
 * Handles cwdOnly tools, path argument injection, and error display.
 */
export async function openToolInWorktree(
	key: string,
	toolConfig: Pick<AyToolConfig, "command"> & { cwdOnly?: boolean },
	worktreePath: string,
): Promise<void> {
	const cmdParts = toolConfig.command.split(" ");
	const bin = cmdParts[0];
	const cmdArgs = [...cmdParts.slice(1)];

	// cwdOnly tools (claude, codex) don't take a path arg — they use cwd
	if (!toolConfig.cwdOnly) {
		const dotIndex = cmdArgs.indexOf(".");
		if (dotIndex !== -1) {
			cmdArgs[dotIndex] = worktreePath;
		} else {
			cmdArgs.push(worktreePath);
		}
	}

	consola.start(`Opening with ${key}...`);
	try {
		await launchTool(bin, cmdArgs, { cwd: worktreePath });
		consola.success(`Launched ${key}`);
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : String(error);
		consola.error(msg);
	}
}
