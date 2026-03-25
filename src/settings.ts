/**
 * SpeakMath - MIT License
 * Copyright (c) 2024-2025 chenkai
 * Please attribute the source when using this project.
 */

import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import SpeakMathPlugin from "./main";
import type { LatexPluginSettings, LlmProvider } from "./types";
import {
	createDefaultProviderConfigs,
	getAzureDefaultApiVersion,
	getProviderAuthHint,
	getProviderLabel,
	getProviderModelOptionItems,
	PROVIDER_METADATA,
	providerNeedsApiKey,
} from "./providers";
import { LlmClient } from "./llm/client";
import { getCopilotLoginStatus, startCopilotLoginFlow } from "./llm/copilotSdk";
import { resolvePluginBasePath } from "./utils/runtimePath";

export const DEFAULT_SETTINGS: LatexPluginSettings = {
	provider: "alibaba-bailian",
	providers: createDefaultProviderConfigs(),
	temperature: 0.2,
	maxTokens: 400,
	promptTemplateOverride: "",
};

export class SpeakMathSettingTab extends PluginSettingTab {
	plugin: SpeakMathPlugin;

	constructor(app: App, plugin: SpeakMathPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private getProviderOptions(): Array<[LlmProvider, string]> {
		return (Object.keys(PROVIDER_METADATA) as LlmProvider[]).map((provider) => [
			provider,
			getProviderLabel(provider),
		]);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName("Configuration").setHeading();

		new Setting(containerEl)
			.setName("Active provider")
			.setDesc("Select which API is used for formula generation.")
			.addDropdown((dropdown) => {
				for (const [key, label] of this.getProviderOptions()) {
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
		const providerLabel = getProviderLabel(provider);
		const requiresApiKey = providerNeedsApiKey(provider);
		const authHint = getProviderAuthHint(provider);

		new Setting(containerEl).setName(`${providerLabel} config`).setHeading();

		if (authHint) {
			new Setting(containerEl).setName("Auth hint").setDesc(authHint);
		}

		if (provider === "github-copilot") {
			let latestVerificationCode = "";
			const copyVerificationCode = async () => {
				if (!latestVerificationCode) {
					new Notice("No verification code available yet.", 4000);
					return;
				}
				try {
					await navigator.clipboard.writeText(latestVerificationCode);
					new Notice("Verification code copied.", 3000);
				} catch {
					new Notice("Could not copy code automatically. Please copy it manually.", 7000);
				}
			};

			const statusSetting = new Setting(containerEl)
				.setName("GitHub login status")
				.setDesc("Checking...")
				.addButton((button) =>
					button.setButtonText("Refresh status").onClick(async () => {
						button.setDisabled(true);
						button.setButtonText("Refreshing...");
						try {
							const status = await getCopilotLoginStatus(Boolean(config.apiKey.trim()));
							statusSetting.setDesc(`${status.state}: ${status.message}`);
						} finally {
							button.setDisabled(false);
							button.setButtonText("Refresh status");
						}
					}),
				);

			void getCopilotLoginStatus(Boolean(config.apiKey.trim())).then((status) => {
				statusSetting.setDesc(`${status.state}: ${status.message}`);
			});

			const loginGuideSetting = new Setting(containerEl).setName("Login steps");
			const renderLoginGuide = (code?: string, state?: "waiting" | "done") => {
				if (code) {
					latestVerificationCode = code;
				}
				loginGuideSetting.descEl.empty();
				loginGuideSetting.descEl.createEl("p", {
					text: "1) Click 'Login my GitHub account'.",
				});
				loginGuideSetting.descEl.createEl("p", {
					text: "2) Browser opens GitHub device login page.",
				});
				loginGuideSetting.descEl.createEl("p", {
					text: "3) Enter the verification code shown below and approve.",
				});
				if (code) {
					loginGuideSetting.descEl.createEl("p", {
						text: `Verification code: ${code}`,
					});
					const copyBtn = loginGuideSetting.descEl.createEl("button", {
						text: "Copy verification code",
					});
					copyBtn.addClass("mod-cta");
					copyBtn.style.marginTop = "4px";
					copyBtn.onclick = () => {
						void copyVerificationCode();
					};
					loginGuideSetting.descEl.createEl("p", {
						text: "Code is auto-copied and you can also click the button above.",
					});
				}
				if (state === "waiting") {
					loginGuideSetting.descEl.createEl("p", {
						text: "Waiting for GitHub authorization...",
					});
				}
				if (state === "done") {
					loginGuideSetting.descEl.createEl("p", {
						text: "Authorization completed. You can use GitHub Copilot now.",
					});
				}
			};

			renderLoginGuide();

			new Setting(containerEl)
				.setName("GitHub account login")
				.setDesc("Zero-config web authentication via GitHub.")
				.addButton((button) =>
					button.setButtonText("Login my GitHub account").onClick(async () => {
						button.setDisabled(true);
						button.setButtonText("Waiting for GitHub...");
						renderLoginGuide(undefined, "waiting");

						try {
							const token = await startCopilotLoginFlow((code) => {
								new Notice(`Confirmation code: ${code}. Copied to clipboard!`, 10000);
								renderLoginGuide(code, "waiting");
								latestVerificationCode = code;
								void copyVerificationCode();
							});

							config.apiKey = token;
							await this.plugin.saveSettings();
							new Notice("Successfully logged into GitHub Copilot!");
							renderLoginGuide(undefined, "done");
							this.display(); // Refresh UI to show login status and token
						} catch (error) {
							const msg = error instanceof Error ? error.message : String(error);
							new Notice(`GitHub login failed: ${msg}`);
							renderLoginGuide();
							button.setDisabled(false);
							button.setButtonText("Login my GitHub account");
						}
					}),
				);
		}

		new Setting(containerEl)
			.setName("API key")
			.setDesc(
				requiresApiKey
					? provider === "github-copilot"
						? "Required for GitHub provider in no-CLI-auth mode."
						: "Stored locally in Obsidian plugin data."
					: "Optional for local/self-hosted providers.",
			)
			.addText((text) =>
				text
					.setPlaceholder("Enter API key")
					.setValue(config.apiKey)
					.onChange(async (value) => {
						config.apiKey = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		if (provider === "azureopenai") {
			new Setting(containerEl)
				.setName("Azure API version")
				.setDesc("Required by Azure OpenAI endpoints.")
				.addText((text) =>
					text
						.setPlaceholder(getAzureDefaultApiVersion())
						.setValue(config.apiVersion ?? getAzureDefaultApiVersion())
						.onChange(async (value) => {
							config.apiVersion = value.trim() || getAzureDefaultApiVersion();
							await this.plugin.saveSettings();
						}),
				);
		}

		if (provider !== "github-copilot") {
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
		}

		new Setting(containerEl)
			.setName("Model")
			.setDesc(
				provider === "github-copilot"
					? "Select a Copilot model."
					: "Select a model for the selected provider.",
			)
			.addDropdown((dropdown) => {
				const options = getProviderModelOptionItems(provider);
				const current = config.model;
				const hasCurrent = options.some((option) => option.value === current);
				const mergedOptions = hasCurrent
					? options
					: [{ value: current, label: `Custom: ${current}` }, ...options];

				for (const option of mergedOptions) {
					dropdown.addOption(option.value, option.label);
				}

				dropdown.setValue(current);
				dropdown.onChange(async (value) => {
					config.model = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Connection test")
			.setDesc("Send a tiny test request using current provider settings.")
			.addButton((button) =>
				button.setButtonText("Test connection").onClick(async () => {
					button.setDisabled(true);
					button.setButtonText("Testing...");
					try {
						const client = new LlmClient(this.plugin.settings, resolvePluginBasePath(this.plugin));
						const result = await client.testConnection();
						if (result.ok) {
							new Notice(`${providerLabel}: ${result.message}`);
						} else {
							new Notice(`${providerLabel}: ${result.message}`, 8000);
						}
					} finally {
						button.setDisabled(false);
						button.setButtonText("Test connection");
					}
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
