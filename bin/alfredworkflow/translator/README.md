# EN/ZH Translator

Alfred workflow with two keywords:

- `en <text>`: auto-detect input language, translate to `en-US`, show result in Alfred.
- `zh <text>`: auto-detect input language, translate to `zh-TW`, show result in Alfred.

Result rows show the Shortcut output directly.

Press `Return` on the result row to copy.

Setup:

1. Import `EN-ZH-Translator.alfredworkflow`.
2. Open workflow configuration.
3. Set `Provider`.
4. Shortcut provider works by default with `Translate Text` and `Translate Text EN`.

Default provider: Shortcut.

DeepL targets:

- `en`: `EN-US`
- `zh`: `ZH-HANT`

DeepL and OpenAI remain available by changing `Provider`.

Shortcut provider:

- `Shortcut Input Mode = Input File`: default. Works with Shortcuts that read `Shortcut Input`, then stop and output translated text.
- `Shortcut Input Mode = Clipboard`: legacy mode for Shortcuts that read Clipboard.

Default Shortcut names:

- `zh`: `Translate Text`
- `en`: `Translate Text EN`
