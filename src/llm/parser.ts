import type { LatexCandidate } from "../types";

const BLOCK_MATH_REGEX = /\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]/g;
const INLINE_MATH_REGEX = /\$(?!\$)[^\n$]+\$|\\\([^\n]+?\\\)/g;

export function parseLatexCandidates(rawResponse: string): LatexCandidate[] {
	const markdownBlocks = [...rawResponse.matchAll(/```markdown\s*([\s\S]*?)```/gi)].map(
		(match) => (match[1] ?? "").trim(),
	);

	const source = markdownBlocks.length > 0 ? markdownBlocks.join("\n") : rawResponse;
	const candidates: string[] = [];

	collectWithRegex(source, BLOCK_MATH_REGEX, candidates);
	collectWithRegex(source, INLINE_MATH_REGEX, candidates);

	if (candidates.length === 0) {
		source
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean)
			.slice(0, 5)
			.forEach((line) => candidates.push(line));
	}

	const unique = new Set<string>();
	return candidates
		.map((item) => normalizeMath(item))
		.filter((item) => {
			if (item.length === 0 || unique.has(item)) {
				return false;
			}
			unique.add(item);
			return true;
		})
		.slice(0, 5)
		.map((item) => ({ raw: item, display: item }));
}

function collectWithRegex(source: string, regex: RegExp, output: string[]): void {
	for (const match of source.matchAll(regex)) {
		const text = match[0]?.trim();
		if (text) {
			output.push(text);
		}
	}
}

function normalizeMath(value: string): string {
	return value.replace(/^[-*\d.)\s]+/, "").trim();
}
