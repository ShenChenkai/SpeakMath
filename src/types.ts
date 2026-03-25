export type LlmProvider =
	| "alibaba-bailian"
	| "github-copilot"
	| "deepseek"
	| "volcengine-ark"
	| "zhipu"
	| "minimax"
	| "moonshot"
	| "openrouter"
	| "siliconflow"
	| "azureopenai"
	| "ollama";

export interface ProviderConfig {
	apiKey: string;
	baseUrl: string;
	model: string;
	apiVersion?: string;
}

export interface LatexPluginSettings {
	provider: LlmProvider;
	providers: Record<LlmProvider, ProviderConfig>;
	temperature: number;
	maxTokens: number;
	promptTemplateOverride: string;
}

export interface LatexCandidate {
	raw: string;
	display: string;
}
