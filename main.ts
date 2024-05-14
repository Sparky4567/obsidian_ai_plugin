import {
	App,
	Editor,
	// Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	WorkspaceLeaf,
	Setting,
	requestUrl,
	ItemView,
} from "obsidian";

interface llmSettings {
	ollama_endpoint: string;
	model: string;
}

const DEFAULT_SETTINGS: llmSettings = {
	ollama_endpoint: "http://localhost:11434/api/generate",
	model: "tinyllama",
};

export const VIEW_TYPE_EXAMPLE = "example-view";

export class ExampleView extends ItemView {
	settings: llmSettings;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	constructor(leaf: WorkspaceLeaf, settings: any) {
		super(leaf);
		this.settings = settings;
	}

	getViewType() {
		return VIEW_TYPE_EXAMPLE;
	}

	getDisplayText() {
		return "Chat View";
	}

	async onOpen() {
		const set = this.settings;
		async function getChatResponsefromLLM(passedQuery: string) {
			const llmSettings = set;
			const llmModel = llmSettings.model;
			const endpoint = `${llmSettings.ollama_endpoint}`;
			const inputString = `${passedQuery}`;
			const bodyOb = {
				prompt: inputString,
				model: llmModel,
				stream: true,
			};

			try {
				return await requestUrl({
					url: endpoint,
					method: "POST",
					body: JSON.stringify(bodyOb),
				}).then((data) => {
					const res = data.text;
					if (res) {
						// eslint-disable-next-line prefer-const
						let data_list = res;
						// eslint-disable-next-line prefer-const, @typescript-eslint/no-explicit-any
						let responses: any[] = [];
						data_list.split("}").forEach((obj) => {
							if (obj.trim()) {
								obj = obj + "}";
								// eslint-disable-next-line prefer-const
								let response = JSON.parse(obj)["response"];
								responses.push(response);
							}
						});

						// eslint-disable-next-line prefer-const
						let response_line = responses.join("");

						// eslint-disable-next-line prefer-const
						let bot_response = `\n\n${response_line}\n\n`;

						// eslint-disable-next-line prefer-const
						let response = bot_response;
						new Notice("Success !");
						return String(response);
					}
				});
			} catch (error) {
				new Notice(`Error: ${error}!`);
				return String(error);
			}
		}

		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("div", {
			attr: {
				id: "chat_box",
				style: "white-space: pre-wrap;font-size:1.2rem;overflow:scroll;width:95%;padding:2.5px;border-radius:8px;height:400px;display:block;margin-top:2rem;margin-bottom:0;border:1px solid white;",
			},
		});
		container.createEl("input", {
			attr: {
				id: "input_field",
				placeholder: "Write your text here",
				style: "width:95%;padding:4px;border-radius:8px;height:4rem;font-size:1.2rem;display:block;margin-top:2rem;margin-bottom:0;border:1px solid white;",
			},
		});
		container.createEl("button", {
			text: "Ask local LLM",
			attr: {
				id: "submit_button",
				style: "width:95%;padding:2.5px;border-radius:8px;display:block;font-size:1.2rem;margin-top:1rem;margin-bottom:0;border:1px solid white;",
			},
		});
		container.createEl("button", {
			text: "Clean chat",
			attr: {
				id: "clean_button",
				style: "width:95%;padding:2.5px;border-radius:8px;display:block;font-size:1.2rem;margin-top:1rem;margin-bottom:0;border:1px solid white;",
			},
		});
		const inputSelector = container.querySelector("#input_field");
		const buttonSelector = container.querySelector("#submit_button");
		const chatboxSelector = container.querySelector("#chat_box");
		const cleanSelector = container.querySelector("#clean_button");
		let inputvalue: any;
		const paragraph = document.createElement("p");
		paragraph.textContent = "Local LLM chat";
		inputSelector?.addEventListener("keyup", (event) => {
			const target = event.target as HTMLButtonElement;
			if (target) {
				inputvalue = target.value;
			}
		});

		buttonSelector?.addEventListener("click", () => {
			// eslint-disable-next-line prefer-const
			let passingValue = inputvalue;
			const waitingForAnswer = `\nWaiting for answer to prompt: ${passingValue}\n`;

			if (chatboxSelector) {
				chatboxSelector.textContent += waitingForAnswer;
			}
			new Notice("Trying to send a request to LLM !\n\nPatience !");
			getChatResponsefromLLM(passingValue).then((data) => {
				// eslint-disable-next-line prefer-const
				let answerBox = String(data);
				if (chatboxSelector) {
					chatboxSelector.textContent += `\n${answerBox}\n`;
				}
			});
		});
		if (cleanSelector) {
			cleanSelector.addEventListener("click", () => {
				if (chatboxSelector) {
					chatboxSelector.textContent = "";
				}
			});
		}
	}
	async onClose() {
		// Nothing to clean up.
	}
}

