# Latex OCR for Obsidian
![GitHub release (with filter)](https://img.shields.io/github/v/release/lucasvanmol/obsidian-latex-ocr) 
<a href="https://www.buymeacoffee.com/lucasvanmol" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="20" width="100"></a>


Generate Latex equations from images and screenshots inside your vault.

![demo](images/demo.gif)


## Features

- Paste LaTeX equations directly into your notes using an image from your clipboard with a custom command (bind it to a hotkey like `Ctrl+Alt+V` if you use it often!).
- Transform images in your vault to LaTeX equations by choosing a new "Generate Latex" option in their context menu.
- Use either the HuggingFace [inference API](#using-inference-api) or [run locally](#run-locally)

## Installation

### Manual Installation

- Create a new folder for the plugin at `VaultFolder/.obsidian/plugins/obsidian-latex-ocr/`
- Navigate to this project's "Releases" tab
- Copy over `main.js`, `styles.css` and `manifest.json`, to your vault `VaultFolder/.obsidian/plugins/obsidian-latex-ocr/`.

### BRAT

Alternatively, you can also use [BRAT](https://github.com/TfTHacker/obsidian42-brat) to do this automatically by providing the link to this repository. If enabled you can download future beta versions easily.

## Using Inference API

By default, this plugin uses the HuggingFace inference API. Here's how you get your API key:
- Create an account or login at https://huggingface.co
- Create a `read` access token in your [Hugging Face profile settings](https://huggingface.co/settings/tokens). If you already have other access tokens I recommend creating one specifically for this plugin.
- After enabling the plugin in Obsidian, head to the Latex OCR settings tab, and input the API key you generated.

## Run Locally

Alternatively, you can run the model locally. This requires installing an accompanying [python package](https://github.com/lucasvanmol/latex-ocr-server). Install it using `pip` (or, preferably `pipx`):

```
pip install https://github.com/lucasvanmol/latex-ocr-server/releases/download/0.1.0/latex_ocr_server-0.1.0-py3-none-any.whl
```

You can check if it is installed by running

```
python -m latex_ocr_server --version
```

### Configuration

Open Obsidian and navigate to the Community Plugins section and enable the plugin. Then head to the LatexOCR settings tab, enable "Use local model" and configure it.

![settings](images/settings.png)

You will first need to set the python path that the plugin will use to run the model in the LatexOCR settings. You can then check if it's working using the button below it. Once this is done, press "(Re)start Server".

Note that the first time you do this, the model needs to be downloaded from huggingface, and is around ~1.4 GB. You can check the status of this download in the LatexOCR settings tab by pressing "Check Status".

The status bar at the bottom will indicate the status of the server.

| Status     | Meaning            |
| ---------- | ------------------ |
| LatexOCR ✅ | server online      |
| LatexOCR ⚙️ | server loading     |
| LatexOCR 🌐 | downloading model  |
| LatexOCR ❌ | server unreachable |

### GPU support

You can check if GPU support is working by running:

```
python -m latex_ocr_server info --gpu-available
```

If you want GPU support, follow the instructions at `https://pytorch.org/get-started/locally/` to install pytorch with CUDA. Note you may need to uninstall torch first. `torchvision` and `torchaudio` is not required. 

