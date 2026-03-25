import { requestUrl } from "obsidian";
import type { LatexPluginSettings, LlmProvider, ProviderConfig } from "../types";
import { buildSystemPrompt } from "../prompt";
import { getAzureDefaultApiVersion, providerNeedsApiKey } from "../providers";
import { generateWithCopilotSdk } from "./copilotSdk";

interface OpenAICompatibleResponse {
	choices?: Array<{
		message?: {
			content?: string | Array<{ type?: string; text?: string }>;
		};
	}>;
	error?: {
		message?: string;
	};
}

export class LlmClient {
	constructor(
		private readonly settings: LatexPluginSettings,
		private readonly pluginBasePath: string | null = null,
	) {}

	async testConnection(): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
		const startedAt = Date.now();
		try {
			await this.generateText("Return exactly OK.", 16);
			const elapsed = Date.now() - startedAt;
			return {
				ok: true,
				message: `Connection successful (${elapsed}ms).`,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return {
				ok: false,
				message,
			};
		}
	}

	async generateFormulaCandidates(userInput: string): Promise<string> {
		return this.generateText(userInput, this.settings.maxTokens);
	}

	private async generateText(userInput: string, maxTokens: number): Promise<string> {
		const provider = this.settings.provider;
		const providerConfig = this.settings.providers[provider];

		if (provider === "github-copilot") {
			const sdkResult = await generateWithCopilotSdk({
				model: providerConfig.model,
				prompt: `${buildSystemPrompt(this.settings)}\n\nUser request:\n${userInput}`,
				githubToken: providerConfig.apiKey,
			});
			if (!sdkResult.ok || !sdkResult.content) {
				throw new Error(sdkResult.error ?? "GitHub Copilot SDK request failed.");
			}
			return sdkResult.content;
		}

		if (providerNeedsApiKey(provider) && !providerConfig.apiKey.trim()) {
			throw new Error(`Provider ${provider} has no API key configured.`);
		}

		const endpoint = this.buildEndpoint(provider, providerConfig);
		const payload: Record<string, unknown> = {
			messages: [
				{ role: "system", content: buildSystemPrompt(this.settings) },
				{ role: "user", content: userInput },
			],
			temperature: this.settings.temperature,
			max_tokens: maxTokens,
		};

		if (provider !== "azureopenai") {
			payload.model = providerConfig.model;
		}

		const response = await requestUrl({
			url: endpoint,
			method: "POST",
			headers: this.buildHeaders(provider, providerConfig.apiKey),
			body: JSON.stringify(payload),
			throw: false,
			contentType: "application/json",
		});

		const body = (response.json as OpenAICompatibleResponse | undefined) ?? {};
		if (response.status >= 400) {
			const providerError = body.error?.message ?? response.text;
			throw new Error(`Request failed (${response.status}): ${providerError}`);
		}

		const firstContent = body.choices?.[0]?.message?.content;
		if (typeof firstContent === "string" && firstContent.trim().length > 0) {
			return firstContent;
		}

		if (Array.isArray(firstContent)) {
			const combined = firstContent
				.filter((item) => item.type === "text" && typeof item.text === "string")
				.map((item) => item.text?.trim() ?? "")
				.filter(Boolean)
				.join("\n");
			if (combined.length > 0) {
				return combined;
			}
		}

		throw new Error("Model returned an empty response.");
	}

	private buildEndpoint(provider: LlmProvider, config: ProviderConfig): string {
		const baseUrl = config.baseUrl.replace(/\/$/, "");
		if (provider === "azureopenai") {
			const deployment = encodeURIComponent(config.model);
			const apiVersion = encodeURIComponent(config.apiVersion ?? getAzureDefaultApiVersion());
			return `${baseUrl}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
		}
		return `${baseUrl}/chat/completions`;
	}

	private buildHeaders(provider: LlmProvider, apiKey: string): Record<string, string> {
		if (provider === "azureopenai") {
			return {
				"api-key": apiKey,
				"Content-Type": "application/json",
			};
		}

		if (!apiKey.trim()) {
			return {
				"Content-Type": "application/json",
			};
		}

		return {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		};
	}
}
