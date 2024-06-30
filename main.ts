import * as fs from "fs";

import {
	App,
	Editor,
	// Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	WorkspaceLeaf,
	Setting,
	ItemView,
	requestUrl,
} from "obsidian";
import { Ollama } from "ollama-node";

interface llmSettings {
	ollama_endpoint: string;
	model: string;
	botRole: string;
}
//@ts-ignore
const absPath = app.vault.adapter.basePath;

function readSettings(pluginId: String) {
	const dataFilePath = `${absPath}/.obsidian/plugins/${pluginId}/data.json`; // Adjust path as per your file location

	try {
		const fileContent = fs.readFileSync(dataFilePath, "utf-8");
		const dataObject = JSON.parse(fileContent);
		const endpoint = dataObject["ollama_endpoint"];
		return endpoint;
		// You can further process or use `dataObject` as needed in your plugin
	} catch (error) {
		new Notice("Could not read data.json settings file");
		new Notice(
			"Select a model within the settings tab and it will be created automatically"
		);
		return false;
	}
}
let llm_endpoint = readSettings("obsidian_ai_plugin");
if (llm_endpoint === false) {
	llm_endpoint = "127.0.0.1";
}

async function checkConnection(passedEndpoint: String) {
	const checkUrl = `http://${passedEndpoint}:11434/api/ps`;
	let res: any;
	try {
		const req = await requestUrl(checkUrl)
			.then((dat) => {
				return dat.status;
			})
			.catch((e) => {
				return false;
			});
		return req;
	} catch (error) {
		return false;
	}
}

let ollama: any;
try {
	if (llm_endpoint !== false && llm_endpoint !== "127.0.0.1") {
		try {
			new Notice(
				`Ollama endpoint: ${llm_endpoint}, trying to initiate !`
			);
			checkConnection(llm_endpoint).then((data) => {
				if (String(data) === "200" && String(data) !== "false") {
					new Notice(`Passed custom endpoint check: Success ! 🥳`);
					ollama = new Ollama(llm_endpoint);
				} else {
					if (String(data) === "false") {
						new Notice(
							`Passed custom endpoint ${llm_endpoint} check: No, status ${data} 🥹`
						);
						new Notice(
							`Initiating default endpoint instead, double check your custom endpoint 🔎`
						);
						ollama = new Ollama();
					}
				}
			});
		} catch (error) {
			new Notice(`Error: ${error} !`);
		}
	} else {
		try {
			checkConnection(llm_endpoint)
				.then((data) => {
					if (String(data) === "200" && String(data) !== "false") {
						new Notice(
							`Passed ${llm_endpoint} endpoint check: Success ! 🥳`
						);
						ollama = new Ollama(llm_endpoint);
					}
				})
				.catch((e) => {
					new Notice(`Error: ${e} !`);
				});
		} catch (error) {
			new Notice(`Error encountered: ${error} !`);
		}
	}
} catch (e) {
	new Notice(`Error encountered: ${e} !`);
}

const DEFAULT_SETTINGS: llmSettings = {
	ollama_endpoint: "127.0.0.1",
	model: "tinyllama",
	botRole: "You are a helpful assistant providing only short answers",
};

async function reloadPlugin(plugin: String) {
	//@ts-ignore
	const plugins = app.plugins;
	const enabled = plugins.enabledPlugins;
	enabled.forEach(async (element: { value: String }) => {
		if (String(plugin) === String(element)) {
			await plugins.disablePlugin(plugin);
			new Notice(`Llm plugin was disabled 🙂👍️!`);
			await plugins.enablePlugin(plugin);
			new Notice(`Plugin was re-enabled. 💻️!`);
		}
	});
}

