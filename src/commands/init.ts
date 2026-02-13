import { defineCommand } from "citty";
import { consola } from "consola";

export default defineCommand({
	meta: {
		name: "init",
		description: "Setup wizard — create .ay/config.jsonc",
	},
	run() {
		consola.info("ay init — not implemented yet");
	},
});
