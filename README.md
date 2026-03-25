# SpeakMath (Obsidian Plugin)

Use natural language to generate LaTeX formula candidates and insert the selected one at the current cursor.

## Features

- Shortcut `Cmd/Ctrl + Shift + I` to open a small floating input box near the cursor.
- Generate formulas from natural language through LLM APIs.
- Parse markdown output and detect multiple formula candidates automatically.
- Render candidate formulas in markdown and insert on click.
- Supported providers in v1:
  - Alibaba Bailian (Qwen)
  - GitHub Copilot (GitHub Models API)
  - DeepSeek

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
- API keys are saved in Obsidian plugin data on your local device.
- Prompt customization is kept as an extension point (advanced setting), while v1 focuses on built-in prompt constraints.
