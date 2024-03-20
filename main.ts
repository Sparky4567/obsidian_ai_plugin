import {
	App,
	Editor,
	// Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	moment,
	Setting,
	requestUrl,
} from "obsidian";

interface llmSettings {
	ollama_endpoint: string;
	model: string;
}

const DEFAULT_SETTINGS: llmSettings = {
	ollama_endpoint: "http://localhost:11434/api/generate",
	model: "tinyllama",
};

export default class llmPlugin extends Plugin {
	settings: llmSettings;

	async onload() {
		const settings = await this.loadSettings();
		this.addCommand({
			id: "insert-todays-date",
			name: "Insert today's date",
			editorCallback: (editor: Editor) => {
				editor.replaceRange(
					moment().format("YYYY-MM-DD"),
					editor.getCursor()
				);
			},
		});

		async function getResponsefromLLM(passedQuery: string) {
			const llmSettings = settings;
			const llmModel = llmSettings.model;
			const endpoint = `${llmSettings.ollama_endpoint}`;
			const inputString = `${passedQuery}`;
			const bodyOb = {
				prompt: inputString,
				model: llmModel,
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
						// eslint-disable-next-line prefer-const
						let json_objects: string[] = [];

						data_list.split("}").forEach((obj) => {
							if (obj.trim()) {
								json_objects.push(obj + "}");
							}
						});

						// eslint-disable-next-line prefer-const, @typescript-eslint/no-explicit-any
						let responses: any[] = [];
						json_objects.forEach((obj) => {
							// eslint-disable-next-line prefer-const
							let response = JSON.parse(obj)["response"];
							responses.push(response);
						});

						// eslint-disable-next-line prefer-const
						let response_line = responses.join("");

						// eslint-disable-next-line prefer-const
						let bot_response = `\n\n${response_line}\n\n`;

						// eslint-disable-next-line prefer-const
						let response = bot_response.trim();
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
			name: "ASK LLM",
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
			name: "Continue my story and make it better (ASK LLM)",
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
			name: "Make a story from my text (ASK LLM)",
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
			name: "Summarize my text (ASK LLM)",
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
