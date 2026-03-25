import type { Plugin } from "obsidian";
import { join } from "node:path";

interface MaybeFsAdapter {
	getBasePath?: () => string;
	basePath?: string;
}

export function resolvePluginBasePath(plugin: Plugin): string | null {
	const adapter = plugin.app.vault.adapter as unknown as MaybeFsAdapter;
	const basePath = adapter.getBasePath?.() ?? adapter.basePath;
	if (!basePath) {
		return null;
	}

	return join(basePath, plugin.app.vault.configDir, "plugins", plugin.manifest.id);
}