export default class llmPlugin extends Plugin {
	settings: llmSettings;
	async onload() {
		const settings = await this.loadSettings();
		this.registerView(
			VIEW_TYPE_EXAMPLE,
			(leaf) => new ExampleView(leaf, settings)
		);

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const ribbonIconEl = this.addRibbonIcon(
			"star",
			"Local LLM Chat",
			(evt: MouseEvent) => {
				this.activateView();
			}
		);

		async function getResponsefromLLM(passedQuery: string) {
			const llmSettings = settings;
			const llmModel = llmSettings.model;
			const endpoint = `${llmSettings.ollama_endpoint}`;
			const inputString = `${passedQuery}`;
			const bodyOb = {
				prompt: inputString,
				model: llmModel,
				stream: true,
			};

			try {
				return await requestUrl({
					url: endpoint,
					method: "POST",
					body: JSON.stringify(bodyOb),
				}).then((data) => {
					const res = data.text;
					if (res) {
						// eslint-disable-next-line prefer-const
						let data_list = res;
						// eslint-disable-next-line prefer-const, @typescript-eslint/no-explicit-any
						let responses: any[] = [];
						data_list.split("}").forEach((obj) => {
							if (obj.trim()) {
								obj = obj + "}";
								// eslint-disable-next-line prefer-const
								let response = JSON.parse(obj)["response"];
								responses.push(response);
							}
						});

						// eslint-disable-next-line prefer-const
						let response_line = responses.join("");

						// eslint-disable-next-line prefer-const
						let bot_response = `\n\n${response_line}\n\n`;

						// eslint-disable-next-line prefer-const
						let response = bot_response;
						new Notice("Success !");
						return String(response);
					}
				});
			} catch (error) {
				new Notice(`Error: ${error}!`);
				return String(error);
			}
		}

		this.addCommand({
			id: "send-request-to-llm",
			name: "Ask Llm",
			editorCallback: (editor: Editor) => {
				const userRequest = editor.getSelection();
				// eslint-disable-next-line prefer-const
				new Notice("Trying to send a request to LLM !\n\nPatience !");
				getResponsefromLLM(userRequest).then((data) => {
					editor.replaceSelection(String(data));
				});
			},
		});

		this.addCommand({
			id: "continue-my-story",
			name: "Continue my story and make it better",
			editorCallback: (editor: Editor) => {
				const userRequest = editor.getSelection();
				// eslint-disable-next-line prefer-const
				getResponsefromLLM(
					`Continue my story and make it better: ${userRequest}`
				).then((data) => {
					editor.replaceSelection(String(data));
				});
			},
		});

		this.addCommand({
			id: "make-a-story",
			name: "Make a story from my text",
			editorCallback: (editor: Editor) => {
				const userRequest = editor.getSelection();
				// eslint-disable-next-line prefer-const
				getResponsefromLLM(
					`Make a story from my text: ${userRequest}`
				).then((data) => {
					editor.replaceSelection(String(data));
				});
			},
		});

		this.addCommand({
			id: "summarize-my-text",
			name: "Summarize my text ",
			editorCallback: (editor: Editor) => {
				const userRequest = editor.getSelection();
				// eslint-disable-next-line prefer-const
				getResponsefromLLM(
					`Make a summary from provided text: ${userRequest}`
				).then((data) => {
					editor.replaceSelection(String(data));
				});
			},
		});
		this.addSettingTab(new llmSettingsTab(this.app, this, settings));
	}

	onunload() {}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({
					type: VIEW_TYPE_EXAMPLE,
					active: true,
				});
				// "Reveal" the leaf in case it is in a collapsed sidebar
				workspace.revealLeaf(leaf);
			}
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
		return this.settings;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class llmSettingsTab extends PluginSettingTab {
	plugin: llmPlugin;
	settings: llmSettings;

	constructor(app: App, plugin: llmPlugin, settings: llmSettings) {
		super(app, plugin);
		this.plugin = plugin;
		this.settings = settings;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Ollama endpoint")
			.setDesc("Ollama API URL")
			.addText((text) =>
				text
					.setPlaceholder("Enter your endpoint url")
					.setValue(this.plugin.settings.ollama_endpoint)
					.onChange(async (value) => {
						this.plugin.settings.ollama_endpoint = value;
						await this.plugin.saveSettings();
					})
			);

		if (this.settings.model !== null && this.settings.model !== "") {
			new Setting(containerEl)
				.setName("LLM model")
				.setDesc(
					"Choose a model, remember that you should download ollama and needed models first !"
				)
				.addDropdown((dropdown) => {
					dropdown
						.addOption("tinyllama", "tinyllama")
						.addOption("phi", "phi")
						.addOption("orca-mini", "orca-mini")
						.addOption("tinydolphin", "tinydolphin")
						.addOption("samantha-mistral", "samantha-mistral")
						.addOption("llama2", "llama2")
						.addOption("llama3", "llama3")
						.addOption("medllama2", "medllama2")
						.setValue(this.settings.model)
						.onChange(async (value) => {
							this.plugin.settings.model = value;
							await this.plugin.saveSettings();
						});
				});
		} else {
			new Setting(containerEl)
				.setName("LLM model")
				.setDesc(
					"Choose a model, remember that you should download ollama and needed models first !"
				)
				.addDropdown((dropdown) => {
					dropdown
						.addOption("tinyllama", "tinyllama")
						.addOption("phi", "phi")
						.addOption("orca-mini", "orca-mini")
						.addOption("tinydolphin", "tinydolphin")
						.addOption("samantha-mistral", "samantha-mistral")
						.addOption("llama2", "llama2")
						.addOption("llama3", "llama3")
						.addOption("medllama2", "medllama2")
						.setValue("tinyllama")
						.onChange(async (value) => {
							this.plugin.settings.model = value;
							await this.plugin.saveSettings();
						});
				});
		}
	}
}
