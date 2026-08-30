# Contributing

Thanks for looking. This is a one-person plugin, built in the open.

## Reporting a bug

Open an issue and say what you did, what you expected, and what happened
instead. Two things help more than anything else:

- your Obsidian version and platform (desktop or mobile)
- whether the folder in question inherits its category from a parent

A screenshot of the file explorer usually settles it.

## Suggesting a feature

Open an issue and describe the problem you ran into, not only the
solution you have in mind. The plugin deliberately keeps one idea at its
centre: a folder gets a category, and the category carries the
appearance. Suggestions that fit that idea have the best chance.

## Translations

Every visible string lives twice in `main.js`, in `TEXTS_DE` and
`TEXTS_EN`. To add a language, copy `TEXTS_EN`, translate the values, and
add it to `LANGUAGES`. Keep the keys untouched — they are what the code
looks up. Pull requests for a new language are welcome.

## Pull requests

For anything larger than a typo, open an issue first so we can agree on
the approach before you spend time on it.

There is no build step. `main.js` is plain JavaScript and ships as it is.
Before you open a pull request, run the test suite from the project this
repository is published from — if you do not have it, say so in the pull
request and the tests will be run for you.

## Code style

Code, comments and commit messages are in English. The user interface is
translated; the source is not.

## License

By contributing you agree that your work is published under the MIT
license, the same as the rest of this repository.
