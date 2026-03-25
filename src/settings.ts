import { App, PluginSettingTab, Setting } from "obsidian";
import SpeakMathPlugin from "./main";
import type { LatexPluginSettings, LlmProvider } from "./types";

export const DEFAULT_SETTINGS: LatexPluginSettings = {
	provider: "alibaba-bailian",
	providers: {
		"alibaba-bailian": {
			apiKey: "",
			baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
			model: "qwen-plus",
		},
		"github-copilot": {
			apiKey: "",
			baseUrl: "https://models.github.ai/inference",
			model: "openai/gpt-4.1-mini",
		},
		deepseek: {
			apiKey: "",
			baseUrl: "https://api.deepseek.com/v1",
			model: "deepseek-chat",
		},
	},
	temperature: 0.2,
	maxTokens: 400,
	promptTemplateOverride: "",
};

const PROVIDER_OPTIONS: Record<LlmProvider, string> = {
	"alibaba-bailian": "Alibaba Bailian (Qwen)",
	"github-copilot": "GitHub Copilot (GitHub Models)",
	deepseek: "DeepSeek",
};

export class SpeakMathSettingTab extends PluginSettingTab {
	plugin: SpeakMathPlugin;

	constructor(app: App, plugin: SpeakMathPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName("Configuration").setHeading();

		new Setting(containerEl)
			.setName("Active provider")
			.setDesc("Select which API is used for formula generation.")
			.addDropdown((dropdown) => {
				for (const [key, label] of Object.entries(PROVIDER_OPTIONS)) {
					dropdown.addOption(key, label);
				}
				dropdown.setValue(this.plugin.settings.provider);
				dropdown.onChange(async (value: LlmProvider) => {
					this.plugin.settings.provider = value;
					await this.plugin.saveSettings();
					this.display();
				});
			});

		const provider = this.plugin.settings.provider;
		const config = this.plugin.settings.providers[provider];

		new Setting(containerEl).setName(`${PROVIDER_OPTIONS[provider]} config`).setHeading();

		new Setting(containerEl)
			.setName("API key")
			.setDesc("Stored locally in Obsidian plugin data.")
			.addText((text) =>
				text
					.setPlaceholder("Enter API key")
					.setValue(config.apiKey)
					.onChange(async (value) => {
						config.apiKey = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Base URL")
			.setDesc("Openai-compatible endpoint root. Do not include /chat/completions.")
			.addText((text) =>
				text
					.setPlaceholder("https://api.example.com/v1")
					.setValue(config.baseUrl)
					.onChange(async (value) => {
						config.baseUrl = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Model")
			.setDesc("Model name for the selected provider.")
			.addText((text) =>
				text
					.setPlaceholder("Model name")
					.setValue(config.model)
					.onChange(async (value) => {
						config.model = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Temperature")
			.setDesc("Lower values are more deterministic.")
			.addSlider((slider) =>
				slider
					.setLimits(0, 1, 0.05)
					.setValue(this.plugin.settings.temperature)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.temperature = Number(value.toFixed(2));
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Max tokens")
			.setDesc("Upper token limit for each generation request.")
			.addText((text) =>
				text
					.setPlaceholder("400")
					.setValue(String(this.plugin.settings.maxTokens))
					.onChange(async (value) => {
						const parsed = Number.parseInt(value, 10);
						if (!Number.isNaN(parsed) && parsed > 0) {
							this.plugin.settings.maxTokens = parsed;
							await this.plugin.saveSettings();
						}
					}),
			);

		new Setting(containerEl)
			.setName("Advanced: prompt override")
			.setDesc("Optional extension point for custom system prompt in a future version.")
			.addTextArea((text) =>
				text
					.setPlaceholder("Leave empty to use built-in prompt")
					.setValue(this.plugin.settings.promptTemplateOverride)
					.onChange(async (value) => {
						this.plugin.settings.promptTemplateOverride = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
