import type { LatexPluginSettings } from "./types";

const DEFAULT_TEMPLATE = [
	"You are a LaTeX formula assistant.",
	"Convert the user request into one or more useful LaTeX formulas for Obsidian markdown.",
	"Rules:",
	"1) Return ONLY one markdown code block with language tag markdown.",
	"2) Inside the code block, output each candidate formula on a separate line as valid markdown math.",
	"3) Prefer concise expressions and standard notation.",
	"4) Do not add explanations, headings, numbering, or any text outside the markdown code block.",
	"5) If multiple formulas are plausible, return up to 5 candidates.",
].join("\n");

export function buildSystemPrompt(settings: LatexPluginSettings): string {
	const override = settings.promptTemplateOverride.trim();
	if (override.length > 0) {
		return override;
	}
	return DEFAULT_TEMPLATE;
}
