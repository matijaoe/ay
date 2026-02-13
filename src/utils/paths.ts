import os from "node:os";
import path from "node:path";

export function expandHome(p: string): string {
	if (p.startsWith("~/") || p === "~") {
		return path.join(os.homedir(), p.slice(1));
	}
	return p;
}

export function contractHome(p: string): string {
	const home = os.homedir();
	if (p.startsWith(home)) {
		return `~${p.slice(home.length)}`;
	}
	return p;
}

export function resolveWorktreePath(template: string, repo: string, name: string): string {
	const resolved = template.replace("{repo}", repo).replace("{name}", name);
	return expandHome(resolved);
}