async function streamingResponse(
	editor: any,
	set: any,
	userRequest: any,
	selection: any
) {
	const llmSettings = set;
	const llmModel = llmSettings.model;
	const selectedArea = selection;

	await ollama.setModel(llmModel);
	// callback to print each word
	editor.replaceSelection(`${selectedArea}\n\n`);
	const print = (word: string) => {
		editor.replaceSelection(word);
	};
	await ollama.streamingGenerate(userRequest, print).catch((e: any) => {
		new Notice(`Error ${e}`);
	});
}

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
		// eslint-disable-next-line prefer-const
		let set = this.settings;
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("div", {
			attr: {
				id: "chat_box",
				style: "white-space: pre-wrap;font-size:1.2rem;overflow:scroll;width:95%;padding:2.5px;border-radius:8px;height:400px;display:block;margin-top:2rem;margin-bottom:0;border:1px solid white;",
			},
		});
		container.createEl("input", {
			placeholder: this.settings.botRole,
			value: set.botRole,
			attr: {
				id: "stop_stream_button",
				style: "width:95%;padding:2px;border-radius:8px;height:2rem;font-size:1.2rem;display:block;margin-top:1rem;margin-bottom:0;border:1px solid white;",
			},
		});
		container.createEl("input", {
			attr: {
				id: "input_field",
				placeholder: "Write your text here",
				style: "width:95%;padding:2px;border-radius:8px;height:3rem;font-size:1.2rem;display:block;margin-top:1rem;margin-bottom:0;border:1px solid white;",
			},
		});
		container.createEl("button", {
			text: "Ask local LLM",
			attr: {
				id: "submit_button",
				style: "width:95%;padding:2.5px;border-radius:8px;display:block;font-size:1.2rem;margin-top:0.5rem;margin-bottom:0;border:1px solid white;",
			},
		});
		container.createEl("button", {
			text: "Clean chat",
			attr: {
				id: "clean_button",
				style: "margin-top:1rem;width:95%;padding:2.5px;border-radius:8px;display:block;font-size:1.2rem;margin-top:1rem;margin-bottom:0;border:1px solid white;",
			},
		});

		const inputSelector = container.querySelector("#input_field");
		const buttonSelector = container.querySelector("#submit_button");
		const chatboxSelector = container.querySelector("#chat_box");
		const cleanSelector = container.querySelector("#clean_button");
		const templateSelector = container.querySelector("#template_box");
		let inputvalue: string;
		let templateValue: string;
		const paragraph = document.createElement("p");
		paragraph.textContent = "Local LLM chat";
		inputSelector?.addEventListener("keyup", (event) => {
			const target = event.target as HTMLButtonElement;
			if (target) {
				inputvalue = target.value;
			}
		});

		templateSelector?.addEventListener("keyup", (event) => {
			const target = event.target as HTMLButtonElement;
			if (target) {
				templateValue = target.value;
			}
		});

		buttonSelector?.addEventListener("click", async () => {
			// eslint-disable-next-line prefer-const
			let passingValue = inputvalue;
			// eslint-disable-next-line prefer-const
			let tempValue = templateValue;
			const waitingForAnswer = `\n\nWaiting for answer to prompt: ${passingValue}\n\n`;

			if (chatboxSelector) {
				chatboxSelector.textContent += waitingForAnswer;
			}
			new Notice("Trying to send a request to LLM !\n\nPatience !");

			const llmSettings = set;
			const llmModel = llmSettings.model;
			const temp = tempValue;
			await ollama.setModel(llmModel);
			await ollama.setTemplate(temp);
			if (chatboxSelector) {
				chatboxSelector.textContent += `\n\n`;
			}
			// callback to print each word
			const print = (word: string) => {
				if (chatboxSelector) {
					chatboxSelector.textContent += `${word}`;
				}
			};
			await ollama.streamingGenerate(passingValue, print);
			if (chatboxSelector) {
				chatboxSelector.textContent += `\n\n`;
			}
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

		this.addCommand({
			id: "reload-llm",
			name: "Reload llm plugin",
			callback: () => {
				reloadPlugin("obsidian_ai_plugin");
			},
			hotkeys: [],
		});

		this.addCommand({
			id: "send-request-to-llm",
			name: "Ask llm",
			editorCallback: (editor: Editor) => {
				// eslint-disable-next-line prefer-const
				const selection = editor.getSelection();
				const userRequest = selection;
				new Notice("Trying to send a request to LLM !\n\nPatience !");
				streamingResponse(editor, settings, userRequest, userRequest);
			},
		});

		this.addCommand({
			id: "continue-my-story",
			name: "Continue my story and make it better",
			editorCallback: (editor: Editor) => {
				const userRequest = editor.getSelection();
				const continueRequest = `Continue my story and make it better: ${userRequest}`;
				streamingResponse(
					editor,
					settings,
					continueRequest,
					userRequest
				);
			},
		});

		this.addCommand({
			id: "make-a-story",
			name: "Make a story from my text",
			editorCallback: (editor: Editor) => {
				const userRequest = editor.getSelection();
				// eslint-disable-next-line prefer-const
				const storyRequest = `Make a story from my text: ${userRequest}`;
				streamingResponse(editor, settings, storyRequest, userRequest);
			},
		});

		this.addCommand({
			id: "summarize-my-text",
			name: "Summarize my text ",
			editorCallback: (editor: Editor) => {
				const userRequest = editor.getSelection();
				const summaryRequest = `Make a summary from provided text: ${userRequest}`;
				streamingResponse(
					editor,
					settings,
					summaryRequest,
					userRequest
				);
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

	async getModels() {
		// eslint-disable-next-line prefer-const
		let modelList = await ollama
			.listModels()
			.then((data: { models: any }) => {
				return data.models;
			});
		return modelList;
	}

	async display(): Promise<void> {
		const { containerEl } = this;
		// eslint-disable-next-line prefer-const
		let modelOptions = await this.getModels();
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
					dropdown;
					modelOptions.forEach((model: string) => {
						dropdown.addOption(model, model);
					});
					dropdown
						.setValue(modelOptions[0])
						.onChange(async (value) => {
							this.plugin.settings.model = value;
							await this.plugin.saveSettings();
						});
				});

			new Setting(containerEl)
				.setName("Default bot role")
				.setDesc("Define a bot role")
				.addTextArea((text) =>
					text
						.setPlaceholder(
							"Bot role: for example, you are a helpful assistant providing only short answers"
						)
						.setValue(this.plugin.settings.botRole)
						.onChange(async (value) => {
							this.plugin.settings.botRole = value;
							await this.plugin.saveSettings();
						})
				);
		} else {
			new Setting(containerEl)
				.setName("LLM model")
				.setDesc(
					"Choose a model, remember that you should download ollama and needed models first !"
				)
				.addDropdown((dropdown) => {
					modelOptions.forEach((model: string) => {
						dropdown.addOption(model, model);
					});

					dropdown
						.setValue(modelOptions[0])
						.onChange(async (value) => {
							this.plugin.settings.model = value;
							await this.plugin.saveSettings();
						});
				});

			new Setting(containerEl)
				.setName("Default bot role")
				.setDesc("Define a bot role")
				.addTextArea((text) =>
					text
						.setPlaceholder(
							"Bot role: for example, you are a helpful assistant providing only short answers"
						)
						.setValue(
							"You are a helpful assistant providing only short answers"
						)
						.onChange(async (value) => {
							this.plugin.settings.botRole = value;
							await this.plugin.saveSettings();
						})
				);
		}
	}
}
