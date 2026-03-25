import type { LlmProvider, ProviderConfig } from "./types";

interface ModelPricing {
	modelNames: string[];
	inputPerMillionCny: number;
	outputPerMillionCny: number;
}

export interface ProviderMetadata {
	label: string;
	requiresApiKey: boolean;
	authHint?: string;
	defaultConfig: ProviderConfig;
	pricing: ModelPricing[];
	modelOptions?: string[];
}

interface ModelOptionItem {
	value: string;
	label: string;
}

const GITHUB_MODEL_RATE_HINTS: Record<string, string> = {
	"claude-haiku-4.5": "0.33x",
	"anthropic/claude-haiku-4.5": "0.33x",
	"gemini-2.5-pro": "1x",
	"google/gemini-2.5-pro": "1x",
	"gemini-3-pro": "1x",
	"google/gemini-3-pro-preview": "1x",
	"gpt-4.1": "0x",
	"openai/gpt-4.1": "0x",
	"gpt-4o": "0x",
	"openai/gpt-4o": "0x",
	"gpt-5-mini": "0x",
	"openai/gpt-5-mini": "0x",
	"gpt-5.1": "1x",
	"openai/gpt-5.1": "1x",
	"gpt-5.1-codex": "1x",
	"openai/gpt-5.1-codex": "1x",
	"gpt-5.1-codex-max": "1x",
	"openai/gpt-5.1-codex-max": "1x",
	"gpt-5.1-codex-mini": "0.33x",
	"openai/gpt-5.1-codex-mini": "0.33x",
	"gpt-5.2": "1x",
	"openai/gpt-5.2": "1x",
	"gpt-5.2-codex": "1x",
	"openai/gpt-5.2-codex": "1x",
	"gpt-5.4-mini": "0.33x",
	"openai/gpt-5.4-mini": "0.33x",
	"grok-code-fast-1": "0.25x",
	"xai/grok-code-fast-1": "0.25x",
	"raptor-mini": "0x",
	"openai/raptor-mini": "0x",
};

const DEFAULT_AZURE_API_VERSION = "2024-10-21";
const AVG_OUTPUT_TOKENS_PER_FORMULA = 140;

