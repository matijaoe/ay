import { consola } from "consola";
import { execaCommand } from "execa";
import type { AyConfig } from "../config/schema";
import { detectInstallCommand } from "./pkg";

export interface ScriptContext {
	worktreePath: string;
	mainWorktreePath: string;
	branch: string;
	repoName: string;
}

function resolveScript(name: string, config: AyConfig, ctx: ScriptContext): string | null {
	const explicit = config.scripts[name as keyof typeof config.scripts];
	if (explicit) return explicit;

	// Auto-detect install command from lockfile
	if (name === "install") {
		return detectInstallCommand(ctx.worktreePath) ?? detectInstallCommand(ctx.mainWorktreePath);
	}

	return null;
}

export async function runScript(
	name: string,
	config: AyConfig,
	ctx: ScriptContext,
): Promise<boolean> {
	const command = resolveScript(name, config, ctx);
	if (!command) {
		consola.debug(`No script configured for "${name}", skipping`);
		return true;
	}

	consola.start(`Running ${name}: ${command}`);

	try {
		await execaCommand(command, {
			cwd: ctx.worktreePath,
			stdio: "inherit",
			env: {
				AY_WORKTREE_PATH: ctx.worktreePath,
				AY_MAIN_WORKTREE: ctx.mainWorktreePath,
				AY_BRANCH: ctx.branch,
				AY_REPO: ctx.repoName,
			},
		});
		consola.success(`Script "${name}" completed`);
		return true;
	} catch (_error) {
		consola.error(`Script "${name}" failed`);
		return false;
	}
}

export async function runScripts(
	names: string[],
	config: AyConfig,
	ctx: ScriptContext,
): Promise<boolean> {
	for (const name of names) {
		const ok = await runScript(name, config, ctx);
		if (!ok) return false;
	}
	return true;
}
