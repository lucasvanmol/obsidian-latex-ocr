# Latex OCR for Obsidian

Generate Latex equations from images and screenshots inside your vault.

![demo](images/demo.gif)

Note that this plugin requires the installation of a python package `latex_ocr_server`, see [installation instructions](#manual-installation). The plugin downloads the ~1.4 GB model and runs it locally. Make sure to double check formulas, because the model can get things wrong!

## Features

- Paste LaTeX equations directly into your notes using an image from your clipboard with a custom command (bind it to a hotkey like `Ctrl+Alt+V` if you use it often!).
- Transform images in your vault to LaTeX equations by choosing a new "Generate Latex" option in their context menu.

## Manual installation

Firstly, this project uses a python package to do most of the heavy lifting. Install it using `pip` (or, preferably `pipx`):

```
pip install https://github.com/lucasvanmol/latex-ocr-server/releases/download/0.1.0/latex_ocr_server-0.1.0-py3-none-any.whl
```

You can check if it is installed by running

```
python -m latex_ocr_server --version
```


### Copy files

- Create a new folder for the plugin at `VaultFolder/.obsidian/plugins/obsidian-latex-ocr/`
- Navigate to this project's "Releases" tab
- Copy over `main.js`, `styles.css` and `manifest.json`, to your vault `VaultFolder/.obsidian/plugins/obsidian-latex-ocr/`.

### BRAT

Alternatively, you can also use [BRAT](https://github.com/TfTHacker/obsidian42-brat) to do this autmatically by providing the link to this repository. If enabled you'll get automatic updates for future beta version. Note that the `latex_ocr_server` python package is still required. If installing through BRAT.


### Configuration

Open Obsidian and navigate to the Community Plugins section and enable the plugin. Then head to the LatexOCR settings tab to configure it.

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

