import {
	App,
	Editor,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	moment,
	Setting,
	requestUrl,
} from "obsidian";
// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	ollama_endpoint: string;
	model: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	ollama_endpoint: "http://localhost:11434/api/generate",
	model: "tinyllama",
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		const settings = await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"dice",
			"Sample Plugin",
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
				new Notice("Greetings from AI plugin!");
			}
		);
		// Perform additional things with the ribbon
		ribbonIconEl.addClass("my-plugin-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Status Bar Text");

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-sample-modal-simple",
			name: "Open sample modal (simple)",
			callback: () => {
				new SampleModal(this.app).open();
			},
		});

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
			console.log(llmModel);
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

						// Split the data_list into individual JSON objects
						data_list.split("}").forEach((obj) => {
							if (obj.trim()) {
								json_objects.push(obj + "}");
							}
						});

						// eslint-disable-next-line prefer-const, @typescript-eslint/no-explicit-any
						let responses: any[] = [];
						// Extract the 'response' field from each JSON object
						json_objects.forEach((obj) => {
							// eslint-disable-next-line prefer-const
							let response = JSON.parse(obj)["response"];
							responses.push(response);
						});

						// Join the responses into a single string
						// eslint-disable-next-line prefer-const
						let response_line = responses.join("");

						// eslint-disable-next-line prefer-const
						let bot_response = `\n\n${response_line}\n\n`;

						// Remove any empty strings from the response
						// eslint-disable-next-line prefer-const
						let response = bot_response.trim();

						return String(response);
					}
				});
			} catch (error) {
				return String(error);
			}
		}

		this.addCommand({
			id: "send-request-to-llm",
			name: "ASK LLM",
			editorCallback: (editor: Editor) => {
				const userRequest = editor.getSelection();
				// eslint-disable-next-line prefer-const
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
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("click", evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);
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

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText("AI plugin was loaded!");
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Flask endpoint url")
			.setDesc("Flask middleware")
			.addText((text) =>
				text
					.setPlaceholder("Enter your endpoint url")
					.setValue(this.plugin.settings.ollama_endpoint)
					.onChange(async (value) => {
						this.plugin.settings.ollama_endpoint = value;
						await this.plugin.saveSettings();
					})
			);

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
					.setValue("tinyllama")
					.onChange(async (value) => {
						this.plugin.settings.model = value;
						await this.plugin.saveSettings();
					});
			});
	}
}
