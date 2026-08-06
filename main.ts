import {
	App,
	Editor,
	ItemView,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	WorkspaceLeaf,
	requestUrl,
	setIcon,
} from "obsidian";

export interface LlmSettings {
	ollama_endpoint: string;
	model: string;
	botRole: string;
}

export const DEFAULT_SETTINGS: LlmSettings = {
	ollama_endpoint: "http://127.0.0.1:11434",
	model: "tinyllama",
	botRole: "You are a helpful assistant providing concise, accurate answers.",
};

export const VIEW_TYPE_LLM_CHAT = "obsidian-ai-llm-chat";

/**
 * Service for communicating with local Ollama API directly over HTTP/HTTPS.
 * Zero node dependencies, 100% cross-platform (Desktop + Mobile).
 */
export class OllamaService {
	static normalizeUrl(endpoint: string): string {
		let ep = (endpoint || "http://127.0.0.1:11434").trim();
		if (!ep.startsWith("http://") && !ep.startsWith("https://")) {
			ep = "http://" + ep;
		}
		try {
			const url = new URL(ep);
			if (!url.port && url.protocol === "http:" && !ep.includes(":11434")) {
				url.port = "11434";
			}
			return url.origin.replace(/\/+$/, "");
		} catch {
			return ep.replace(/\/+$/, "");
		}
	}

	static async checkConnection(endpoint: string): Promise<boolean> {
		const baseUrl = this.normalizeUrl(endpoint);
		try {
			const res = await requestUrl({
				url: `${baseUrl}/api/tags`,
				method: "GET",
			});
			return res.status === 200;
		} catch {
			return false;
		}
	}

	static async getModels(endpoint: string): Promise<string[]> {
		const baseUrl = this.normalizeUrl(endpoint);
		try {
			const res = await requestUrl({
				url: `${baseUrl}/api/tags`,
				method: "GET",
			});
			if (res.status === 200 && res.json && Array.isArray(res.json.models)) {
				return res.json.models.map((m: any) => m.name);
			}
		} catch (e) {
			console.error("Failed to fetch Ollama models:", e);
		}
		return [];
	}

	static async streamGenerate(
		endpoint: string,
		params: { model: string; prompt: string; system?: string },
		onChunk: (chunk: string) => void,
		signal?: AbortSignal
	): Promise<string> {
		const baseUrl = this.normalizeUrl(endpoint);
		const url = `${baseUrl}/api/generate`;

		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: params.model,
				prompt: params.prompt,
				system: params.system || undefined,
				stream: true,
			}),
			signal,
		});

		if (!response.ok) {
			throw new Error(`Ollama HTTP Error ${response.status}: ${response.statusText}`);
		}

		if (!response.body) {
			throw new Error("No response stream received from Ollama server");
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let fullText = "";
		let buffer = "";

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed) continue;
				try {
					const parsed = JSON.parse(trimmed);
					if (parsed.response) {
						fullText += parsed.response;
						onChunk(parsed.response);
					}
				} catch {
					// Ignore line parse error for chunk
				}
			}
		}

		if (buffer.trim()) {
			try {
				const parsed = JSON.parse(buffer.trim());
				if (parsed.response) {
					fullText += parsed.response;
					onChunk(parsed.response);
				}
			} catch {}
		}

		return fullText;
	}
}

/**
 * Modernistic & Compact Sidebar Chat View
 */
export class LlmChatView extends ItemView {
	plugin: LlmPlugin;
	private logContainer: HTMLElement;
	private inputField: HTMLTextAreaElement;
	private systemInput: HTMLInputElement;
	private sendBtn: HTMLButtonElement;
	private stopBtn: HTMLButtonElement;
	private statusIndicator: HTMLElement;
	private modelBadge: HTMLElement;
	private currentAbortController: AbortController | null = null;
	private messages: Array<{ role: "user" | "assistant" | "error"; text: string }> = [];

	constructor(leaf: WorkspaceLeaf, plugin: LlmPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_LLM_CHAT;
	}

	getDisplayText(): string {
		return "AI Assistant";
	}

