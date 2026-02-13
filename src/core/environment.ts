import fs from "node:fs";
import path from "node:path";
import { consola } from "consola";
import { glob } from "tinyglobby";
import type { AyConfig, NodeModulesStrategy } from "../config/schema";
import { detectInstallCommand } from "./pkg";

export async function copyEnvironment(
	mainWorktree: string,
	targetDir: string,
	config: AyConfig,
): Promise<void> {
	const { copy, symlink, ignore } = config.environment;

	if (copy.length > 0) {
		const files = await glob(copy, { cwd: mainWorktree, ignore, dot: true });
		for (const file of files) {
			const src = path.join(mainWorktree, file);
			const dest = path.join(targetDir, file);

			// Ensure parent directory exists
			await fs.promises.mkdir(path.dirname(dest), { recursive: true });

			const stat = await fs.promises.lstat(src);
			if (stat.isDirectory()) {
				await fs.promises.cp(src, dest, { recursive: true });
			} else {
				await fs.promises.copyFile(src, dest);
			}
			consola.debug(`  Copied ${file}`);
		}
		if (files.length > 0) {
			consola.success(`Copied ${files.length} environment file(s)`);
		}
	}

	if (symlink.length > 0) {
		const files = await glob(symlink, { cwd: mainWorktree, ignore, dot: true });
		for (const file of files) {
			const src = path.join(mainWorktree, file);
			const dest = path.join(targetDir, file);

			await fs.promises.mkdir(path.dirname(dest), { recursive: true });
			await fs.promises.symlink(src, dest);
			consola.debug(`  Symlinked ${file}`);
		}
		if (files.length > 0) {
			consola.success(`Symlinked ${files.length} file(s)`);
		}
	}
}

export async function handleNodeModules(
	mainWorktree: string,
	targetDir: string,
	strategy: NodeModulesStrategy,
	installCommand?: string,
): Promise<void> {
	const srcModules = path.join(mainWorktree, "node_modules");
	const destModules = path.join(targetDir, "node_modules");

	switch (strategy) {
		case "copy": {
			if (!fs.existsSync(srcModules)) {
				consola.warn("No node_modules in main worktree to copy");
				return;
			}
			consola.start("Copying node_modules...");
			await fs.promises.cp(srcModules, destModules, { recursive: true });
			consola.success("Copied node_modules");
			break;
		}
		case "symlink": {
			if (!fs.existsSync(srcModules)) {
				consola.warn("No node_modules in main worktree to symlink");
				return;
			}
			await fs.promises.symlink(srcModules, destModules, "dir");
			consola.success("Symlinked node_modules");
			break;
		}
		case "install": {
			// Actual install is handled by the scripts runner
			const cmd =
				installCommand ?? detectInstallCommand(targetDir) ?? detectInstallCommand(mainWorktree);
			if (cmd) {
				consola.info(`Will run: ${cmd}`);
			}
			break;
		}
		case "skip":
			consola.debug("Skipping node_modules");
			break;
	}
}
