## Obsidian AI plugin

This plugin was developed to make a better way to use Local LLM models with Obsidian.

## In order to use the plugin

-   Download/Clone the plugin into your plugins folder

```

cd ./obsidian/plugins
git clone https://github.com/Sparky4567/obsidian_ai_plugin.git
cd obsidian_ai_plugin
npm install
npm run build
open Obsidian app
enable community plugin support
enable LLM plugin
choose a module within the settings tab

```

-   Ensure that you have Ollama installed

```

https://ollama.com/download

```

Read documentation accordingly.

-   Ensure that Ollama model is running in the background

```

ollama run tinyllama

(Example)

```

-   If you downloaded this plugin from GitHub repo, copy it to your .obsidian/plugins, don't forget to run npm install within the plugins directory

```
npm install

```

to install all needed dependencies.

-   Ensure that the plugin is activated
-   Choose the right endpoint and model in plugins settings
-   Write something into editor field (Simple text)
-   Select the text with your mouse
-   Press CTRL+P after selection
-   Type in ASK LLM and choose your wanted command (There aren't many at the moment)
-   Press Enter to confirm
-   Wait for a while to get the result

Your text will be changed with the text from LLM (Default is tinyllama)

If you have any questions related to the plugin or want to extend the functionality, write an email to admin@artefaktas.eu and I will try to respond as soon, as I can.

### Troubleshooting

- When you run `ollama`, you are running a particular LLM model in another thread.  A common issue is 404 errors inside of Obsidian and no responses. Check your configuration, and make sure that the ollama model you are running matches what Obsidian is calling. The default model is `tinyllama`.
- If you get other errors, the most likely cause is that `ollama` is not running in the background.  `ollama run <modelname>` opens a port on your local machine, and this plugin uses [that resulting REST API](https://github.com/ollama/ollama?tab=readme-ov-file#rest-api) to function.

### Recommendations

-   A laptop with at least 8GB of RAM and a decent processor (for local usage)

### Want to support the project ?

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/K3K06VU8Z)

[![wakatime](https://wakatime.com/badge/user/1fbc8005-b2d0-4f4f-93e8-f12d7d25d676/project/018e50a2-95fc-40fa-aed2-18be07c19419.svg)](https://wakatime.com/badge/user/1fbc8005-b2d0-4f4f-93e8-f12d7d25d676/project/018e50a2-95fc-40fa-aed2-18be07c19419)
