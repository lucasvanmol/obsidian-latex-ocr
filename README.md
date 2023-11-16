# Latex OCR for Obsidian

Generate Latex equations from images and screenshots inside your vault.

![demo](images/demo.gif)

This plugin uses [NormXU's nougat-latex-ocr](https://github.com/NormXU/nougat-latex-ocr) model, which is based on PyTorch. Massive thanks to them for providing the open source model. Note that the plugin downloads the ~1.4 GB model and runs it locally.

Note this plugin is in ALPHA and currently more of a proof of concept. Please raise any issues you may find with the plugin using the issues tab on Github.

## Manual installation

This project requires [python](https://www.python.org/) to be installed, including a number of python packages. If you don't want your python installation to be polluted, feel free to use a virtual environment for this purpose.

### Copy files

- Create a new folder for the plugin at `VaultFolder/.obsidian/plugins/obsidian-latex-ocr/`
- Download the zip folder from the "Releases" tab
- Copy over `main.js`, `styles.css`, `manifest.json`, `latex_ocr` to your vault `VaultFolder/.obsidian/plugins/obsidian-latex-ocr/`.

Note that using [BRAT](https://github.com/TfTHacker/obsidian42-brat) does not work as of now, since you also need the python scripts in the `latex_ocr` folder, and you'll still need to configure your Python environment.

### Setup Python environemnt

First navigate to `VaultFolder/.obsidian/plugins/obsidian-latex-ocr/`

#### Using a Virtual Environment (optional)

If you wish, create a [virtual environment](https://docs.python.org/3/library/venv.html)

In Windows this could look like:
```
python -m venv .env
.env\Scripts\activate
```

Note that this python installation must then be set in the plugin settings. The python executable will usually be in 

```
C:\path\to\your\VaultFolder\.obsidian\plugins\obsidian-latex-ocr\.env\python.exe
```

#### Install packages

If you wish to use GPU for inference (requires CUDA):

```
pip install -r ./latex_ocr/requirements_gpu.txt
```
If you get an error message installing torch this way, refer to
`https://pytorch.org/get-started/locally/` to install it seperately. It may look something like `pip install torch --index-url https://download.pytorch.org/whl/cu118`

otherwise:

```
pip install -r ./latex_ocr/requirements_cpu.txt
```

### Configuration

Open Obsidian and navigate to the Community Plugins section and enable the plugin. Then head to the LatexOCR settings tab to configure it.

![settings](images/settings.png)

You will first need to set the python path that the plugin will use to run the model in the LatexOCR settings. You can then check if it's working using the button below it. Once this is done, press "(Re)start Server".

Note that the first time you do this, the model needs to be downloaded from huggingface, and is around ~1.4 GB. You can check the status of this download in the LatexOCR settings tab by pressing "Check Status".

---

## Development

### How this plugin works

This plugin consists of two main parts. The first is `latex_ocr`, a python script that downloads and runs the model using huggingface transformers and pytorch. This script interfaces with the javascript plugin using protocol buffers, allowing the plugin to communicate and make requests to the python script.

The reason for this is that loading the model takes some time. This setup allows the model to be loaded in the background, making subsequent requests much faster.

### Getting started

- Install NodeJS, then run `npm i` or `yarn` in the command line under the repo folder.
- Install the required python packages
  - `pip install requirements_cpu.txt` or `pip install requirements_gpu.txt`
- Run `npm run dev` to compile the plugin from `main.ts` to `main.js`.
- Make changes to `main.ts` (or create new `.ts` files). Those changes should be automatically compiled into `main.js`.
- Reload Obsidian to load the new version of the plugin.
- Enable plugin in settings window.
- For updates to the Obsidian API run `npm update` in the command line under the repo folder.

### ESLint
- To use eslint with this project, make sure to install eslint from terminal:
  - `npm install -g eslint`
- To use eslint to analyze this project use this command:
  - `eslint main.ts`
  - eslint will then create a report with suggestions for code improvement by file and line number.
- If your source code is in a folder, such as `src`, you can use eslint with this command to analyze all files in that folder:
  - `eslint .\src\`

### Using protoc

```
python -m grpc_tools.protoc -I./protos --python_out=. --pyi_out=. --grpc_python_out=. service.proto
```

```
node .\node_modules\@grpc\proto-loader\build\bin\proto-loader-gen-types.js
```

### API Documentation

See https://github.com/obsidianmd/obsidian-api

### Releasing new releases

- Update your `manifest.json` with your new version number, such as `1.0.1`, and the minimum Obsidian version required for your latest release.
- Update your `versions.json` file with `"new-plugin-version": "minimum-obsidian-version"` so older versions of Obsidian can download an older version of your plugin that's compatible.
- Create new GitHub release using your new version number as the "Tag version". Use the exact version number, don't include a prefix `v`. See here for an example: https://github.com/obsidianmd/obsidian-sample-plugin/releases
- Upload the files `manifest.json`, `main.js`, `styles.css` as binary attachments. Note: The manifest.json file must be in two places, first the root path of your repository and also in the release.
- Publish the release.

> You can simplify the version bump process by running `npm version patch`, `npm version minor` or `npm version major` after updating `minAppVersion` manually in `manifest.json`.
> The command will bump version in `manifest.json` and `package.json`, and add the entry for the new version to `versions.json`

