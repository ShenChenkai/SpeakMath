import { Component, MarkdownRenderer, Notice, type Editor, type MarkdownView, type Plugin } from "obsidian";
import { LlmClient } from "../llm/client";
import { parseLatexCandidates } from "../llm/parser";
import type { LatexCandidate, LatexPluginSettings } from "../types";
import { formatFormulasPerYuanHint } from "../providers";
import { resolvePluginBasePath } from "../utils/runtimePath";

interface FormulaPopoverOptions {
	plugin: Plugin;
	settings: LatexPluginSettings;
	onInsert: (formula: string) => void;
	onClose: () => void;
}

export class FormulaPopover {
	private readonly plugin: Plugin;
	private readonly settings: LatexPluginSettings;
	private readonly onInsert: (formula: string) => void;
	private readonly onClose: () => void;
	private containerEl: HTMLDivElement | null = null;
	private inputEl: HTMLTextAreaElement | null = null;
	private resultsEl: HTMLDivElement | null = null;
	private disposeKeydown: (() => void) | null = null;
	private rendererComponent: Component | null = null;
	private loading = false;

	constructor(options: FormulaPopoverOptions) {
		this.plugin = options.plugin;
		this.settings = options.settings;
		this.onInsert = options.onInsert;
		this.onClose = options.onClose;
	}

	open(view: MarkdownView, editor: Editor): void {
		this.close();
		this.containerEl = this.buildContainer();
		document.body.appendChild(this.containerEl);
		this.rendererComponent = new Component();
		this.rendererComponent.load();
		this.positionNearCursor(view, editor);
		this.inputEl?.focus();
		this.inputEl?.setSelectionRange(this.inputEl.value.length, this.inputEl.value.length);
		this.registerGlobalKeydown();
	}

	close(): void {
		if (this.disposeKeydown) {
			this.disposeKeydown();
			this.disposeKeydown = null;
		}
		if (this.containerEl) {
			this.containerEl.remove();
			this.containerEl = null;
		}
		if (this.rendererComponent) {
			this.rendererComponent.unload();
			this.rendererComponent = null;
		}
		this.inputEl = null;
		this.resultsEl = null;
		this.loading = false;
		this.onClose();
	}

	private buildContainer(): HTMLDivElement {
		const container = document.createElement("div");
		container.className = "latex-llm-popover";

		const title = document.createElement("div");
		title.className = "latex-llm-title";
		title.textContent = "Describe a formula";
		container.appendChild(title);

		this.inputEl = document.createElement("textarea");
		this.inputEl.className = "latex-llm-input";
		this.inputEl.placeholder = "Example: quadratic formula with discriminant";
		this.inputEl.rows = 2;
		this.inputEl.addEventListener("keydown", (event) => {
			if (event.key === "Enter" && !event.shiftKey) {
				event.preventDefault();
				void this.submit();
			}
		});
		container.appendChild(this.inputEl);

		const hint = document.createElement("div");
		hint.className = "latex-llm-hint";
		hint.textContent = "Press Enter to generate, Shift+Enter for newline, Esc to close";
		container.appendChild(hint);

		const provider = this.settings.provider;
		const model = this.settings.providers[provider].model;
		const priceHint = document.createElement("div");
		priceHint.className = "latex-llm-price-hint";
		priceHint.textContent = formatFormulasPerYuanHint(provider, model);
		container.appendChild(priceHint);

		this.resultsEl = document.createElement("div");
		this.resultsEl.className = "latex-llm-results";
		container.appendChild(this.resultsEl);

		return container;
	}

	private positionNearCursor(view: MarkdownView, editor: Editor): void {
		if (!this.containerEl) {
			return;
		}

		const fallbackLeft = Math.max(12, Math.min(window.innerWidth - 420, window.innerWidth / 2 - 200));
		const fallbackTop = Math.max(12, Math.min(window.innerHeight - 340, window.innerHeight / 2 - 140));

		let left = fallbackLeft;
		let top = fallbackTop;

		const offset = editor.posToOffset(editor.getCursor());
		const cm = (view.editor as unknown as { cm?: { coordsAtPos?: (value: number) => DOMRect | null } }).cm;
		const coords = cm?.coordsAtPos?.(offset);
		if (coords) {
			left = Math.max(12, Math.min(window.innerWidth - 420, coords.left));
			top = Math.max(12, Math.min(window.innerHeight - 340, coords.bottom + 8));
		}

		this.containerEl.style.left = `${left}px`;
		this.containerEl.style.top = `${top}px`;
	}

	private registerGlobalKeydown(): void {
		const listener = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				this.close();
			}
		};
		document.addEventListener("keydown", listener, true);
		this.disposeKeydown = () => document.removeEventListener("keydown", listener, true);
	}

	private async submit(): Promise<void> {
		if (this.loading || !this.inputEl || !this.resultsEl) {
			return;
		}

		const query = this.inputEl.value.trim();
		if (!query) {
			new Notice("Please describe the formula first.");
			return;
		}

		this.loading = true;
		this.resultsEl.empty();
		const loadingEl = this.resultsEl.createDiv({ cls: "latex-llm-loading" });
		loadingEl.setText("Generating formulas...");

		try {
			const client = new LlmClient(this.settings, resolvePluginBasePath(this.plugin));
			const response = await client.generateFormulaCandidates(query);
			const candidates = parseLatexCandidates(response);
			this.renderCandidates(candidates);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			console.error("SpeakMath formula generation failed", error);
			new Notice(`Formula generation failed: ${this.toUserFriendlyError(message)}`, 7000);
			this.resultsEl.empty();
		} finally {
			this.loading = false;
		}
	}

	private toUserFriendlyError(message: string): string {
		if (message.includes("Copilot runtime not found") || message.includes("Copilot CLI runtime")) {
			return "Copilot runtime not found in active vault plugin folder. Rebuild plugin and reload Obsidian.";
		}
		return message.length > 180 ? `${message.slice(0, 180)}...` : message;
	}

	private renderCandidates(candidates: LatexCandidate[]): void {
		if (!this.resultsEl) {
			return;
		}
		this.resultsEl.empty();

		if (candidates.length === 0) {
			const emptyEl = this.resultsEl.createDiv({ cls: "latex-llm-empty" });
			emptyEl.setText("No formula candidates found.");
			return;
		}

		for (const candidate of candidates) {
			const itemEl = this.resultsEl.createDiv({ cls: "latex-llm-item" });
			itemEl.setAttr("role", "button");
			itemEl.tabIndex = 0;
			if (this.rendererComponent) {
				void MarkdownRenderer.render(this.plugin.app, candidate.display, itemEl, "", this.rendererComponent);
			}
			itemEl.addEventListener("click", () => {
				this.onInsert(candidate.raw);
				this.close();
			});
			itemEl.addEventListener("keydown", (event) => {
				if (event.key === "Enter") {
					event.preventDefault();
					this.onInsert(candidate.raw);
					this.close();
				}
			});
		}
	}
}
