# Obsidian AI LLM Plugin

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/Sparky4567/obsidian_ai_plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/K3K06VU8Z)

A fast, lightweight, zero-dependency local LLM plugin for **Obsidian** (Desktop & Mobile). Connect seamlessly to your local or self-hosted [Ollama](https://ollama.com) instance and interact with models directly inside your notes and via a modern sidebar chat panel.

---

## ✨ Features

- 📱 **100% Cross-Platform (Desktop & Mobile)**: Built with native fetch APIs and standard Obsidian storage APIs. No node `fs` dependencies, fixing all mobile `data.json` loading errors.
- 💬 **Modern & Compact Sidebar Chat View**: Sleek, responsive panel with live streaming, real-time status indicators, auto-scroll, stop generation button, and message history.
- ⚡ **High Performance & Zero Heavy Dependencies**: Lightweight bundle that loads instantly without third-party node packages.
- 🛠️ **Editor Shortcuts & Commands**:
  - `Ask LLM with selected text`
  - `Summarize selected text`
  - `Continue my story and enhance text`
  - `Make a story from my text`
  - `Fix grammar & improve writing`
  - `Explain selected text`
- 🚀 **Quick Prompt Chips**: Instant quick actions (`✨ Summarize`, `📝 Story`, `💡 Brainstorm`, `🔧 Fix Grammar`, `❓ Explain`) built into the sidebar chat interface.
- ⚙️ **Configurable System Prompts & Endpoints**: Easily switch models, customize default system roles, and test server connection right from plugin settings.

---

## 🚀 Getting Started

### 1. Prerequisites (Install Ollama)
Ensure you have [Ollama](https://ollama.com) installed and running.

```bash
# Pull a model (e.g. tinyllama, llama3:8b, mistral, qwen, etc.)
ollama run tinyllama
```

> **Mobile Usage Tip**: To use this plugin on Obsidian Mobile (iOS/Android), host Ollama on your local network (e.g. `http://192.168.1.X:11434`) or set `OLLAMA_HOST=0.0.0.0` so your mobile device can reach your PC/server.

---

### 2. Plugin Installation

#### Option A: Manual Installation
1. Clone or download this repository into your vault's plugin directory:
   ```bash
   cd /path/to/your/vault/.obsidian/plugins/
   git clone https://github.com/Sparky4567/obsidian_ai_plugin.git ai_llm
   cd ai_llm
   npm install
   npm run build
   ```
2. Open **Obsidian Settings** -> **Community Plugins**.
3. Reload plugins and enable **AI LLM**.

#### Option B: Release Zip
1. Download `main.js`, `manifest.json`, and `styles.css` from the latest GitHub Release.
2. Place them inside `.obsidian/plugins/ai_llm/` in your vault.
3. Enable the plugin in Obsidian Community Plugins.

---

## 🎯 Usage & Workflows

### 💬 Sidebar Chat View
1. Click the **bot ribbon icon** on the left sidebar (or run command `Open AI Chat Panel`).
2. Type your question or prompt in the compact input field at the bottom.
3. Use the quick prompt action chips above the input box for fast formatting.
4. Click **Send** (or press `Enter`). To stop streaming anytime, click **Stop**.

### 📝 Editor Commands (In-Note Generation)
1. Highlight any text inside your active note.
2. Open the Command Palette (`Ctrl+P` or `Cmd+P`).
3. Search for any AI LLM command:
   - `Ask LLM with selected text`
   - `Summarize selected text`
   - `Fix grammar & improve writing`
   - `Explain selected text`
4. The generated response will stream directly under or in place of your selection.

---

## ⚙️ Configuration

Go to **Obsidian Settings** -> **AI LLM Settings**:

- **Ollama Endpoint**: Set your Ollama server URL (Default: `http://127.0.0.1:11434`). Click **Test Connection** to verify availability.
- **LLM Model**: Select from automatically discovered models on your Ollama server.
- **Default System Role**: Customize the system persona (e.g., *"You are a helpful assistant providing concise answers"*).

---

## 🛠️ Building & Development

```bash
# Install development dependencies
npm install

# Build production bundle
npm run build

# Watch mode for live dev edits
npm run dev
```

---

## 📄 License & Support

Distributed under the MIT License. See `LICENSE` for details.

Developed with ❤️ by **Sparky4567**.
- Website: [artefaktas.eu](https://artefaktas.eu)
- Support on Ko-fi: [ko-fi.com/artefaktas](https://ko-fi.com/artefaktas)