export const PROVIDER_METADATA: Record<LlmProvider, ProviderMetadata> = {
	"alibaba-bailian": {
		label: "Alibaba Bailian (Qwen)",
		requiresApiKey: true,
		defaultConfig: {
			apiKey: "",
			baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
			model: "qwen-plus",
		},
		modelOptions: ["qwen-plus", "qwen-max", "qwen-turbo"],
		pricing: [
			{
				modelNames: ["qwen-plus"],
				inputPerMillionCny: 4,
				outputPerMillionCny: 12,
			},
		],
	},
	"github-copilot": {
		label: "GitHub Copilot (Web API)",
		requiresApiKey: true,
		authHint:
			"No CLI dependency. Click Login to authorize GitHub in browser; token is saved automatically.",
		defaultConfig: {
			apiKey: "",
			baseUrl: "https://models.inference.ai.azure.com",
			model: "gpt-5.1",
		},
		modelOptions: [
			"claude-haiku-4.5",
			"gemini-2.5-pro",
			"gemini-3-pro",
			"gpt-4.1",
			"gpt-4o",
			"gpt-5-mini",
			"gpt-5.1",
			"gpt-5.1-codex",
			"gpt-5.1-codex-max",
			"gpt-5.1-codex-mini",
			"gpt-5.2",
			"gpt-5.2-codex",
			"gpt-5.4-mini",
			"grok-code-fast-1",
			"raptor-mini",
		],
		pricing: [
			{
				modelNames: ["gpt-5.1"],
				inputPerMillionCny: 2.9,
				outputPerMillionCny: 11.5,
			},
		],
	},
	deepseek: {
		label: "DeepSeek",
		requiresApiKey: true,
		defaultConfig: {
			apiKey: "",
			baseUrl: "https://api.deepseek.com/v1",
			model: "deepseek-chat",
		},
		modelOptions: ["deepseek-chat", "deepseek-reasoner", "deepseek-v3"],
		pricing: [
			{
				modelNames: ["deepseek-chat", "deepseek-v3"],
				inputPerMillionCny: 2,
				outputPerMillionCny: 8,
			},
		],
	},
	"volcengine-ark": {
		label: "Volcengine Ark",
		requiresApiKey: true,
		defaultConfig: {
			apiKey: "",
			baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
			model: "deepseek-v3-250324",
		},
		modelOptions: ["deepseek-v3-250324", "doubao-pro-32k", "doubao-lite-32k"],
		pricing: [
			{
				modelNames: ["deepseek-v3-250324", "deepseek-v3"],
				inputPerMillionCny: 2,
				outputPerMillionCny: 8,
			},
		],
	},
	zhipu: {
		label: "Zhipu AI",
		requiresApiKey: true,
		defaultConfig: {
			apiKey: "",
			baseUrl: "https://open.bigmodel.cn/api/paas/v4",
			model: "glm-4-air",
		},
		modelOptions: ["glm-4-air", "glm-4-plus", "glm-4.5"],
		pricing: [
			{
				modelNames: ["glm-4-air"],
				inputPerMillionCny: 2,
				outputPerMillionCny: 2,
			},
		],
	},
	minimax: {
		label: "MiniMax",
		requiresApiKey: true,
		defaultConfig: {
			apiKey: "",
			baseUrl: "https://api.minimax.chat/v1",
			model: "MiniMax-Text-01",
		},
		modelOptions: ["MiniMax-Text-01", "MiniMax-Text-01-pro"],
		pricing: [
			{
				modelNames: ["minimax-text-01", "minimax-text"],
				inputPerMillionCny: 1.5,
				outputPerMillionCny: 6,
			},
		],
	},
	moonshot: {
		label: "Kimi (Moonshot)",
		requiresApiKey: true,
		defaultConfig: {
			apiKey: "",
			baseUrl: "https://api.moonshot.cn/v1",
			model: "moonshot-v1-8k",
		},
		modelOptions: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
		pricing: [
			{
				modelNames: ["moonshot-v1-8k", "moonshot-v1-32k"],
				inputPerMillionCny: 12,
				outputPerMillionCny: 12,
			},
		],
	},
	openrouter: {
		label: "OpenRouter",
		requiresApiKey: true,
		defaultConfig: {
			apiKey: "",
			baseUrl: "https://openrouter.ai/api/v1",
			model: "deepseek/deepseek-chat-v3-0324",
		},
		modelOptions: [
			"deepseek/deepseek-chat-v3-0324",
			"openai/gpt-4.1-mini",
			"anthropic/claude-sonnet-4.5",
		],
		pricing: [
			{
				modelNames: ["deepseek/deepseek-chat-v3-0324", "deepseek/deepseek-chat"],
				inputPerMillionCny: 2.5,
				outputPerMillionCny: 10,
			},
		],
	},
	"siliconflow": {
		label: "SiliconFlow",
		requiresApiKey: true,
		defaultConfig: {
			apiKey: "",
			baseUrl: "https://api.siliconflow.cn/v1",
			model: "deepseek-ai/DeepSeek-V3",
		},
		modelOptions: ["deepseek-ai/DeepSeek-V3", "deepseek-ai/DeepSeek-R1", "Qwen/Qwen2.5-72B-Instruct"],
		pricing: [
			{
				modelNames: ["deepseek-ai/deepseek-v3", "deepseek-ai/deepseek-r1"],
				inputPerMillionCny: 2,
				outputPerMillionCny: 8,
			},
		],
	},
	azureopenai: {
		label: "Azure OpenAI",
		requiresApiKey: true,
		defaultConfig: {
			apiKey: "",
			baseUrl: "https://YOUR_RESOURCE_NAME.openai.azure.com",
			model: "gpt-4o-mini",
			apiVersion: DEFAULT_AZURE_API_VERSION,
		},
		modelOptions: ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4o"],
		pricing: [
			{
				modelNames: ["gpt-4o-mini", "gpt-4.1-mini"],
				inputPerMillionCny: 1.1,
				outputPerMillionCny: 4.4,
			},
		],
	},
	ollama: {
		label: "Ollama (Local)",
		requiresApiKey: false,
		defaultConfig: {
			apiKey: "",
			baseUrl: "http://127.0.0.1:11434/v1",
			model: "qwen2.5:7b",
		},
		modelOptions: ["qwen2.5:7b", "llama3.1:8b", "deepseek-r1:8b"],
		pricing: [
			{
				modelNames: ["*"],
				inputPerMillionCny: 0,
				outputPerMillionCny: 0,
			},
		],
	},
};

export function createDefaultProviderConfigs(): Record<LlmProvider, ProviderConfig> {
	const entries = Object.entries(PROVIDER_METADATA).map(([provider, metadata]) => [
		provider,
		{ ...metadata.defaultConfig },
	]);
	return Object.fromEntries(entries) as Record<LlmProvider, ProviderConfig>;
}

export function getProviderLabel(provider: LlmProvider): string {
	return PROVIDER_METADATA[provider].label;
}

export function providerNeedsApiKey(provider: LlmProvider): boolean {
	return PROVIDER_METADATA[provider].requiresApiKey;
}

export function getProviderAuthHint(provider: LlmProvider): string | null {
	return PROVIDER_METADATA[provider].authHint ?? null;
}

export function getProviderModelOptions(provider: LlmProvider): string[] {
	const metadata = PROVIDER_METADATA[provider];
	const configured = metadata.modelOptions?.filter((name) => name && name !== "*") ?? [];
	const fromPricing = metadata.pricing.flatMap((item) => item.modelNames).filter((name) => name && name !== "*");
	const merged = [...configured, ...fromPricing, metadata.defaultConfig.model];
	return Array.from(new Set(merged));
}

