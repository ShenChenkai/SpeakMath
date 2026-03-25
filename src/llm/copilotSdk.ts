import { Platform, requestUrl } from "obsidian";

const CLIENT_ID = "Ov23li5vCskOYu9n6lNu";
const GITHUB_MODELS_BASE_URL = "https://models.inference.ai.azure.com";

const GITHUB_MODEL_ALIASES: Record<string, string> = {
	"claude-haiku-4.5": "anthropic/claude-haiku-4.5",
	"gemini-2.5-pro": "google/gemini-2.5-pro",
	"gemini-3-pro": "google/gemini-3-pro-preview",
	"gpt-4.1": "openai/gpt-4.1",
	"gpt-4o": "openai/gpt-4o",
	"gpt-5-mini": "openai/gpt-5-mini",
	"gpt-5.1": "openai/gpt-5.1",
	"gpt-5.1-codex": "openai/gpt-5.1-codex",
	"gpt-5.1-codex-max": "openai/gpt-5.1-codex-max",
	"gpt-5.1-codex-mini": "openai/gpt-5.1-codex-mini",
	"gpt-5.2": "openai/gpt-5.2",
	"gpt-5.2-codex": "openai/gpt-5.2-codex",
	"gpt-5.4-mini": "openai/gpt-5.4-mini",
	"grok-code-fast-1": "xai/grok-code-fast-1",
	"raptor-mini": "openai/raptor-mini",
};

interface CopilotSdkResult {
	ok: boolean;
	content?: string;
	error?: string;
}

export interface CopilotLoginStatus {
	state: "token-configured" | "token-missing";
	message: string;
}

/**
 * Interface for the GitHub Device Flow response
 */
interface DeviceCodeResponse {
	device_code: string;
	user_code: string;
	verification_uri: string;
	expires_in: number;
	interval: number;
}

/**
 * Interface for the GitHub Access Token response
 */
interface AccessTokenResponse {
	access_token?: string;
	token_type?: string;
	scope?: string;
	error?: string;
	error_description?: string;
}