	getIcon(): string {
		return "bot";
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass("ai-chat-view-container");

		// 1. Header
		const header = container.createEl("div", { cls: "ai-chat-header" });
		const titleEl = header.createEl("div", { cls: "ai-chat-header-title" });
		this.statusIndicator = titleEl.createEl("span", {
			cls: "ai-status-indicator ai-status-checking",
		});
		titleEl.createSpan({ text: "AI Assistant" });

		const headerActions = header.createEl("div", { cls: "ai-chat-header-actions" });
		this.modelBadge = headerActions.createEl("span", {
			cls: "ai-chat-badge",
			text: this.plugin.settings.model || "no model",
		});

		const refreshBtn = headerActions.createEl("button", {
			cls: "ai-btn-icon",
			title: "Check connection & refresh models",
		});
		setIcon(refreshBtn, "refresh-cw");
		refreshBtn.addEventListener("click", () => this.checkStatus());

		// 2. System Role Input
		const systemBar = container.createEl("div", { cls: "ai-chat-system-bar" });
		systemBar.createEl("label", { text: "System Prompt / Role:" });
		this.systemInput = systemBar.createEl("input", {
			cls: "ai-chat-system-input",
			placeholder: "System role...",
			value: this.plugin.settings.botRole,
		});
		this.systemInput.addEventListener("change", async (e) => {
			const target = e.target as HTMLInputElement;
			this.plugin.settings.botRole = target.value;
			await this.plugin.saveSettings();
		});

		// 3. Message Log
		this.logContainer = container.createEl("div", { cls: "ai-chat-log" });
		this.renderEmptyState();

		// 4. Quick Action Chips
		const chipsContainer = container.createEl("div", { cls: "ai-chat-chips" });
		const quickPrompts = [
			{ label: "✨ Summarize", prompt: "Summarize the key points concisely:" },
			{ label: "📝 Story", prompt: "Write a creative story based on:" },
			{ label: "💡 Brainstorm", prompt: "Brainstorm 5 creative ideas for:" },
			{ label: "🔧 Fix Grammar", prompt: "Fix grammar and improve flow:" },
			{ label: "❓ Explain", prompt: "Explain this clearly and simply:" },
		];

		quickPrompts.forEach((chip) => {
			const chipBtn = chipsContainer.createEl("button", {
				cls: "ai-chip-btn",
				text: chip.label,
			});
			chipBtn.addEventListener("click", () => {
				const currentText = this.inputField.value.trim();
				this.inputField.value = currentText
					? `${chip.prompt}\n${currentText}`
					: chip.prompt;
				this.inputField.focus();
			});
		});

		// 5. Input Area
		const inputWrapper = container.createEl("div", { cls: "ai-chat-input-wrapper" });
		this.inputField = inputWrapper.createEl("textarea", {
			cls: "ai-chat-textarea",
			placeholder: "Ask local LLM... (Enter to send, Shift+Enter for newline)",
		});

		this.inputField.addEventListener("keydown", (e: KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				this.handleSend();
			}
		});

		const controls = inputWrapper.createEl("div", { cls: "ai-chat-controls" });
		const leftControls = controls.createEl("div", { cls: "ai-chat-controls-left" });
		const clearBtn = leftControls.createEl("button", {
			cls: "ai-btn ai-btn-secondary",
			text: "Clear",
		});
		clearBtn.addEventListener("click", () => this.clearChat());

		const rightControls = controls.createEl("div", { cls: "ai-chat-controls-right" });
		this.stopBtn = rightControls.createEl("button", {
			cls: "ai-btn ai-btn-danger",
			text: "Stop",
		});
		this.stopBtn.style.display = "none";
		this.stopBtn.addEventListener("click", () => this.handleStop());

		this.sendBtn = rightControls.createEl("button", {
			cls: "ai-btn ai-btn-primary",
			text: "Send",
		});
		this.sendBtn.addEventListener("click", () => this.handleSend());

