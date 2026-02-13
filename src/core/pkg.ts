import fs from "node:fs";
import path from "node:path";

export type PackageManager = "pnpm" | "yarn" | "bun" | "npm";

const lockfileMap: Record<string, PackageManager> = {
	"pnpm-lock.yaml": "pnpm",
	"yarn.lock": "yarn",
	"bun.lockb": "bun",
	"bun.lock": "bun",
	"package-lock.json": "npm",
};

export function detectPackageManager(dir: string): PackageManager | null {
	for (const [lockfile, pm] of Object.entries(lockfileMap)) {
		if (fs.existsSync(path.join(dir, lockfile))) {
			return pm;
		}
	}
	return null;
}

export function getInstallCommand(pm: PackageManager): string {
	return `${pm} install`;
}

export function detectInstallCommand(dir: string): string | null {
	const pm = detectPackageManager(dir);
	if (!pm) return null;
	return getInstallCommand(pm);
}
