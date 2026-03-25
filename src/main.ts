import { Editor, MarkdownView, Notice, Plugin } from "obsidian";
import { FormulaPopover } from "./ui/formulaPopover";
import { DEFAULT_SETTINGS, SpeakMathSettingTab } from "./settings";
import type { LatexPluginSettings } from "./types";

export default class SpeakMathPlugin extends Plugin {
	settings: LatexPluginSettings;
	private activePopover: FormulaPopover | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addCommand({
			id: "speakmath-quick-insert",
			name: "Quick insert LaTeX formula",
			// eslint-disable-next-line obsidianmd/commands/no-default-hotkeys
			hotkeys: [{ modifiers: ["Mod", "Shift"], key: "i" }],
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.openFormulaPopover(editor, view);
			},
		});

		this.addSettingTab(new SpeakMathSettingTab(this.app, this));
	}

	onunload(): void {
		this.activePopover?.close();
		this.activePopover = null;
	}

	async loadSettings(): Promise<void> {
		const savedData = (await this.loadData()) as Partial<LatexPluginSettings> | null;
		this.settings = {
			...DEFAULT_SETTINGS,
			...savedData,
			providers: {
				...DEFAULT_SETTINGS.providers,
				...(savedData?.providers ?? {}),
			},
		};
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private openFormulaPopover(editor: Editor, view: MarkdownView): void {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			new Notice("Open a Markdown note first.");
			return;
		}

		const insertPosition = editor.getCursor();
		this.activePopover?.close();
		this.activePopover = new FormulaPopover({
			plugin: this,
			settings: this.settings,
			onInsert: (formula: string) => {
				editor.replaceRange(formula, insertPosition);
			},
			onClose: () => {
				this.activePopover = null;
			},
		});
		this.activePopover.open(view, editor);
	}
}
