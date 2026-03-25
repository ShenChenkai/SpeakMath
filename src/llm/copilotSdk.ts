import { Platform, requestUrl } from "obsidian";

const CLIENT_ID = "Ov23li5vCskOYu9n6lNu";
const GITHUB_MODELS_BASE_URL = "https://models.inference.ai.azure.com";

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
				model,
				messages: [{ role: "user", content: options.prompt }],
				temperature: 0.2,
				max_tokens: 800,
			}),
		});

		if (response.status >= 400) {
			return {
				ok: false,
				error: `GitHub request failed (${response.status}): ${response.text}`,
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