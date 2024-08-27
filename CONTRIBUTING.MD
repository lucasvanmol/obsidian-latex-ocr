# Developer Information

## How this plugin works

This plugin uses [NormXU's nougat-latex-ocr](https://github.com/NormXU/nougat-latex-ocr) model, which is based on PyTorch. Massive thanks to them for providing the open source model.

This plugin consists of two main parts. The first is [latex-ocr-server](https://github.com/lucasvanmol/latex-ocr-server), a python script that downloads and runs the model using huggingface transformers and pytorch. This script interfaces with the javascript plugin using protocol buffers, allowing the plugin to communicate and make requests to the python script.

The reason for this is that loading the model takes some time. This setup allows the model to be loaded in the background on startup, making subsequent requests much faster.

## Getting started

- Install NodeJS, then run `npm i` or `yarn` in the command line under the repo folder.
- Install the required python module from [latex-ocr-server](https://github.com/lucasvanmol/latex-ocr-server)
- Run `npm run dev` to compile the plugin from `main.ts` to `main.js`.
- Make changes to `main.ts` (or create new `.ts` files). Those changes should be automatically compiled into `main.js`.
- Reload Obsidian to load the new version of the plugin (or use the Hot Reload plugin!)
- Enable plugin in settings window.
- For updates to the Obsidian API run `npm update` in the command line under the repo folder.

## ESLint
- To use eslint with this project, make sure to install eslint from terminal:
  - `npm install -g eslint`
- To use eslint to analyze this project use this command:
  - `eslint main.ts`
  - eslint will then create a report with suggestions for code improvement by file and line number.
- If your source code is in a folder, such as `src`, you can use eslint with this command to analyze all files in that folder:
  - `eslint .\src\`

## Using protoc

```
python -m grpc_tools.protoc -I./protos --python_out=. --pyi_out=. --grpc_python_out=. ./protos/latex_ocr.proto
```

For js/ts, we use [ts-proto](https://github.com/stephenh/ts-proto)
```
protoc --plugin=protoc-gen-ts_proto=".\\node_modules\\.bin\\protoc-gen-ts_proto.cmd" --ts_proto_out=. ./protos/latex_ocr.proto --ts_proto_opt=outputServices=grpc-js
```

## API Documentation

See https://github.com/obsidianmd/obsidian-api

## Releasing new releases

- Update your `manifest.json` with your new version number, such as `1.0.1`, and the minimum Obsidian version required for your latest release.
- Update your `versions.json` file with `"new-plugin-version": "minimum-obsidian-version"` so older versions of Obsidian can download an older version of your plugin that's compatible.
- Tag and push, and let the releases workflow create the release
```
git tag -a 1.0.1 -m "1.0.1"
git push origin 1.0.1
```
- Publish the release.

> You can simplify the version bump process by running `npm version patch`, `npm version minor` or `npm version major` after updating `minAppVersion` manually in `manifest.json`.
> The command will bump version in `manifest.json` and `package.json`, and add the entry for the new version to `versions.json`

