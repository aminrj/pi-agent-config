/**
 * Model Status Extension
 *
 * Shows current model in the status bar.
 * Fires on model changes via /model, Ctrl+P cycling, or session restore.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	pi.on("model_select", async (event, ctx) => {
		const { model, previousModel, source } = event;

		const next = `${model.provider}/${model.id}`;
		const prev = previousModel ? `${previousModel.provider}/${previousModel.id}` : "none";

		if (source !== "restore") {
			ctx.ui.notify(`Model: ${next}`, "info");
		}

		ctx.ui.setStatus("model", `🤖 ${model.id}`);
		console.log(`[model_select] ${prev} → ${next} (${source})`);
	});
}
