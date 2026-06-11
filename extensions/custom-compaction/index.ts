/**
 * Custom Compaction Extension
 *
 * Replaces default compaction with a full summary of the entire context.
 * Uses the local fast model (qwen2.5-coder-7b) for summarization.
 * Falls back to default if the model is not available.
 */

import { complete } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { convertToLlm, serializeConversation } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	pi.on("session_before_compact", async (event, ctx) => {
		ctx.ui.notify("Custom compaction extension triggered", "info");

		const { preparation, branchEntries: _, signal } = event;
		const { messagesToSummarize, turnPrefixMessages, tokensBefore, firstKeptEntryId, previousSummary } = preparation;

		// Use the default loaded model — avoids costly model swap on llama.cpp
		const model = ctx.modelRegistry.find("llama-cpp", "qwen3.6-35b-a3b");
		if (!model) {
			ctx.ui.notify(`Could not find qwen3.6-35b-a3b model, using default compaction`, "warning");
			return;
		}

		// Resolve request auth for the summarization model
		const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
		if (!auth.ok) {
			ctx.ui.notify(`Compaction auth failed: ${auth.error}`, "warning");
			return;
		}

		// Combine all messages for full summary
		const allMessages = [...messagesToSummarize, ...turnPrefixMessages];
		ctx.ui.notify(
			`Custom compaction: summarizing ${allMessages.length} messages (${tokensBefore.toLocaleString()} tokens) with ${model.id}...`,
			"info",
		);

		// Convert messages to readable text format
		const conversationText = serializeConversation(convertToLlm(allMessages));

		// Include previous summary context if available
		const previousContext = previousSummary ? `\n\nPrevious session summary for context:\n${previousSummary}` : "";

		// Build messages that ask for a comprehensive summary
		const summaryMessages = [
			{
				role: "user" as const,
				content: [
					{
						type: "text" as const,
						text: `You are a conversation summarizer. Create a comprehensive summary of this conversation that captures:${previousContext}

1. The main goals and objectives discussed
2. Key decisions made and their rationale
3. Important code changes, file modifications, or technical details
4. Current state of any ongoing work
5. Any blockers, issues, or open questions
6. Next steps that were planned or suggested

Be thorough but concise. The summary will replace the ENTIRE conversation history, so include all information needed to continue the work effectively.

Format the summary as structured markdown with clear sections.

<conversation>
${conversationText}
</conversation>`,
					},
				],
				timestamp: Date.now(),
			},
		];

		try {
			const response = await complete(
				model,
				{ messages: summaryMessages },
				{
					apiKey: auth.apiKey,
					headers: auth.headers,
					maxTokens: 8192,
					signal,
				},
			);

			const summary = response.content
				.filter((c): c is { type: "text"; text: string } => c.type === "text")
				.map((c) => c.text)
				.join("\n");

			if (!summary.trim()) {
				if (!signal.aborted) ctx.ui.notify("Compaction summary was empty, using default compaction", "warning");
				return;
			}

			return {
				compaction: {
					summary,
					firstKeptEntryId,
					tokensBefore,
				},
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			ctx.ui.notify(`Compaction failed: ${message}`, "error");
			return;
		}
	});
}