		// Check connection status in background
		this.checkStatus();
	}

	async updateModelBadge(): Promise<void> {
		if (this.modelBadge) {
			this.modelBadge.setText(this.plugin.settings.model || "no model");
		}
	}

	async checkStatus(): Promise<void> {
		if (!this.statusIndicator) return;
		this.statusIndicator.className = "ai-status-indicator ai-status-checking";
		this.updateModelBadge();

		const isOk = await OllamaService.checkConnection(
			this.plugin.settings.ollama_endpoint
		);
		if (isOk) {
			this.statusIndicator.className = "ai-status-indicator ai-status-connected";
			this.statusIndicator.title = "Connected to Ollama";
		} else {
			this.statusIndicator.className = "ai-status-indicator ai-status-disconnected";
			this.statusIndicator.title = "Disconnected from Ollama";
		}
	}

	private renderEmptyState() {
		this.logContainer.empty();
		const emptyEl = this.logContainer.createEl("div", { cls: "ai-chat-empty" });
		emptyEl.createEl("div", { cls: "ai-chat-empty-icon", text: "🤖" });
		emptyEl.createEl("div", {
			text: "Chat with your local Ollama LLM. Type a prompt below or use editor shortcuts!",
		});
	}

	private clearChat() {
		this.messages = [];
		this.renderEmptyState();
	}

	private handleStop() {
		if (this.currentAbortController) {
			this.currentAbortController.abort();
			this.currentAbortController = null;
		}
	}

	private async handleSend() {
		const promptText = this.inputField.value.trim();
		if (!promptText) return;

		if (this.messages.length === 0) {
			this.logContainer.empty();
		}

		// Add User message
		this.messages.push({ role: "user", text: promptText });
		this.appendMessageBubble("user", promptText);
		this.inputField.value = "";

		// Create Assistant bubble for streaming
		const assistantBubble = this.appendMessageBubble("assistant", "", true);
		const contentEl = assistantBubble.querySelector(".ai-msg-content") as HTMLElement;

		this.sendBtn.style.display = "none";
		this.stopBtn.style.display = "inline-flex";

		this.currentAbortController = new AbortController();
		let responseText = "";

		try {
			await OllamaService.streamGenerate(
				this.plugin.settings.ollama_endpoint,
				{
					model: this.plugin.settings.model,
					prompt: promptText,
					system: this.systemInput.value || this.plugin.settings.botRole,
				},
				(chunk: string) => {
					responseText += chunk;
					contentEl.setText(responseText);
					this.logContainer.scrollTop = this.logContainer.scrollHeight;
				},
				this.currentAbortController.signal
			);
			this.messages.push({ role: "assistant", text: responseText });
		} catch (e: any) {
			if (e.name === "AbortError") {
				contentEl.setText(responseText + " [Stopped]");
				this.messages.push({ role: "assistant", text: responseText + " [Stopped]" });
			} else {
				const errMsg = `Error: ${e.message || e}`;
				contentEl.setText(errMsg);
				assistantBubble.className = "ai-msg ai-msg-error";
				this.messages.push({ role: "error", text: errMsg });
			}
		} finally {
			contentEl.removeClass("ai-typing-cursor");
			this.sendBtn.style.display = "inline-flex";
			this.stopBtn.style.display = "none";
			this.currentAbortController = null;
		}
	}

	private appendMessageBubble(
		role: "user" | "assistant" | "error",
		text: string,
		isTyping = false
	): HTMLElement {
		const msgEl = this.logContainer.createEl("div", {
			cls: `ai-msg ai-msg-${role}`,
		});
		const contentEl = msgEl.createEl("div", {
			cls: `ai-msg-content ${isTyping ? "ai-typing-cursor" : ""}`,
			text: text,
		});
		msgEl.createEl("div", {
			cls: "ai-msg-meta",
			text: role === "user" ? "You" : role === "assistant" ? "AI" : "Error",
		});
		this.logContainer.scrollTop = this.logContainer.scrollHeight;
		return msgEl;
	}

	async onClose(): Promise<void> {
		this.handleStop();
	}
}

/**
 * Main Plugin Class
 */
export default class LlmPlugin extends Plugin {
	settings: LlmSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		// Register Chat View
		this.registerView(
			VIEW_TYPE_LLM_CHAT,
			(leaf) => new LlmChatView(leaf, this)
		);

		// Ribbon Icon to toggle view
		this.addRibbonIcon("bot", "Local LLM Chat", () => {
			this.activateView();
		});

		// Commands
		this.addCommand({
			id: "open-llm-chat-view",
			name: "Open AI Chat Panel",
			callback: () => {
				this.activateView();
			},
		});

		this.addCommand({
			id: "reload-llm-plugin",
			name: "Reload LLM Plugin",
			callback: () => {
				this.reloadSelf();
			},
		});

		this.addCommand({
			id: "send-request-to-llm",
			name: "Ask LLM with selected text",
			editorCallback: (editor: Editor) => {
				const selection = editor.getSelection();
				if (!selection) {
					new Notice("Please select text first!");
					return;
				}
				this.streamToEditor(editor, selection);
			},
		});

		this.addCommand({
			id: "continue-my-story",
			name: "Continue my story and enhance text",
			editorCallback: (editor: Editor) => {
				const selection = editor.getSelection();
				const prompt = `Continue the following story smoothly and enhance its detail:\n\n${selection}`;
				this.streamToEditor(editor, prompt);
			},
		});

		this.addCommand({
			id: "make-a-story",
			name: "Make a story from my text",
			editorCallback: (editor: Editor) => {
				const selection = editor.getSelection();
				const prompt = `Create an engaging story based on the following text/ideas:\n\n${selection}`;
				this.streamToEditor(editor, prompt);
			},
		});

		this.addCommand({
			id: "summarize-my-text",
			name: "Summarize selected text",
			editorCallback: (editor: Editor) => {
				const selection = editor.getSelection();
				const prompt = `Summarize the following text clearly and concisely:\n\n${selection}`;
				this.streamToEditor(editor, prompt);
			},
		});

		this.addCommand({
			id: "improve-writing-grammar",
			name: "Fix grammar & improve writing",
			editorCallback: (editor: Editor) => {
				const selection = editor.getSelection();
				const prompt = `Fix any grammar errors, polish the wording, and improve readability while keeping the original meaning:\n\n${selection}`;
				this.streamToEditor(editor, prompt);
			},
		});