export function getProviderModelOptionItems(provider: LlmProvider): ModelOptionItem[] {
	const models = getProviderModelOptions(provider);
	if (provider !== "github-copilot") {
		return models.map((model) => ({ value: model, label: model }));
	}
	return models.map((model) => ({
		value: model,
		label: getGithubModelDisplayLabel(model),
	}));
}

export function getGithubModelDisplayLabel(model: string): string {
	const prettyName = model
		.replace(/^openai\//, "")
		.replace(/^google\//, "")
		.replace(/^anthropic\//, "")
		.replace(/^xai\//, "")
		.replace(/-/g, " ")
		.replace(/\b\w/g, (c) => c.toUpperCase())
		.replace(/Gpt/g, "GPT")
		.replace(/Claude Haiku 4 5/, "Claude Haiku 4.5")
		.replace(/Gemini 2 5 Pro/, "Gemini 2.5 Pro")
		.replace(/Gemini 3 Pro/, "Gemini 3 Pro (Preview)")
		.replace(/Grok Code Fast 1/, "Grok Code Fast 1")
		.replace(/Raptor Mini/, "Raptor mini (Preview)")
		.replace(/Gpt 4 1/, "GPT-4.1")
		.replace(/Gpt 4O/, "GPT-4o")
		.replace(/Gpt 5 Mini/, "GPT-5 mini")
		.replace(/Gpt 5 1 Codex Max/, "GPT-5.1-Codex-Max")
		.replace(/Gpt 5 1 Codex Mini/, "GPT-5.1-Codex-Mini")
		.replace(/Gpt 5 1 Codex/, "GPT-5.1-Codex")
		.replace(/Gpt 5 2 Codex/, "GPT-5.2-Codex")
		.replace(/Gpt 5 1/, "GPT-5.1")
		.replace(/Gpt 5 2/, "GPT-5.2")
		.replace(/Gpt 5 4 Mini/, "GPT-5.4 mini");

	const rate = GITHUB_MODEL_RATE_HINTS[model] ?? "rate unknown";
	return `${prettyName} (${rate})`;
}

export function normalizeProviderConfigs(
	savedProviders: Partial<Record<LlmProvider, Partial<ProviderConfig>>> | undefined,
): Record<LlmProvider, ProviderConfig> {
	const normalized = createDefaultProviderConfigs();
	if (!savedProviders) {
		return normalized;
	}

	for (const [provider, maybeConfig] of Object.entries(savedProviders)) {
		const typedProvider = provider as LlmProvider;
		const base = normalized[typedProvider];
		if (!base || !maybeConfig) {
			continue;
		}
		normalized[typedProvider] = {
			apiKey: maybeConfig.apiKey ?? base.apiKey,
			baseUrl: maybeConfig.baseUrl ?? base.baseUrl,
			model: maybeConfig.model ?? base.model,
			apiVersion: maybeConfig.apiVersion ?? base.apiVersion,
		};
	}

	return normalized;
}

export function estimateFormulasPerYuan(provider: LlmProvider, model: string): number | null {
	const pricing = findModelPricing(provider, model);
	if (!pricing) {
		return null;
	}

	if (pricing.outputPerMillionCny <= 0) {
		return Number.POSITIVE_INFINITY;
	}

	const costPerFormula = (AVG_OUTPUT_TOKENS_PER_FORMULA / 1_000_000) * pricing.outputPerMillionCny;
	if (costPerFormula <= 0) {
		return null;
	}

	return 1 / costPerFormula;
}

export function formatFormulasPerYuanHint(provider: LlmProvider, model: string): string {
	const estimate = estimateFormulasPerYuan(provider, model);
	if (estimate === Number.POSITIVE_INFINITY) {
		return "Estimated output per CNY 1: unlimited (local model, electricity cost excluded)";
	}
	if (estimate === null) {
		return "Estimated output per CNY 1: unavailable for current model";
	}

	const rounded = estimate >= 1000 ? Math.round(estimate / 100) * 100 : Math.round(estimate);
	return `Estimated output per CNY 1: about ${rounded} formulas`;
}

export function getAzureDefaultApiVersion(): string {
	return DEFAULT_AZURE_API_VERSION;
}

function findModelPricing(provider: LlmProvider, model: string): ModelPricing | null {
	const metadata = PROVIDER_METADATA[provider];
	const normalizedModel = model.trim().toLowerCase();
	if (!normalizedModel) {
		return metadata.pricing[0] ?? null;
	}

	for (const item of metadata.pricing) {
		if (
			item.modelNames.some((name) => {
				if (name === "*") {
					return true;
				}
				const normalizedName = name.toLowerCase();
				return normalizedModel === normalizedName || normalizedModel.includes(normalizedName);
			})
		) {
			return item;
		}
	}

	return metadata.pricing[0] ?? null;
}