export async function generateWithCopilotSdk(options: {
	model: string;
	prompt: string;
	githubToken?: string;
}): Promise<CopilotSdkResult> {
	if (!Platform.isDesktopApp) {
		return {
			ok: false,
			error: "GitHub model generation is currently available on Obsidian desktop.",
		};
	}

	const model = options.model.trim() || "openai/gpt-4.1-mini";
	const resolvedModel = resolveGithubModelName(model);
	const token = options.githubToken?.trim();
	if (!token) {
		return {
			ok: false,
			error: "GitHub token is missing. Please login in settings.",
		};
	}

	try {
		const response = await requestUrl({
			url: `${GITHUB_MODELS_BASE_URL}/chat/completions`,
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			contentType: "application/json",
			throw: false,
			body: JSON.stringify({
				model: resolvedModel,
				messages: [{ role: "user", content: options.prompt }],
				temperature: 0.2,
				max_tokens: 800,
			}),
		});

		if (response.status >= 400) {
			const responseText = response.text || "";
			if (
				(response.status === 400 || response.status === 404) &&
				(responseText.toLowerCase().includes("model") || responseText.toLowerCase().includes("deployment"))
			) {
				const available = await fetchGithubAvailableModels(token).catch(() => []);
				if (available.length > 0) {
					const preview = available.slice(0, 8).join(", ");
					return {
						ok: false,
						error: `Selected model is not available for your account. Current: ${model}. Try one of: ${preview}`,
					};
				}
			}
			return {
				ok: false,
				error: `GitHub request failed (${response.status}): ${responseText}`,
			};
		}

		const body = response.json as
			| {
					choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
			  }
			| undefined;

		const first = body?.choices?.[0]?.message?.content;
		if (typeof first === "string" && first.trim().length > 0) {
			return { ok: true, content: first };
		}
		if (Array.isArray(first)) {
			const combined = first
				.filter((item) => item.type === "text" && typeof item.text === "string")
				.map((item) => item.text?.trim() ?? "")
				.filter(Boolean)
				.join("\n");
			if (combined.length > 0) {
				return { ok: true, content: combined };
			}
		}

		return {
			ok: false,
			error: "GitHub model API returned empty content.",
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown GitHub model error";
		return {
			ok: false,
			error: normalizeCopilotSdkError(message),
		};
	}
}

export async function fetchGithubAvailableModels(githubToken: string): Promise<string[]> {
	const token = githubToken.trim();
	if (!token) {
		return [];
	}

	const response = await requestUrl({
		url: `${GITHUB_MODELS_BASE_URL}/models`,
		method: "GET",
		headers: {
			Authorization: `Bearer ${token}`,
		},
		throw: false,
	});

	if (response.status >= 400) {
		return [];
	}

	const models = response.json as Array<{ id?: string }> | { data?: Array<{ id?: string }> } | undefined;
	const raw = Array.isArray(models) ? models : models?.data;
	if (!raw || !Array.isArray(raw)) {
		return [];
	}

	return raw
		.map((item) => item.id?.trim() ?? "")
		.filter(Boolean)
		.sort((a, b) => a.localeCompare(b));
}

/**
 * Starts the GitHub Device Flow login process.
 * Returns the access token if successful.
 */
export async function startCopilotLoginFlow(onCodeReceived: (code: string) => void): Promise<string> {
	if (!Platform.isDesktopApp) {
		throw new Error("GitHub Copilot login is available on desktop only.");
	}

	// Use requestUrl to avoid renderer CORS errors in Obsidian desktop.
	const deviceCodeBody = new URLSearchParams({
		client_id: CLIENT_ID,
		scope: "read:user",
	}).toString();

	const deviceCodeRes = await requestUrl({
		url: "https://github.com/login/device/code",
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Accept: "application/json",
		},
		body: deviceCodeBody,
		throw: false,
	});

	if (deviceCodeRes.status < 200 || deviceCodeRes.status >= 300) {
		throw new Error(`Failed to request device code (HTTP ${deviceCodeRes.status}).`);
	}

	const deviceData = deviceCodeRes.json as DeviceCodeResponse;
	if (!deviceData?.device_code || !deviceData?.user_code || !deviceData?.verification_uri) {
		throw new Error("Invalid response from GitHub device code endpoint.");
	}
	const { device_code, user_code, verification_uri, interval, expires_in } = deviceData;

	// 2. Notify UI with the code (it will be copied to clipboard)
	onCodeReceived(user_code);

	// 3. Open the verification URL
	window.open(verification_uri, "_blank", "noopener,noreferrer");

	// 4. Poll for the access token
	const startTime = Date.now();
	const expiryTime = startTime + expires_in * 1000;

	while (Date.now() < expiryTime) {
		await new Promise((resolve) => setTimeout(resolve, interval * 1000));

		const tokenBody = new URLSearchParams({
			client_id: CLIENT_ID,
			device_code,
			grant_type: "urn:ietf:params:oauth:grant-type:device_code",
		}).toString();

		const tokenRes = await requestUrl({
			url: "https://github.com/login/oauth/access_token",
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Accept: "application/json",
			},
			body: tokenBody,
			throw: false,
		});

		if (tokenRes.status < 200 || tokenRes.status >= 300) {
			continue;
		}

		const tokenData = tokenRes.json as AccessTokenResponse;

		if (tokenData.access_token) {
			return tokenData.access_token;
		}

		if (tokenData.error) {
			if (tokenData.error === "authorization_pending") {
				continue;
			}
			if (tokenData.error === "slow_down") {
				// We should increase interval if needed, but for simplicity we just keep going
				continue;
			}
			if (tokenData.error === "expired_token" || tokenData.error === "access_denied") {
				throw new Error(`Login failed: ${tokenData.error_description || tokenData.error}`);
			}
		}
	}

	throw new Error("Login timed out. Please try again.");
}

export async function getCopilotLoginStatus(hasToken: boolean): Promise<CopilotLoginStatus> {
	if (!hasToken) {
		return {
			state: "token-missing",
			message: "Logged out",
		};
	}

	return {
		state: "token-configured",
		message: "Logged in",
	};
}

function normalizeCopilotSdkError(message: string): string {
	const lower = message.toLowerCase();
	if (lower.includes("unauthorized") || lower.includes("401") || lower.includes("403")) {
		return "GitHub authentication failed. Please login again and ensure your account has access.";
	}
	if (lower.includes("token") && (lower.includes("invalid") || lower.includes("expired"))) {
		return "GitHub token is invalid or expired. Please generate a new token and update API key.";
	}
	if (lower.includes("streammessagereader") || lower.includes("copilot cli")) {
		return "CLI/SKD runtime is disabled. Plugin now uses pure HTTP GitHub API. Please reload Obsidian and retry.";
	}
	return message;
}

function resolveGithubModelName(model: string): string {
	const normalized = model.trim().toLowerCase();
	return GITHUB_MODEL_ALIASES[normalized] ?? model.trim();
}