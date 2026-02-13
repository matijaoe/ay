import fs from "node:fs";
import path from "node:path";
import { defineCommand } from "citty";
import { consola } from "consola";
import { getCurrentBranch, getRepoName, isGitRepo } from "../core/git";
import { detectPackageManager, getInstallCommand } from "../core/pkg";

export default defineCommand({
	meta: {
		name: "init",
		description: "Setup wizard — create .ay/config.jsonc",
	},
	async run() {
		if (!(await isGitRepo())) {
			consola.error("Not a git repository");
			process.exit(1);
		}

		const configDir = path.join(process.cwd(), ".ay");
		const configFile = path.join(configDir, "config.jsonc");

		if (fs.existsSync(configFile)) {
			const overwrite = await consola.prompt(".ay/config.jsonc already exists. Overwrite?", {
				type: "confirm",
				initial: false,
			});
			if (!overwrite) {
				consola.info("Cancelled");
				return;
			}
		}

		const repoName = await getRepoName();
		const defaultBranch = await getCurrentBranch();
		const pm = detectPackageManager(process.cwd());

		// --- Worktree path ---
		const worktreePath = await consola.prompt("Worktree path template", {
			type: "text",
			default: "~/worktrees/{repo}/{name}",
			placeholder: "~/worktrees/{repo}/{name}",
		});
		if (typeof worktreePath !== "string") return;

		// --- Base branch ---
		const baseBranch = await consola.prompt("Default base branch", {
			type: "text",
			default: defaultBranch,
			placeholder: defaultBranch,
		});
		if (typeof baseBranch !== "string") return;

		// --- Node modules strategy ---
		const nodeModules = await consola.prompt("How to handle node_modules in new worktrees", {
			type: "select",
			options: [
				"install — Run package manager install",
				"copy — Copy from main worktree",
				"symlink — Symlink to main worktree",
				"skip — Don't touch node_modules",
			],
			initial: "install — Run package manager install",
		});
		if (typeof nodeModules !== "string") return;
		const nodeModulesValue = (nodeModules as string).split(" — ")[0];

		// --- Install command ---
		const detectedInstall = pm ? getInstallCommand(pm) : "";
		const installCommand = await consola.prompt("Install command", {
			type: "text",
			default: detectedInstall,
			placeholder: detectedInstall || "pnpm install",
		});
		if (typeof installCommand !== "string") return;

		// --- Environment files ---
		const envCopy = await consola.prompt(
			"Files to copy into new worktrees (comma-separated globs)",
			{
				type: "text",
				default: ".env*",
				placeholder: ".env*, .vscode/",
			},
		);
		if (typeof envCopy !== "string") return;
		const copyPatterns = envCopy
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);

		// --- Build config ---
		const config: Record<string, unknown> = {
			$schema: "https://unpkg.com/ay@latest/schema.json",
			worktreePath: worktreePath || "~/worktrees/{repo}/{name}",
			defaults: {
				baseBranch: baseBranch || "main",
				autoName: true,
				nameStyle: "adjective-animal",
				branchPrefix: "",
				nodeModules: nodeModulesValue,
			},
			environment: {
				copy: copyPatterns.length > 0 ? copyPatterns : [".env*"],
				symlink: [],
				ignore: ["node_modules/.cache"],
			},
			scripts: {
				setup: "",
				install: installCommand || "",
				dev: "",
			},
			runOnNew: ["setup"],
			tools: {},
		};

		// --- Write file ---
		await fs.promises.mkdir(configDir, { recursive: true });
		const jsonContent = JSON.stringify(config, null, 2);
		await fs.promises.writeFile(configFile, jsonContent, "utf-8");

		consola.success(`Created .ay/config.jsonc`);
		consola.info(`Repository: ${repoName}`);
		consola.info(`Package manager: ${pm ?? "not detected"}`);

		// --- Suggest .gitignore ---
		const gitignorePath = path.join(process.cwd(), ".gitignore");
		if (fs.existsSync(gitignorePath)) {
			const gitignore = await fs.promises.readFile(gitignorePath, "utf-8");
			if (!gitignore.includes(".ay/")) {
				const add = await consola.prompt(
					"Add .ay/ to .gitignore? (choose no for team-shared config)",
					{
						type: "confirm",
						initial: false,
					},
				);
				if (add) {
					await fs.promises.appendFile(gitignorePath, "\n# ay worktree manager\n.ay/\n");
					consola.success("Added .ay/ to .gitignore");
				}
			}
		}
	},
});
