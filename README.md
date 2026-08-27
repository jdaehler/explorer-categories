# Explorer Categories

Give a folder a category. The category carries the color, the marker and
the icon — and every folder in it looks the same. Change the category, and
all of them follow at once.

That is the whole idea. You are not painting folders one by one; you are
sorting them into groups that happen to be visible.

## What a category holds

A category is a name plus an appearance, and the appearance is complete:

- a color
- a marker in front of the name — a bar, a dot, or an icon
- an optional background, colored text, bold text

Each category carries its own. One can be a quiet gray bar, the next a
solid red background, a third just a bold blue name. You are not choosing
one style for the whole vault.

## Working with it

**Assign a category.** Right-click a folder, pick a category. Done.

**Assign many at once.** Alt-click or shift-click several folders in the
file explorer, then right-click. The menu title tells you how many folders
you picked. Notes in the selection are ignored — only folders get colored.

**Let subfolders inherit.** Turn on "Also applies to subfolders" for that
one folder, and everything below it follows, including folders you create
later. A subfolder with its own category keeps it. You decide this per
folder, not once for the whole vault.

**Icons come from Obsidian.** Any icon Obsidian ships with, searchable,
shown in the color of its category. An icon takes the place of the bar or
dot rather than adding to it.

**Renaming keeps the category.** Move a folder, rename it, rename a folder
above it — the assignment follows.

## Interface language

The plugin follows the language set in Obsidian. English and German are
built in; every other language gets English.

To add one, copy `TEXTE_EN` in `main.js`, translate the entries, and add
the list to `SPRACHEN`. Nothing else changes. Pull requests welcome.

## Installing

From Obsidian: Settings → Community plugins → Browse, then search for
"Explorer Categories".

Manually: download `main.js`, `manifest.json` and `styles.css` from the
latest release into `<vault>/.obsidian/plugins/explorer-categories/`, then
enable the plugin.

## How it works

The plugin never touches the file explorer. It writes a single `<style>`
element into the document head and lets Obsidian do the drawing — no
MutationObserver, nothing running in the background, nothing to slow the
explorer down. Rules of the same kind are merged, so a vault with several
hundred colored folders still produces a short stylesheet.

Your assignments live in `data.json` inside your vault. The plugin makes
no network requests and reads nothing outside its own settings.

## Requirements

Obsidian 1.12.0 or newer. Works on desktop and mobile.

## Credits

The approach of generating CSS rules instead of manipulating the DOM is
borrowed from [Color Folders and
Files](https://github.com/Mithadon/obsidian-color-folders-files) by
Mithadon (MIT).

## License

MIT — see [LICENSE](LICENSE).

Author: ARPMAN
Built with AI assistance.
