import { defineCommand } from "citty";
import { consola } from "consola";

const SHELL_FUNCTIONS = {
	bash: `
# ay shell integration
ay-cd() {
  local dir
  dir="$(command ay cd "$@")"
  if [ $? -eq 0 ] && [ -n "$dir" ] && [ -d "$dir" ]; then
    cd "$dir" || return
  fi
}
alias acd='ay-cd'
`,
	zsh: `
# ay shell integration
ay-cd() {
  local dir
  dir="$(command ay cd "$@")"
  if [[ $? -eq 0 ]] && [[ -n "$dir" ]] && [[ -d "$dir" ]]; then
    cd "$dir"
  fi
}
alias acd='ay-cd'
`,
	fish: `
# ay shell integration
function ay-cd
  set dir (command ay cd $argv)
  if test $status -eq 0; and test -n "$dir"; and test -d "$dir"
    cd $dir
  end
end
alias acd='ay-cd'
`,
};

export default defineCommand({
	meta: {
		name: "shell",
		description: "Print shell integration script",
	},
	args: {
		shell: {
			type: "positional",
			description: "Shell type: bash, zsh, fish",
			required: false,
		},
	},
	run({ args }) {
		const shellType = args.shell || detectShell();

		if (!shellType || !(shellType in SHELL_FUNCTIONS)) {
			consola.log("Add to your shell config:");
			consola.log("");
			consola.log("  # bash (~/.bashrc) or zsh (~/.zshrc):");
			consola.log('  eval "$(ay shell bash)"   # or zsh');
			consola.log("");
			consola.log("  # fish (~/.config/fish/config.fish):");
			consola.log("  ay shell fish | source");
			consola.log("");
			consola.log("This enables `ay-cd` and `acd` to switch into worktrees.");
			return;
		}

		console.log(SHELL_FUNCTIONS[shellType as keyof typeof SHELL_FUNCTIONS]);
	},
});

function detectShell(): string | undefined {
	const shell = process.env.SHELL || "";
	if (shell.endsWith("/bash")) return "bash";
	if (shell.endsWith("/zsh")) return "zsh";
	if (shell.endsWith("/fish")) return "fish";
	return undefined;
}