		this.addCommand({
			id: "explain-selected-text",
			name: "Explain selected text",
			editorCallback: (editor: Editor) => {
				const selection = editor.getSelection();
				const prompt = `Explain the following text clearly with examples if necessary:\n\n${selection}`;
				this.streamToEditor(editor, prompt);
			},
		});

		// Settings Tab
		this.addSettingTab(new LlmSettingsTab(this.app, this));
	}

	async streamToEditor(editor: Editor, prompt: string): Promise<void> {
		new Notice("Sending prompt to Ollama LLM...");
		const selection = editor.getSelection();
		if (selection) {
			editor.replaceSelection(`${selection}\n\n`);
		}

		try {
			await OllamaService.streamGenerate(
				this.settings.ollama_endpoint,
				{
					model: this.settings.model,
					prompt: prompt,
					system: this.settings.botRole,
				},
				(chunk: string) => {
					editor.replaceSelection(chunk);
				}
			);
		} catch (e: any) {
			new Notice(`LLM Error: ${e.message || e}`);
		}
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_LLM_CHAT);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({
					type: VIEW_TYPE_LLM_CHAT,
					active: true,
				});
			}
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	async loadSettings(): Promise<LlmSettings> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
		return this.settings;
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);

		// Notify open views of settings update
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_LLM_CHAT);
		leaves.forEach((leaf) => {
			if (leaf.view instanceof LlmChatView) {
				leaf.view.updateModelBadge();
				leaf.view.checkStatus();
			}
		});
	}

	async reloadSelf(): Promise<void> {
		//@ts-ignore
		const plugins = this.app.plugins;
		const id = this.manifest.id;
		await plugins.disablePlugin(id);
		new Notice("LLM plugin disabled.");
		await plugins.enablePlugin(id);
		new Notice("LLM plugin re-enabled.");
	}
}

/**
 * Settings Tab
 */
export class LlmSettingsTab extends PluginSettingTab {
	plugin: LlmPlugin;

	constructor(app: App, plugin: LlmPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	async display(): Promise<void> {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Obsidian AI (Ollama) Settings" });

		// Endpoint Setting
		new Setting(containerEl)
			.setName("Ollama Endpoint")
			.setDesc("HTTP URL of your Ollama server (e.g. http://127.0.0.1:11434 or local network IP)")
			.addText((text) =>
				text
					.setPlaceholder("http://127.0.0.1:11434")
					.setValue(this.plugin.settings.ollama_endpoint)
					.onChange(async (value) => {
						this.plugin.settings.ollama_endpoint = value;
						await this.plugin.saveSettings();
					})
			)
			.addButton((btn) =>
				btn.setButtonText("Test Connection").onClick(async () => {
					btn.setDisabled(true);
					btn.setButtonText("Testing...");
					const isOk = await OllamaService.checkConnection(
						this.plugin.settings.ollama_endpoint
					);
					btn.setDisabled(false);
					btn.setButtonText("Test Connection");
					if (isOk) {
						new Notice("✅ Ollama Connection Successful!");
						this.display(); // Refresh model dropdown
					} else {
						new Notice("❌ Could not connect to Ollama. Check URL & server status.");
					}
				})
			);

		// Model Selection
		const models = await OllamaService.getModels(
			this.plugin.settings.ollama_endpoint
		);

		const modelSetting = new Setting(containerEl)
			.setName("LLM Model")
			.setDesc("Choose an installed Ollama model");

		if (models.length > 0) {
			modelSetting.addDropdown((dropdown) => {
				models.forEach((m) => dropdown.addOption(m, m));

				// If saved model is in list, select it; otherwise default to first
				const selectedModel = models.includes(this.plugin.settings.model)
					? this.plugin.settings.model
					: models[0];

				dropdown.setValue(selectedModel).onChange(async (value) => {
					this.plugin.settings.model = value;
					await this.plugin.saveSettings();
				});

				// Save if defaulted
				if (this.plugin.settings.model !== selectedModel) {
					this.plugin.settings.model = selectedModel;
					this.plugin.saveSettings();
				}
			});
		} else {
			modelSetting.addText((text) =>
				text
					.setPlaceholder("e.g. tinyllama, llama3:8b")
					.setValue(this.plugin.settings.model)
					.onChange(async (value) => {
						this.plugin.settings.model = value;
						await this.plugin.saveSettings();
					})
			);
			modelSetting.setDesc(
				"Could not fetch model list from server. Enter model name manually or test connection above."
			);
		}

		// Bot Role / System Prompt
		new Setting(containerEl)
			.setName("Default System Role")
			.setDesc("Default instructions passed to the LLM for chat & text generation")
			.addTextArea((text) =>
				text
					.setPlaceholder("You are a helpful assistant...")
					.setValue(this.plugin.settings.botRole)
					.onChange(async (value) => {
						this.plugin.settings.botRole = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
