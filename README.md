# SpeakMath (Obsidian Plugin)
<img width="519" height="519" alt="image" src="https://github.com/user-attachments/assets/a3fb85e4-f30d-498b-8178-0f597757a316" />

Use natural language to generate LaTeX formula candidates and insert the selected one at the current cursor.

## Features

- Shortcut `Cmd/Ctrl + Shift + I` to open a small floating input box near the cursor.
- Generate formulas from natural language through LLM APIs.
- Parse markdown output and detect multiple formula candidates automatically.
- Render candidate formulas in markdown and insert on click.
- Show an estimate near the input: "How many formula outputs per CNY 1" for current model.
- Add a one-click "Test connection" button in settings to validate API credentials and endpoint.
- Add a GitHub provider "Login my GitHub account" button to open GitHub web auth/token page.
- Add a GitHub login status indicator with one-click refresh.
- Supported providers:
  - Alibaba Bailian (Qwen)
  - GitHub Copilot (GitHub Models API)
  - DeepSeek
  - Volcengine Ark
  - Zhipu AI
  - MiniMax
  - Kimi (Moonshot)
  - OpenRouter
  - SiliconFlow
  - Azure OpenAI
  - Ollama (local)

## Development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Usage

1. Enable plugin in Obsidian.
2. Open **Settings -> Community plugins -> SpeakMath**.
3. Select provider and fill `API key`, `Base URL`, and `Model`.
4. In a markdown note, place cursor where formula should be inserted.
5. Press `Cmd/Ctrl + Shift + I`, type a natural language request, press `Enter`.
6. Click one candidate to insert into the note.

## Notes

- The plugin uses OpenAI-compatible chat-completions endpoints.
- Azure OpenAI uses deployment endpoints and supports custom `api-version` in settings.
- Ollama can run without API key when using a local server.
- GitHub provider uses official Copilot SDK mode with token authentication.
- API keys are saved in Obsidian plugin data on your local device.
- Prompt customization is kept as an extension point (advanced setting), while v1 focuses on built-in prompt constraints.

## GitHub provider auth

- Select GitHub provider and click `Login my GitHub account` in plugin settings.
- The button opens GitHub web sign-in/token page.
- Use `Refresh status` to check whether API key is configured.
- Paste your GitHub token into API key before calling GitHub provider.

## Recommended model & platform (math + cost + speed)

The recommendations below focus on practical formula generation in Obsidian, balancing quality, speed, and cost.

1. Most balanced default
  - Platform: SiliconFlow or Volcengine Ark
  - Model: DeepSeek-V3 / DeepSeek Chat class model
  - Why: strong math expression quality, usually fast enough, and generally low cost.

2. Lowest cost with acceptable quality
  - Platform: DeepSeek official, SiliconFlow, or OpenRouter (DeepSeek route)
  - Model: DeepSeek chat family
  - Why: best cost efficiency for frequent formula drafting.

3. Highest stability and ecosystem integration
  - Platform: Azure OpenAI
  - Model: gpt-4o-mini (or gpt-4.1-mini deployment)
  - Why: robust service quality and good multilingual understanding, usually at a higher price than DeepSeek routes.

4. Offline / privacy-first
  - Platform: Ollama local
  - Model: qwen2.5 / deepseek-r1 distill class local model
  - Why: no per-token cloud fee and no data leaves local machine (tradeoff: hardware-dependent speed/quality).

Price notice:
- The "CNY 1 estimate" is an approximate output-count indicator based on configured model pricing assumptions.
- Real cost changes with provider pricing updates, prompt length, output length, and cache/billing rules.

## License & Attribution

This project is licensed under the [MIT License](LICENSE).

**Note:** If you use or reference this project, please provide clear attribution to the original source.

