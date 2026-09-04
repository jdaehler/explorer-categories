/* Explorer Categories
 *
 * A folder gets a category; the category carries the appearance. Change
 * the category and every folder in it follows at once -- that is the
 * whole point of the plugin.
 *
 * HOW IT IS BUILT
 * The plugin never touches the file explorer. It writes one <style>
 * element into the document head and lets Obsidian do the drawing. No
 * MutationObserver, nothing running in the background.
 *
 * NO PERSONAL DATA IN THE SOURCE
 * The three categories below are neutral examples. Real assignments live
 * in data.json inside the vault, never here.
 */

'use strict';

const {
  Plugin,
  Modal,
  TFolder,
  TFile,
  Notice,
  Platform,
  setIcon,
  getIconIds,
  getLanguage,
} = require('obsidian');

/* Every visible string, once per language. Which list applies is decided
   by Obsidian's interface language, see chooseLanguage() below.

   To contribute a third language: copy TEXTS_EN, translate the entries,
   and add the list to LANGUAGES. Nothing in the code itself changes. */
const TEXTS_DE = {
  /* "Category" on its own would be lost in the context menu -- there are
     a dozen other entries competing with it. */
  menuTitle: 'Farbkategorie',
  removeColour: 'Farbe entfernen',
  manage: 'Kategorien verwalten …',
  toSubfolders: 'Gilt auch für Unterordner',
  toNotes: 'Gilt auch für Dateien darin',
  inheritsFrom: (folder, category) => `Erbt „${category}" von „${folder}"`,
  windowTitle: 'Farbkategorien',
  openWindow: 'Farbkategorien verwalten',
  newCategory: 'Neue Kategorie',
  newCategoryDefault: 'Neue Kategorie',
  remove: 'Löschen',
  namePlaceholder: 'Name',
  pickColour: 'Farbe wählen',
  nothingChosen: 'Links eine Kategorie auswählen.',
  markierung: 'Markierung',
  extra: 'Zusätzlich',
  inheritance: 'Vererbung',
  /* Names the two areas that had none. What the third area is, its own
     first row says: a colour and a name. */
  areaGroups: 'Gruppen',
  areaCategories: 'Kategorien',
  /* Telling the folder that carries the assignment apart from the ones
     that only inherit from it. */
  /* Zwei Aussehen je Kategorie, seit 1.1.0. Der Umschalter steht ueber
     den Schaltern, die er umstellt -- man sieht also, was man gerade
     einstellt, bevor man etwas drueckt. */
  editingFor: 'Einstellen für',
  viewParent: 'Vater',
  viewChildren: 'Kinder',
  childFollows: 'Wie der Vater',
  childFollowsHint: 'Die Kinder sehen aus wie der Vater. Stell etwas um, damit sie ein eigenes Aussehen bekommen.',
  childOwnHint: 'Die Kinder haben ein eigenes Aussehen. Alles Übrige folgt weiter dem Vater.',
  childOnlyWithReach: 'Erst mit Vererbung gibt es Kinder.',
  /* Short on purpose: these share one reserved line with the sentence
     above them, and a second line would push the window a step taller
     for everyone, not just for the case that needs it. */
  iconName: 'Symbol',
  pickIcon: 'Symbol wählen …',
  iconLabel: 'Name des Symbols',
  iconUnknown: 'Ein Symbol dieses Namens gibt es nicht.',
  removeIcon: 'Entfernen',
  iconSearch: 'Symbol suchen',
  iconNothingFound: 'Kein Symbol gefunden.',
  iconWindowTitle: 'Symbol wählen',
  iconReplaces: 'Das Symbol tritt an die Stelle von Lasche und Punkt.',
  iconNoEffect: 'Bei „Ohne" bleibt der Ordner unmarkiert, auch mit Symbol.',
  iconMore: (gezeigt, gesamt) => `${gezeigt} von ${gesamt} — weiter eingrenzen.`,
  folderCountText: (n) => (n === 1 ? '1 Ordner' : `${n} Ordner`),
  deleteQuestion: (name, n) =>
    n === 0
      ? `„${name}" löschen?`
      : `„${name}" löschen? ${n === 1 ? 'Ein Ordner verliert' : `${n} Ordner verlieren`} damit die Farbe.`,
  deleted: (name) => `„${name}" gelöscht.`,
  cancel: 'Abbrechen',
  save: 'Speichern',
  discard: 'Verwerfen',
  discardQuestion: 'Die Änderungen verwerfen? Sie gehen dabei verloren.',
  backup: 'Sichern',
  load: 'Laden',
  backupRestored: (name) => `„${name}" liegt im Download-Ordner.`,
  backupInVault: (name) => `Gesichert als „${name}" im Vault.`,
  backupFailed: 'Die Sicherung konnte nicht geschrieben werden.',
  backupTitle: 'Sicherung laden',
  backupEmpty: 'Im Vault liegt noch keine Sicherung.',
  backupPlace: (folder) => `Die Sicherungen liegen im Vault unter „${folder}".`,
  backupQuestion: (name) =>
    `„${name}" laden? Ersetzt den Stand im Fenster — geschrieben wird er erst mit „Speichern".`,
  backupLoaded: 'Geladen. Mit „Speichern" übernehmen, mit „Abbrechen" verwerfen.',
  backupUnreadable: 'Die Datei lässt sich nicht lesen.',
  backupWithoutCategories: 'In der Datei stehen keine Kategorien.',
  markerNone: 'Ohne',
  markerBar: 'Lasche',
  markerDot: 'Punkt',
  hintergrund: 'Hintergrund',
  schriftFarbig: 'Schrift farbig',
  fett: 'Fett',
  gedimmt: 'Abdunkeln',
  textAutomatic: 'Bei Hintergrund wählt das Plugin die Schriftfarbe selbst, damit sie lesbar bleibt.',
  dimmedHint: 'Abgedunkelt tritt die ganze Zeile zurück, Markierung und Symbol werden blasser.',
  /* With a multi-selection the count goes in the title. Three wordings,
     because a selection can hold folders, files, or both -- "5 folders"
     in front of a selection that is half notes would be a lie. */
  menuTitleMany: (n) => `Farbkategorie (${n} Ordner)`,
  menuTitleManyFiles: (n) => `Farbkategorie (${n} Dateien)`,
  menuTitleManyMixed: (n) => `Farbkategorie (${n} Einträge)`,
  assigned: (n, name) =>
    n === 1 ? `1 Ordner → „${name}"` : `${n} Ordner → „${name}"`,
  assignedFiles: (n, name) =>
    n === 1 ? `1 Datei → „${name}"` : `${n} Dateien → „${name}"`,
  assignedMixed: (n, name) =>
    n === 1 ? `1 Eintrag → „${name}"` : `${n} Einträge → „${name}"`,
  removed: (n) =>
    n === 1 ? 'Farbe von 1 Ordner entfernt.' : `Farbe von ${n} Ordnern entfernt.`,
  removedFiles: (n) =>
    n === 1 ? 'Farbe von 1 Datei entfernt.' : `Farbe von ${n} Dateien entfernt.`,
  removedMixed: (n) =>
    n === 1
      ? 'Farbe von 1 Eintrag entfernt.'
      : `Farbe von ${n} Einträgen entfernt.`,
  exampleName: (n) => `Kategorie ${n}`,
  help: 'Hilfe',
  /* Groups: one legend per part of the vault. */
  exampleGroup: 'Legende 1',
  groupNew: 'Neue Gruppe',
  groupNewDefault: 'Neue Gruppe',
  groupName: 'Name der Gruppe',
  deleteGroup: 'Gruppe löschen',
  duplicateGroup: 'Gruppe duplizieren',
  duplicateLabel: 'Duplizieren',
  groupField: 'Gruppe',
  groupSwitch: 'In eine andere Gruppe verschieben',
  copyName: (name) => `${name} (Kopie)`,
  groupDeleteQuestion: (name, n) =>
    n === 0
      ? `Gruppe „${name}" löschen?`
      : `Gruppe „${name}" löschen? ${n === 1 ? 'Die Kategorie darin wird' : `Die ${n} Kategorien darin werden`} mitgelöscht, und Ordner mit diesen Farben verlieren sie.`,
  groupDeleted: (name) => `Gruppe „${name}" gelöscht.`,
  groupCount: (n) => (n === 1 ? '1 Kategorie' : `${n} Kategorien`),
  noCategoriesInGroup: 'In dieser Gruppe ist noch keine Kategorie.',
  /* Order. The list stands upright, the tabs lie down -- hence up/down
     for one and left/right for the other. */
  moveUp: 'Nach oben',
  moveDown: 'Nach unten',
  sortAscending: 'Nach Namen sortieren, A bis Z',
  sortDescending: 'Nach Namen sortieren, Z bis A',
  groupLeft: 'Gruppe nach links',
  groupRight: 'Gruppe nach rechts',
};

/* American spelling ("color"), matching Obsidian itself. */
const TEXTS_EN = {
  menuTitle: 'Color category',
  removeColour: 'Remove color',
  manage: 'Manage categories …',
  toSubfolders: 'Also applies to subfolders',
  toNotes: 'Also applies to the files inside',
  inheritsFrom: (folder, category) => `Inherits "${category}" from "${folder}"`,
  windowTitle: 'Color categories',
  openWindow: 'Manage color categories',
  newCategory: 'New category',
  newCategoryDefault: 'New category',
  remove: 'Delete',
  namePlaceholder: 'Name',
  pickColour: 'Choose the color',
  nothingChosen: 'Select a category on the left.',
  markierung: 'Marker',
  extra: 'Additional',
  inheritance: 'Inheritance',
  areaGroups: 'Groups',
  areaCategories: 'Categories',
  editingFor: 'Editing',
  viewParent: 'Parent',
  viewChildren: 'Children',
  childFollows: 'Same as parent',
  childFollowsHint: 'Children look like the parent. Change anything to give them a look of their own.',
  childOwnHint: 'Children have a look of their own. Everything else still follows the parent.',
  childOnlyWithReach: 'There are no children until something inherits.',
  iconName: 'Icon',
  pickIcon: 'Choose icon …',
  iconLabel: 'Icon name',
  iconUnknown: 'There is no icon of that name.',
  removeIcon: 'Remove',
  iconSearch: 'Search icons',
  iconNothingFound: 'No icon found.',
  iconWindowTitle: 'Choose icon',
  iconReplaces: 'The icon takes the place of the bar and the dot.',
  iconNoEffect: 'With "None" the folder stays unmarked, icon or not.',
  iconMore: (gezeigt, gesamt) => `${gezeigt} of ${gesamt} — narrow the search.`,
  folderCountText: (n) => (n === 1 ? '1 folder' : `${n} folders`),
  deleteQuestion: (name, n) =>
    n === 0
      ? `Delete "${name}"?`
      : `Delete "${name}"? ${n === 1 ? 'One folder loses' : `${n} folders lose`} their color.`,
  deleted: (name) => `"${name}" deleted.`,
  cancel: 'Cancel',
  save: 'Save',
  discard: 'Discard',
  discardQuestion: 'Discard the changes? They will be lost.',
  backup: 'Back up',
  load: 'Restore',
  backupRestored: (name) => `"${name}" is in your downloads folder.`,
  backupInVault: (name) => `Backed up as "${name}" in the vault.`,
  backupFailed: 'The backup could not be written.',
  backupTitle: 'Restore a backup',
  backupEmpty: 'No backup in the vault yet.',
  backupPlace: (folder) => `Backups live in the vault under "${folder}".`,
  backupQuestion: (name) =>
    `Restore "${name}"? It replaces what is in the window -- nothing is written until you press Save.`,
  backupLoaded: 'Restored. Press Save to keep it, Cancel to drop it.',
  backupUnreadable: 'The file cannot be read.',
  backupWithoutCategories: 'The file holds no categories.',
  markerNone: 'None',
  markerBar: 'Bar',
  markerDot: 'Dot',
  hintergrund: 'Background',
  schriftFarbig: 'Colored text',
  fett: 'Bold',
  gedimmt: 'Dim',
  textAutomatic: 'With a background, the plugin picks the text color itself so it stays readable.',
  dimmedHint: 'Dimmed, the whole row steps back: marker and icon fade with it.',
  menuTitleMany: (n) => `Color category (${n} folders)`,
  menuTitleManyFiles: (n) => `Color category (${n} files)`,
  menuTitleManyMixed: (n) => `Color category (${n} items)`,
  assigned: (n, name) =>
    n === 1 ? `1 folder → "${name}"` : `${n} folders → "${name}"`,
  assignedFiles: (n, name) =>
    n === 1 ? `1 file → "${name}"` : `${n} files → "${name}"`,
  assignedMixed: (n, name) =>
    n === 1 ? `1 item → "${name}"` : `${n} items → "${name}"`,
  removed: (n) =>
    n === 1 ? 'Color removed from 1 folder.' : `Color removed from ${n} folders.`,
  removedFiles: (n) =>
    n === 1 ? 'Color removed from 1 file.' : `Color removed from ${n} files.`,
  removedMixed: (n) =>
    n === 1 ? 'Color removed from 1 item.' : `Color removed from ${n} items.`,
  exampleName: (n) => `Category ${n}`,
  help: 'Help',
  exampleGroup: 'Legend 1',
  groupNew: 'New group',
  groupNewDefault: 'New group',
  groupName: 'Group name',
  deleteGroup: 'Delete group',
  duplicateGroup: 'Duplicate group',
  duplicateLabel: 'Duplicate',
  groupField: 'Group',
  groupSwitch: 'Move to another group',
  copyName: (name) => `${name} copy`,
  groupDeleteQuestion: (name, n) =>
    n === 0
      ? `Delete group "${name}"?`
      : `Delete group "${name}"? ${n === 1 ? 'The category in it goes' : `The ${n} categories in it go`} with it, and folders carrying those colors lose them.`,
  groupDeleted: (name) => `Group "${name}" deleted.`,
  groupCount: (n) => (n === 1 ? '1 category' : `${n} categories`),
  noCategoriesInGroup: 'No category in this group yet.',
  moveUp: 'Move up',
  moveDown: 'Move down',
  sortAscending: 'Sort by name, A to Z',
  sortDescending: 'Sort by name, Z to A',
  groupLeft: 'Move group left',
  groupRight: 'Move group right',
};

const LANGUAGES = { de: TEXTS_DE, en: TEXTS_EN };

/* Which language is Obsidian set to?
 *
 * getLanguage() returns the interface language. Checked against
 * Obsidian 1.12.7: it reads the stored setting and falls back to the
 * system language. The value is a tag like "de" or "pt-BR", so only the
 * part before the hyphen matters.
 *
 * English is the fallback rather than any other language: someone whose
 * language is not covered here is far more likely to read English. And
 * if the call fails outright -- an older version, no window -- English
 * is the safe choice too. */
function chooseLanguage() {
  try {
    const tag = String(getLanguage() || '').toLowerCase().split('-')[0];
    return LANGUAGES[tag] || TEXTS_EN;
  } catch (e) {
    return TEXTS_EN;
  }
}

const TEXTS = chooseLanguage();

const MARKERS = [
  { id: 'keine', name: TEXTS.markerNone },
  { id: 'lasche', name: TEXTS.markerBar },
  { id: 'punkt', name: TEXTS.markerDot },
];

/* What a freshly created category starts out with. */
const STYLE_DEFAULT = {
  markierung: 'lasche',
  hintergrund: false,
  schriftFarbig: false,
  fett: false,
  /* Turns a category down instead of up -- for "archive" or "done",
     where the folders should stay findable without drawing the eye.
     The only switch that makes a row quieter; all the others make it
     louder. */
  gedimmt: false,
  /* Inheritance is a property of the category, not of the single
     folder. It used to sit on the folder so that two folders sharing a
     category could behave differently; in practice that case never came
     up, and the switch was hard to find -- it lived in the context menu
     while everything else about a category lives in the window.

     Two fields on purpose: notes must not start taking the colour just
     because subfolders do. */
  vererbt: false,
  vererbtDateien: false,
  /* Kept for reading old data only -- the window does not set it any
     more. migrateChildStyle() turns it into a child style on the first
     start and leaves it in place, so an older version installed
     alongside still finds what it expects.

     Nothing by default: a folder and what inherits from it look the
     same, the way they always did. */
  vaterHervor: 'keine',
};

/* Neutral examples, deliberately meaningless -- users rename them. The
   names come from the language list: they are the first thing anyone
   sees after installing, and an untranslated name would be a poor first
   impression. */
const EXAMPLE_CATEGORIES = [
  { id: 'kat-1', name: TEXTS.exampleName(1), farbe: '#4a90d9', gruppe: 'grp-1' },
  { id: 'kat-2', name: TEXTS.exampleName(2), farbe: '#e05252', gruppe: 'grp-1' },
  { id: 'kat-3', name: TEXTS.exampleName(3), farbe: '#3fb950', gruppe: 'grp-1' },
];

/* Groups are the legend a set of categories belongs to.
 *
 * The same colour means different things in different parts of a vault:
 * red is "software" in one notebook and "cardiologist" in another. With
 * one flat list, six such legends put sixty entries in front of you and
 * the context menu offers all sixty for a folder where nine apply.
 *
 * A group is pure order. It carries no colour, no marker, no icon --
 * only which categories are shown together. Which folder gets which
 * colour is still decided per folder, exactly as before. */
const EXAMPLE_GROUPS = [{ id: 'grp-1', name: TEXTS.exampleGroup }];

const DEFAULT_DATA = {
  gruppen: EXAMPLE_GROUPS,
  kategorien: EXAMPLE_CATEGORIES,
  /* folder path -> category id.
     The only table about folders. Whether a folder passes its colour
     down is not stored here: that hangs off the category, see
     STYLE_DEFAULT above. */
  zuordnung: {},
  /* file path -> category id. Files kept apart from folders on purpose,
     rather than thrown into one table: the two need different CSS
     selectors, and a path alone does not say which it is -- a folder may
     carry a dot in its name just as a file does.
   *
     English key, unlike the German ones around it. Those are what they
     are because renaming them would need a migration step through
     everybody's data.json; a table that starts out empty has nothing to
     carry over, so it follows the house rule that new code is written in
     English. An older version simply does not see it: files lose their
     own colour there and fall back to what they inherit. */
  fileAssignments: {},
};

const STYLE_ID = 'explorer-categories-stil';

/* The phone's backup folder, and only the phone's.
 *
 * On the desktop a backup leaves the vault altogether and goes to the
 * downloads folder -- see writeBackup. A copy inside the vault
 * shares the fate of the file it is meant to survive: the same folder
 * tree, the same sync, the same mishap.
 *
 * The phone has no downloads folder worth the name, so there the backup
 * stays here, where at least it can be reached and shared out.
 *
 * Lower case and no spaces, so the name survives every filesystem and
 * every sync in one piece. */
const BACKUP_FOLDER = 'explorer-categories-backup';

/* Sorts by name, so the file name has to carry the date in an order
   that sorts: year, month, day, hour, minute. */
const timestamp = () => {
  const now = new Date();
  const pad2 = (n) => String(n).padStart(2, '0');
  return (
    `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}` +
    `-${pad2(now.getHours())}${pad2(now.getMinutes())}`
  );
};

/* Where the help link in the footer points.
 *
 * There is no manifest field for this: checked against Obsidian 1.12.7,
 * it knows "authorUrl" and "fundingUrl" but not "helpUrl". So the
 * address lives here, in one place, rather than being guessed from the
 * repository name.
 *
 * An empty string means no help link at all -- a link that goes nowhere
 * is worse than none. It stood empty until the repository existed. */
const HELP_URL = 'https://github.com/jdaehler/explorer-categories';

class ExplorerCategoriesPlugin extends Plugin {
  async onload() {
    const loaded = await this.loadData();
    /* Deep copy of the defaults: otherwise the data would point at the
       very objects declared above, and editing a category would mutate
       the examples along with it. */
    this.data = Object.assign(JSON.parse(JSON.stringify(DEFAULT_DATA)), loaded);
    this.migrateOldData();

    this.styleEl = document.createElement('style');
    this.styleEl.id = STYLE_ID;
    document.head.appendChild(this.styleEl);
    this.writeStyle();

    /* Right-click on a single entry -- folder or file alike. Files were
       excluded until 1.1.0; they are in because the inheritance switch
       already colours every file below a folder, attachments included.
       Leaving them out of the menu meant a coloured PDF with no way to
       change it, which reads as a fault rather than a decision. */
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (file instanceof TFolder || file instanceof TFile) {
          this.buildMenuEntry(menu, [file]);
        }
      })
    );

    /* Right-click on a multi-selection. Obsidian fires a separate event
       for this; "file-menu" does not arrive at all. Users select with
       old-click (single) or shift-click (range) in the file explorer.

       Verified against Obsidian 1.12.7: the file explorer triggers
       "files-menu" with every selected entry and only filters out
       unsupported *files*, never folders. Since 1.1.0 both kinds are
       kept -- the title says which, so a mixed selection cannot claim to
       be five folders when three of them are notes. */
    this.registerEvent(
      this.app.workspace.on('files-menu', (menu, files) => {
        const picked = (files || []).filter(
          (d) => d instanceof TFolder || d instanceof TFile
        );
        if (picked.length) this.buildMenuEntry(menu, picked);
      })
    );

    /* Renaming and moving: the assignment follows the folder. */
    this.registerEvent(
      this.app.vault.on('rename', (file, oldPath) => {
        this.rewritePath(oldPath, file.path);
      })
    );

    /* Deliberately no ribbon icon: the window hangs in the folder's own
       context menu, which is where you already are. The ribbon is
       crowded enough. The command stays so the window is reachable
       without a mouse. */
    this.addCommand({
      id: 'open-categories',
      name: TEXTS.openWindow,
      callback: () => this.openWindow(),
    });
  }

  onunload() {
    if (this.styleEl) this.styleEl.remove();
  }

  openWindow() {
    new CategoriesModal(this.app, this).open();
  }

  /* Three older data shapes have to be carried over so nobody loses
     their settings:
       1. A single appearance for everything (top-level "darstellung").
       2. One appearance per category, but only one of four at a time
          (a "darstellung" field inside the category).
       3. No groups at all -- one flat list of categories.
     The first two are translated into the current shape with four
     independent switches, the third into a single group holding
     everything. */
  migrateOldData() {
    const oldGlobal = this.data.darstellung;
    delete this.data.darstellung;
    delete this.data.darstellungVorgabe;

    for (const cat of this.data.kategorien) {
      if (cat.stil) continue;

      const old = cat.darstellung || oldGlobal;
      delete cat.darstellung;
      cat.stil = styleFromOldShape(old);
    }

    this.migrateInheritance();
    this.migrateChildStyle();
    catchUpGroups(this.data, TEXTS.exampleGroup);
  }

  /* Until 1.1.0 the parent could differ from its children in exactly one
     respect, chosen from a list ("vaterHervor"). That was too narrow --
     a parent with coloured text AND an icon while the children carry
     neither was not expressible at all.
   *
     Now the two sides have separate styles, and the old choice is turned
     into one on the first start. Every case is translated so the tree
     looks the same afterwards as it did before; a category without the
     old field simply gets no child style, which means "children follow
     the parent".
   *
     Runs off the category, not the folder, so it costs one pass over a
     list that is a dozen entries long at most.
   *
     "vaterHervor" is left in the data on purpose rather than deleted. An
     older version of the plugin -- on a phone whose iCloud has not caught
     up -- still reads it and keeps behaving as it did. */
  migrateChildStyle() {
    for (const cat of this.data.kategorien) {
      if (cat.childStyle) continue;

      const stil = Object.assign({}, STYLE_DEFAULT, cat.stil || {});
      const mode = stil.vaterHervor || 'keine';
      if (mode === 'keine') continue;

      /* Only ever had an effect where something inherits. Without that,
         translating it would turn a folder bold that never was. */
      if (!stil.vererbt && !stil.vererbtDateien) continue;

      /* The old wording is "set the parent apart", so each case is read
         as: what did the parent have that the children did not? */
      if (mode === 'fett') {
        cat.stil = Object.assign({}, cat.stil, { fett: true });
        cat.childStyle = { fett: false };
      } else if (mode === 'hintergrund') {
        cat.stil = Object.assign({}, cat.stil, { hintergrund: true });
        cat.childStyle = { hintergrund: false };
      } else if (mode === 'schrift') {
        cat.stil = Object.assign({}, cat.stil, { schriftFarbig: true });
        cat.childStyle = { schriftFarbig: false };
      } else if (mode === 'markierung') {
        /* The parent used to take whichever marker the category did not
           show. Written out now, so nothing has to be worked out at
           drawing time. */
        const other = stil.markierung === 'punkt' ? 'lasche' : 'punkt';
        cat.stil = Object.assign({}, cat.stil, { markierung: other });
        cat.childStyle = { markierung: stil.markierung };
      } else if (mode === 'symbol') {
        /* The one case that works on the icon rather than the style. */
        cat.childStyle = { icon: null };
      } else if (mode === 'blass') {
        /* The odd one out: it never touched the parent, it took the
           children back. */
        cat.childStyle = { gedimmt: true };
      }
    }
  }

  /* Inheritance used to be two tables of folder paths. It is a property
     of the category now, so the old flags are carried over: a category
     inherits from now on if at least one of its folders used to.
     Deliberately generous rather than exact -- the alternative is a
     folder that quietly loses a colour it had yesterday, and that is
     harder to notice than one that has too much. */
  migrateInheritance() {
    const applyStyle = (path, field) => {
      const catId = this.data.zuordnung[path];
      if (!catId) return;
      const cat = this.data.kategorien.find((k) => k.id === catId);
      if (!cat) return;
      cat.stil = Object.assign({}, STYLE_DEFAULT, cat.stil || {}, { [field]: true });
    };

    for (const path of Object.keys(this.data.inheritance || {})) {
      if (this.data.inheritance[path]) applyStyle(path, 'vererbt');
    }
    for (const path of Object.keys(this.data.dateiVererbung || {})) {
      if (this.data.dateiVererbung[path]) applyStyle(path, 'vererbtDateien');
    }

    delete this.data.inheritance;
    delete this.data.dateiVererbung;
  }

  /* The categories of one group, in the order they are stored. */
  categoriesIn(groupId) {
    return this.data.kategorien.filter((k) => k.gruppe === groupId);
  }

  async addGroup() {
    const id = newId('grp', this.data.gruppen.map((g) => g.id));
    this.data.gruppen.push({ id, name: TEXTS.groupNewDefault });
    await this.save();
    return id;
  }

  async renameGroup(groupId, name) {
    const gruppe = this.data.gruppen.find((g) => g.id === groupId);
    if (!gruppe) return;
    gruppe.name = name;
    await this.save();
  }

  /* Moves a group one place along the strip of tabs. The array is the
     order -- nothing sorts anywhere else, so swapping two entries is the
     whole job.

     Says whether anything moved, so the window can leave itself alone
     when the group is already at the end. */
  async moveGroup(groupId, direction) {
    const gruppen = this.data.gruppen;
    const from = gruppen.findIndex((g) => g.id === groupId);
    if (from < 0) return false;

    const to = from + direction;
    if (to < 0 || to >= gruppen.length) return false;

    const keep = gruppen[from];
    gruppen[from] = gruppen[to];
    gruppen[to] = keep;

    await this.save();
    return true;
  }

  /* Copies a whole legend: the group and every category in it.
   *
   * Made for the case the groups exist for -- one legend per book. A new
   * book with a similar legend would otherwise mean building nine
   * categories again by hand.
   *
   * The copied group lands directly behind the original, so it stands
   * where it was made rather than at the far end of the tab strip.
   *
   * The categories are appended at the end of the array. Order only ever
   * counts within a group, and these are all new, so appending keeps
   * them in the order they were copied in.
   *
   * Only the group's name gets "(copy)". The categories keep theirs --
   * the legend is being copied, not renamed.
   *
   * The folder assignments stay behind on purpose. A copy colouring the
   * same folders would put two categories on one folder, and the tree
   * can only show one. */
  async duplicateGroup(groupId) {
    const gruppen = this.data.gruppen;
    const from = gruppen.findIndex((g) => g.id === groupId);
    if (from < 0) return null;

    const template = gruppen[from];
    const fresh = {
      id: newId('grp', gruppen.map((g) => g.id)),
      name: TEXTS.copyName(template.name),
    };
    gruppen.splice(from + 1, 0, fresh);

    /* The ids taken grow with every copy made here -- all of them fall
       in the same millisecond, so asking the array once at the start
       would not be enough. */
    const assigned = this.data.kategorien.map((k) => k.id);
    for (const cat of this.categoriesIn(groupId)) {
      const id = newId('kat', assigned);
      assigned.push(id);
      this.data.kategorien.push(this.categoryCopy(cat, id, fresh.id, cat.name));
    }

    await this.save();
    return fresh.id;
  }

  /* Copies a category with everything that makes it look the way it
     does, and puts the copy directly behind the original -- the place
     you were looking at when you asked for it.

     No folder assignments, same reason as above. */
  async duplicateCategory(catId) {
    const all = this.data.kategorien;
    const from = all.findIndex((k) => k.id === catId);
    if (from < 0) return null;

    const template = all[from];
    const id = newId('kat', all.map((k) => k.id));

    all.splice(
      from + 1,
      0,
      this.categoryCopy(template, id, template.gruppe, TEXTS.copyName(template.name))
    );

    await this.save();
    return id;
  }

  /* Moves a category into another group.
   *
   * Only the field changes -- the folders keep their colour, because
   * they point at the category and the category still exists. A group
   * says which categories are shown together, nothing more.
   *
   * It goes to the end of the array so it lands last in its new group.
   * Left where it was, its place among the others would depend on which
   * entries of that group happen to sit before or after it -- arriving
   * at the bottom is at least predictable. */
  async moveCategoryToGroup(catId, groupId) {
    const all = this.data.kategorien;
    const from = all.findIndex((k) => k.id === catId);
    if (from < 0) return false;
    if (all[from].gruppe === groupId) return false;
    if (!this.data.gruppen.some((g) => g.id === groupId)) return false;

    const cat = all[from];
    cat.gruppe = groupId;
    all.splice(from, 1);
    all.push(cat);

    await this.save();
    return true;
  }

  /* One category, copied. The style is copied over STYLE_DEFAULT rather
     than handed on: sharing the object would tie the two categories
     together, and a switch flipped on one would move on the other. */
  categoryCopy(template, id, groupId, name) {
    return {
      id,
      name,
      farbe: template.farbe,
      gruppe: groupId,
      icon: template.icon || null,
      stil: Object.assign({}, STYLE_DEFAULT, template.stil || {}),
    };
  }

  /* Deletes the group and everything in it. The categories cannot stay
     behind: a category outside every group would show up nowhere and be
     impossible to get at again.

     Never the last one. Without a group there is no place to put a new
     category, and the window would have nothing to show. */
  async deleteGroup(groupId) {
    if (this.data.gruppen.length < 2) return false;

    for (const cat of this.categoriesIn(groupId)) {
      this.removeAssignments(cat.id);
    }

    this.data.kategorien = this.data.kategorien.filter(
      (k) => k.gruppe !== groupId
    );
    this.data.gruppen = this.data.gruppen.filter((g) => g.id !== groupId);

    await this.save();
    return true;
  }

  /* Drops every assignment pointing at a category. Used when a category
     or a whole group is deleted -- an assignment left pointing at
     something gone would colour nothing and sit in the file forever.
     The inheritance flags need no cleaning up: they went with the
     category. */
  removeAssignments(catId) {
    for (const table of this.assignmentTables()) {
      for (const path of Object.keys(table)) {
        if (table[path] === catId) delete table[path];
      }
    }
  }

  /* Both tables, folders first. Everything that has to treat an
     assignment as an assignment -- deleting a category, counting, a
     rename -- walks them through here instead of naming them one by
     one and forgetting the second.
   *
     Reads only, and never creates the file table on the way: data older
     than 1.1.0 has no such key, and quietly adding an empty one would
     count as an edit the moment the draft is compared against its
     safety copy. A rename arriving from outside would then have the
     window asking whether to throw away changes nobody made. */
  assignmentTables() {
    return [this.data.zuordnung || {}, this.data.fileAssignments || {}];
  }

  /* Which table an entry belongs in. The caller knows whether it is
     holding a folder or a file; a path on its own does not say, because
     a folder may carry a dot in its name just as a file does.
   *
     This one does create the table -- it is only ever called to write
     into it, and the write itself is the change. */
  tableFor(ordner) {
    if (ordner) return this.data.zuordnung;
    if (!this.data.fileAssignments) this.data.fileAssignments = {};
    return this.data.fileAssignments;
  }

  assignmentOf(path, ordner) {
    return this.tableFor(ordner)[path] || null;
  }

  styleOf(catId) {
    const cat = this.data.kategorien.find((k) => k.id === catId);
    if (!cat) return null;
    return Object.assign({}, STYLE_DEFAULT, cat.stil || {});
  }

  /* How the inheriting rows are drawn. Null means "same as the folder
     that carries the category" -- that is the default, and it is what
     every category did before 1.1.0.
   *
     The reach switches are deliberately not part of it: how far a colour
     carries is a property of the category, not of a single row, and two
     places to set it would drift apart. */
  childStyleOf(catId) {
    const cat = this.data.kategorien.find((k) => k.id === catId);
    if (!cat || !cat.childStyle) return null;
    return Object.assign({}, STYLE_DEFAULT, cat.stil || {}, cat.childStyle);
  }

  /* The icon the inheriting rows carry. Undefined in the child style
     means "same as the parent"; an explicit null means "none", which is
     how a parent keeps an icon the children do not get. */
  childIconOf(catId) {
    const cat = this.data.kategorien.find((k) => k.id === catId);
    if (!cat) return null;
    if (cat.childStyle && 'icon' in cat.childStyle) return cat.childStyle.icon;
    return cat.icon || null;
  }

  /* Which folder further up gives this one its color? Searched from
     near to far, because the closest ancestor wins -- the same order the
     CSS rules are sorted in.
   *
     Which switch counts depends on what is asking. A subfolder follows
     "vererbt", a file follows "vererbtDateien" -- the two are separate
     switches, and answering with the wrong one would name a source the
     colour does not actually come from. */
  inheritsFrom(path, ordner = true) {
    const field = ordner ? 'vererbt' : 'vererbtDateien';
    const parts = path.split('/');

    for (let i = parts.length - 1; i > 0; i--) {
      const parents = parts.slice(0, i).join('/');
      const catId = this.data.zuordnung[parents];
      if (!catId) continue;
      const stil = this.styleOf(catId);
      if (!stil || !stil[field]) continue;
      const cat = this.data.kategorien.find((k) => k.id === catId);
      if (cat) return { folder: parents, category: cat.name };
    }

    return null;
  }

  /* ---------------------------------------------------------------- */
  /* Context menu                                                      */
  /* ---------------------------------------------------------------- */

  /* Takes a list of entries, never a single one. Right-clicking one
     folder simply passes a list of one -- that way there is a single
     path through this code instead of two that drift apart.
   *
     Folders and files travel together here and part company only where
     they have to: which table an assignment is written to, and which
     word the count is given in. */
  buildMenuEntry(menu, items) {
    const entries = items.map((o) => ({
      path: o.path,
      ordner: o instanceof TFolder,
    }));
    const paths = entries.map((e) => e.path);
    const several = paths.length > 1;

    const folderCount = entries.filter((e) => e.ordner).length;
    const fileCount = entries.length - folderCount;
    /* Which of the three wordings the count gets. A pure selection is
       named for what it is; a mixed one falls back to "items". */
    const countTitle = (n) => {
      if (!fileCount) return TEXTS.menuTitleMany(n);
      if (!folderCount) return TEXTS.menuTitleManyFiles(n);
      return TEXTS.menuTitleManyMixed(n);
    };

    /* One flat lookup over both tables. A path is either a folder or a
       file, never both, so the two cannot collide here -- and the check
       for a shared category stays the one function it always was. */
    const lookup = {};
    for (const e of entries) {
      lookup[e.path] = this.assignmentOf(e.path, e.ordner) || undefined;
    }

    /* With several entries, a checkmark only when all of them really
       share a category. Otherwise the mark would claim something that
       is wrong for half of the selection. */
    const current = sharedCategory(lookup, paths);
    /* For "remove", a single coloured entry in the selection is enough
       -- otherwise it would be missing exactly when it is needed. */
    const anyOf = paths.some((p) => lookup[p]);

    /* One row per category. Pulled out because it is needed in three
       places: flat, inside the one submenu, and inside a group's
       submenu. */
    const catRows = (target, kategorien, title) => {
      for (const cat of kategorien) {
        target.addItem((i) =>
          i
            .setTitle(title(cat.name))
            .setChecked(current === cat.id)
            .onClick(() => this.assignMany(entries, cat.id))
        );
      }
    };

    /* The entries are identical either way; only the place differs:
       inside a submenu, or flat in the main menu.

       "mitUnter" says whether this Obsidian has submenus at all. It is
       known from the outer entry: if that one could not open a submenu,
       nothing below it can either. */
    const fillEntries = (target, mitPraefix, mitUnter) => {
      const head = several ? countTitle(paths.length) : TEXTS.menuTitle;
      const title = (t) => (mitPraefix ? `${head}: ${t}` : t);

      const gruppen = this.data.gruppen;

      /* A single legend gets no level of its own. A submenu that always
         holds exactly one thing is a click for nothing -- and until
         somebody sets up a second legend, that is every vault. */
      if (gruppen.length < 2 || !mitUnter) {
        for (const gruppe of gruppen) {
          const cats = this.categoriesIn(gruppe.id);
          if (!cats.length) continue;
          /* Flat with several legends: the group name has to travel
             with each entry, or two identical reds give no clue which
             legend they belong to. */
          const withGroup =
            gruppen.length < 2 ? title : (t) => title(`${gruppe.name}: ${t}`);
          catRows(target, cats, withGroup);
        }
      } else {
        for (const gruppe of gruppen) {
          const cats = this.categoriesIn(gruppe.id);
          /* An empty legend would be a submenu that opens on nothing. */
          if (!cats.length) continue;

          target.addItem((entry) => {
            entry.setTitle(gruppe.name);
            const below = entry.setSubmenu();
            catRows(below, cats, (t) => t);
          });
        }
      }

      /* If the folder inherits from above, say so here -- otherwise you
         see a color, find nothing about it in the menu, and blame the
         plugin. Single folder only: twenty selected folders would mean
         twenty different sources, which fits in no single line. */
      const source =
        !several && current === null
          ? this.inheritsFrom(paths[0], entries[0].ordner)
          : null;
      if (source) {
        if (typeof target.addSeparator === 'function') target.addSeparator();
        target.addItem((i) => {
          i.setTitle(
            title(TEXTS.inheritsFrom(source.folder, source.category))
          ).setIcon('git-branch');
          /* Information only, not a button. */
          if (typeof i.setDisabled === 'function') i.setDisabled(true);
        });
      }

      /* Removal sits at the bottom, and only when there is something to
         remove. Up among the categories it read as just another
         category rather than an action.

         The two inheritance switches used to sit here as well. They are
         in the window now, on the category: the same switch in two
         places drifts apart, and everything else about a category is
         set there too. */
      if (anyOf) {
        if (typeof target.addSeparator === 'function') target.addSeparator();

        target.addItem((i) =>
          i
            .setTitle(title(TEXTS.removeColour))
            .setIcon('eraser')
            .onClick(() => this.assignMany(entries, null))
        );
      }

      /* The way into the window lives here so the ribbon icon can be
         left out entirely. */
      if (typeof target.addSeparator === 'function') target.addSeparator();
      target.addItem((i) =>
        i
          .setTitle(title(TEXTS.manage))
          .setIcon('settings')
          .onClick(() => this.openWindow())
      );
    };

    /* Submenus only exist in newer Obsidian versions. Without them the
       categories go flat into the menu rather than disappearing. */
    let submenuBuilt = false;

    menu.addItem((entry) => {
      entry
        .setTitle(several ? countTitle(paths.length) : TEXTS.menuTitle)
        .setIcon('palette');
      if (typeof entry.setSubmenu !== 'function') return;

      const below = entry.setSubmenu();
      if (!below || typeof below.addItem !== 'function') return;

      fillEntries(below, false, true);
      submenuBuilt = true;
    });

    if (!submenuBuilt) fillEntries(menu, true, false);
  }

  /* ---------------------------------------------------------------- */
  /* Data                                                              */
  /* ---------------------------------------------------------------- */

  /* Shows and stores are two different things, and only the second one
     touches a file. While the window is open, a change repaints the tree
     but writes nothing -- that is what makes "Cancel" possible without
     giving up the live preview. Rebuilding the stylesheet costs 0.048 ms
     (measured 2026-08-29), so doing it on every keystroke is free.

     Outside the window -- assigning a folder from the context menu --
     nothing is pending and this writes straight away, as it always
     did. */
  async save() {
    if (this.draftRunning) {
      this.writeStyle();
      return;
    }
    await this.saveData(this.data);
    this.writeStyle();
  }

  /* --- Backups ----------------------------------------------------- */

  /* Writes the whole of the data as one readable JSON file.
   *
   * Indented rather than packed: this file exists to be looked at and
   * carried off, and a category list is a few kilobytes either way.
   *
   * The wrapper around the data carries the version that wrote it. A
   * file restored two years from now runs through migrateOldData()
   * like any other old shape, and the number says what to expect.
   *
   * What gets written is what is on screen, unsaved edits and all --
   * this.data is the draft while the window is open. That is the state
   * somebody pressing "Back up" is looking at, and backing up a
   * different one than the visible one would be a trap. It does mean a
   * backup can outlive a Cancel: the file stays, the edits do not. */
  async writeBackup() {
    const name = `categories-${timestamp()}.json`;
    const body = JSON.stringify(
      {
        plugin: 'explorer-categories',
        version: this.manifest ? this.manifest.version : '',
        written: new Date().toISOString(),
        data: this.data,
      },
      null,
      2
    );

    /* On the desktop the file leaves the vault entirely.
     *
     * A copy inside the vault shares everything with the file it is
     * meant to survive -- the same folder tree, the same sync, the same
     * mishap. In the downloads folder it is a genuine second copy, on
     * disk, outside iCloud.
     *
     * Verified in Obsidian on 2026-08-29: a link with a download
     * attribute writes straight into the downloads folder, no prompt,
     * no Electron internals involved. */
    if (Platform.isDesktopApp) {
      const url = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      /* Released a moment later, not at once: revoking while the write
         is still running can cut the file short. */
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      return { name, imVault: false };
    }

    /* The phone has no downloads folder to speak of, so there the backup
       stays in the vault -- reachable rather than nowhere. */
    const adapter = this.app.vault.adapter;
    if (!(await adapter.exists(BACKUP_FOLDER))) {
      await adapter.mkdir(BACKUP_FOLDER);
    }
    await adapter.write(`${BACKUP_FOLDER}/${name}`, body);
    return { name, imVault: true };
  }

  /* Newest first -- the name sorts by date, so reversing the plain sort
     is enough and no file has to be opened to order the list. */
  async findBackups() {
    const adapter = this.app.vault.adapter;
    if (!(await adapter.exists(BACKUP_FOLDER))) return [];

    const body = await adapter.list(BACKUP_FOLDER);
    return (body.files || [])
      .filter((path) => path.endsWith('.json'))
      .sort()
      .reverse();
  }

  /* Reads one and hands back its data, or throws with a sentence that
     can go straight in front of a person.
   *
   * Both shapes are accepted: the wrapper this plugin writes, and a bare
   * data object -- somebody exporting by copying data.json by hand ends
   * up with the second one, and refusing it would be pedantry.
   *
   * Categories are the one thing checked for. Without them there is
   * nothing to restore, and quietly replacing a working set of colours
   * with an empty one is the worst outcome this window has. */
  /* The check itself, on text. Split off from reading so the file picker
     and the vault list run through exactly the same one -- a file chosen
     from the downloads folder deserves no less scrutiny than one lying
     inside the vault. */
  backupFromText(text) {
    let raw;
    try {
      raw = JSON.parse(text);
    } catch (e) {
      throw new Error(TEXTS.backupUnreadable);
    }

    const data = raw && raw.data ? raw.data : raw;
    if (!data || !Array.isArray(data.kategorien) || !data.kategorien.length) {
      throw new Error(TEXTS.backupWithoutCategories);
    }
    return data;
  }

  async readBackup(path) {
    let text;
    try {
      text = await this.app.vault.adapter.read(path);
    } catch (e) {
      throw new Error(TEXTS.backupUnreadable);
    }
    return this.backupFromText(text);
  }

  /* Puts a backup in place of what is on screen -- in the draft, so Save
     confirms it and Cancel puts the old one back. Restoring is the one
     action in this window that replaces everything at once, which makes
     the way back matter more here than anywhere else.
   *
     Runs through the same defaults and the same migration as a normal
     start, so a file from an older version arrives in today's shape
     instead of half-filled. */
  restoreBackup(data) {
    this.data = Object.assign(
      JSON.parse(JSON.stringify(DEFAULT_DATA)),
      JSON.parse(JSON.stringify(data))
    );
    this.migrateOldData();
    this.writeStyle();
  }

  /* The safety copy is taken once, when the window opens. Everything
     below works on this.data as before -- not a single other method
     had to change for this. Cancelling means putting the copy back. */
  startDraft() {
    this.original = JSON.parse(JSON.stringify(this.data));
    this.draftRunning = true;
  }

  async commitDraft() {
    this.draftRunning = false;
    this.original = null;
    await this.save();
  }

  discardDraft() {
    if (!this.draftRunning) return;
    if (this.original) this.data = this.original;
    this.original = null;
    this.draftRunning = false;
    /* Repaints from the restored data, so the tree jumps back to where
       it was before the window opened. */
    this.writeStyle();
  }

  /* Compared as text on purpose: the data is a handful of kilobytes of
     plain JSON, and this catches a change anywhere in it -- colour,
     name, switch, a deleted group -- without a list of fields that
     would go stale the next time one is added. */
  draftChanged() {
    if (!this.draftRunning || !this.original) return false;
    return JSON.stringify(this.data) !== JSON.stringify(this.original);
  }

  /* Changes every entry and then saves ONCE. With forty selected
     folders, forty separate writes to data.json would be most of the
     waiting time -- and the stylesheet would be rebuilt forty times
     over.
   *
     Takes {path, ordner} pairs rather than plain paths: the pair says
     which of the two tables the assignment belongs in, and the caller
     had that in hand anyway. */
  async assignMany(entries, catId) {
    for (const { path, ordner } of entries) {
      const table = this.tableFor(ordner);
      if (catId === null) delete table[path];
      else table[path] = catId;
    }
    await this.save();

    /* Feedback only for multiple entries: with a single one you see the
       color appear in the explorer straight away, so a notice would just
       be in the way. With forty, the entries that changed may not even
       be on screen. */
    if (entries.length > 1) {
      const n = entries.length;
      const folders = entries.filter((e) => e.ordner).length;
      const pick = (plain, files, mixed) =>
        folders === n ? plain : folders === 0 ? files : mixed;

      if (catId === null) {
        new Notice(
          pick(TEXTS.removed, TEXTS.removedFiles, TEXTS.removedMixed)(n)
        );
      } else {
        const cat = this.data.kategorien.find((k) => k.id === catId);
        if (cat) {
          new Notice(
            pick(TEXTS.assigned, TEXTS.assignedFiles, TEXTS.assignedMixed)(
              n,
              cat.name
            )
          );
        }
      }
    }
  }

  /* How many entries hang off this category? Needed before deleting, so
     nobody throws something away blind. Folders and files counted
     together: what matters here is how much loses its colour, not what
     kind of thing it was. */
  folderCount(catId) {
    return this.assignmentTables().reduce(
      (sum, table) =>
        sum + Object.values(table).filter((id) => id === catId).length,
      0
    );
  }

  /* A new category always lands in a group -- the one the window is
     showing. There is no such thing as a category outside every group:
     it would appear nowhere and could never be reached again. */
  async addCategory(groupId) {
    const id = newId('kat', this.data.kategorien.map((k) => k.id));
    this.data.kategorien.push({
      id,
      name: TEXTS.newCategoryDefault,
      farbe: randomColour(),
      gruppe: groupId || this.data.gruppen[0].id,
      stil: Object.assign({}, STYLE_DEFAULT),
    });
    await this.save();
    return id;
  }

  async changeCategory(catId, felder) {
    const cat = this.data.kategorien.find((k) => k.id === catId);
    if (!cat) return;
    Object.assign(cat, felder);
    await this.save();
  }

  async changeStyle(catId, felder) {
    const cat = this.data.kategorien.find((k) => k.id === catId);
    if (!cat) return;
    cat.stil = Object.assign({}, STYLE_DEFAULT, cat.stil || {}, felder);
    await this.save();
  }

  /* The child style holds differences, not a second full copy.
   *
     That is the whole point: change the category's colour, its marker or
     anything else on the parent, and the children follow -- except in
     the one or two respects somebody deliberately set apart. A full copy
     would freeze the children at the moment they were separated, and
     every later change to the category would have to be made twice.
   *
     A category with no child style at all is the normal case and means
     "children look like the parent". */
  async changeChildStyle(catId, felder) {
    const cat = this.data.kategorien.find((k) => k.id === catId);
    if (!cat) return;
    cat.childStyle = Object.assign({}, cat.childStyle || {}, felder);
    await this.save();
  }

  /* The icon sits beside the style rather than in it, so it needs its own
     way in. Null means "no icon for the children" and is a real setting,
     which is why it cannot be expressed by leaving the field out. */
  async changeChildIcon(catId, name) {
    const cat = this.data.kategorien.find((k) => k.id === catId);
    if (!cat) return;
    cat.childStyle = Object.assign({}, cat.childStyle || {}, { icon: name });
    await this.save();
  }

  /* Back to "children look like the parent". Drops the differences
     rather than filling them with the parent's values: the second would
     look the same today and stop following tomorrow. */
  async childFollowParent(catId) {
    const cat = this.data.kategorien.find((k) => k.id === catId);
    if (!cat) return;
    delete cat.childStyle;
    await this.save();
  }

  async deleteCategory(catId) {
    this.data.kategorien = this.data.kategorien.filter((k) => k.id !== catId);
    /* Without a category there is nothing left to inherit either. An
       inheritance flag left behind would quietly take effect again the
       next time the same folder is assigned one. */
    this.removeAssignments(catId);
    await this.save();
  }

  /* Moves a category one place within its own group.
   *
   * All categories of all groups lie in ONE array; categoriesIn() only
   * filters it. So the neighbour to swap with is not the next entry in
   * the array but the next one carrying the same group -- everything in
   * between belongs to other groups and is skipped.
   *
   * Swapping the two absolute positions leaves every skipped entry
   * exactly where it was, so the order inside the other groups cannot be
   * disturbed by moving something here. */
  async moveCategory(catId, direction) {
    const all = this.data.kategorien;
    const from = all.findIndex((k) => k.id === catId);
    if (from < 0) return false;

    const gruppe = all[from].gruppe;
    let to = from + direction;
    while (to >= 0 && to < all.length && all[to].gruppe !== gruppe) {
      to += direction;
    }
    if (to < 0 || to >= all.length) return false;

    const keep = all[from];
    all[from] = all[to];
    all[to] = keep;

    await this.save();
    return true;
  }

  /* Sorts one group by name and leaves every other group where it is.
   *
   * Same trick as the arrows above, for the same reason: the categories
   * all sit in one flat list, and a group is a field on each of them. So
   * this works on the SLOTS this group occupies -- collect the positions,
   * sort what stands in them, write it back into the same positions.
   * Every entry belonging to another group keeps its index untouched.
   *
   * localeCompare rather than a plain comparison: that is the difference
   * between "Archiv" landing next to "Ableton" and landing after "Zoom",
   * and it is what puts umlauts where a person looks for them.
   *
   * Below two entries there is nothing to sort, and the buttons are dead
   * anyway -- the check is here as well so the method holds on its own. */
  async sortCategories(groupId, absteigend) {
    const all = this.data.kategorien;

    const slots = [];
    for (let i = 0; i < all.length; i++) {
      if (all[i].gruppe === groupId) slots.push(i);
    }
    if (slots.length < 2) return false;

    const sorted = slots
      .map((i) => all[i])
      .sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
      );
    if (absteigend) sorted.reverse();

    slots.forEach((slot, i) => {
      all[slot] = sorted[i];
    });

    await this.save();
    return true;
  }

  /* Renaming or moving a folder changes the paths of everything inside
     it too. So not just the one key, but every key below it. */
  async rewritePath(old, fresh) {
    /* Two tables to carry along, folders and files. Inheritance needs no
       rewriting since it moved to the category -- it knows no paths.

       A renamed folder is written in both: its own key sits in the
       folder table, and every file coloured below it sits in the file
       one. Missing the second would strip a note of its own colour the
       moment the folder above it is moved. */
    let changed = false;
    for (const table of this.assignmentTables()) {
      if (rewriteKeys(table, old, fresh)) changed = true;
    }

    /* The safety copy has to follow along. A rename can arrive while
       the window is open -- not by right-click, the modal blocks that,
       but from outside: a sync from the phone, a move in Finder. It is
       not one of the edits made in this window, so Cancel must not take
       it back. Without this, Cancel puts back the copy taken when the
       window opened, still holding the old path, and the assignment
       points at a folder that no longer exists.
       Rewriting both keeps draftChanged() quiet as well: a rename from
       outside is nothing the user typed here, so it must not make the
       window ask "throw away your changes?". */
    if (this.draftRunning && this.original) {
      const copies = [
        this.original.zuordnung,
        this.original.fileAssignments,
      ].filter(Boolean);
      let copyChanged = false;
      for (const table of copies) {
        if (rewriteKeys(table, old, fresh)) copyChanged = true;
      }
      if (copyChanged) {
        /* And straight to disk. save() deliberately writes nothing while
           the window is open -- that is what makes Cancel possible. But
           this.original IS what stands on disk (nothing else writes
           during a draft), so writing it costs nothing and carries no
           unsaved edit with it. Without this the rename would live in
           memory only: cancel, restart Obsidian before saving anything,
           and the dead path is back. */
        await this.saveData(this.original);
        changed = true;
      }
    }

    if (changed) await this.save();
  }

  /* ---------------------------------------------------------------- */
  /* Building the stylesheet                                           */
  /* ---------------------------------------------------------------- */

  colourOf(catId) {
    const cat = this.data.kategorien.find((k) => k.id === catId);
    return cat ? cat.farbe : null;
  }

  iconOf(catId) {
    const cat = this.data.kategorien.find((k) => k.id === catId);
    return cat && cat.icon ? cat.icon : null;
  }

  /* Fetches an icon from Obsidian and turns it into a CSS mask.
   *
   * Obsidian ships the icons itself, so the plugin carries no icon set
   * of its own that could go stale, and an icon looks like the rest of
   * the interface.
   *
   * The icons are strokes, not filled shapes. For a mask only the drawn
   * parts count -- the colour underneath comes from the category.
   *
   * WHAT HAS TO BE FILLED IN HERE
   * Inside a data: URI, Obsidian's CSS no longer applies. Verified
   * against Obsidian 1.12.7: the rule "svg.svg-icon" sets width, height
   * and stroke-width, and only those three. Without them stroke-width
   * falls back to the SVG default of 1, and the icon would come out
   * thinner in the explorer than anywhere else in Obsidian. At the small
   * sizes (s and xs, the range used in the file tree) it is 2.
   *
   * The fill is deliberately left alone -- it lives in the SVG itself,
   * and that rule says nothing about it. A blanket fill="none" would
   * make the few filled icons invisible.
   *
   * The stroke colour is pinned to black because "currentColor" would
   * have nothing to refer to inside a data: URI. For a mask all that
   * matters is that something opaque is drawn at all.
   *
   * The result is cached because writeStyle runs on every change, and
   * the drawing would otherwise start from scratch each time. */
  maskOf(id) {
    if (!this.maskCache) this.maskCache = new Map();
    if (this.maskCache.has(id)) return this.maskCache.get(id);

    let mask = null;

    /* If anything fails here -- an older Obsidian, an icon that no
       longer exists -- this stays null and the folder falls back to its
       bar or dot. No reason to let the whole stylesheet fail. */
    try {
      const holder = document.createElement('div');
      setIcon(holder, id);
      const svg = holder.querySelector('svg');

      if (svg) {
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('stroke', '#000');
        if (!svg.getAttribute('stroke-width')) svg.setAttribute('stroke-width', '2');

        /* Take width and height from the viewBox instead of hardcoding
           24: the Lucide icons are all 24 wide, but Obsidian's own icons
           need not be. A wrong aspect ratio would distort the icon. */
        const box = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/);
        const width = box.length === 4 ? box[2] : '24';
        const height = box.length === 4 ? box[3] : '24';
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        /* The class pulls in Obsidian's rule, which does not exist
           inside a data: URI -- and an inline style could reference CSS
           variables. Both would be inert here, and misleading. */
        svg.removeAttribute('class');
        svg.removeAttribute('style');
        mask = svgToMask(svg.outerHTML);
      }
    } catch (e) {
      mask = null;
    }

    this.maskCache.set(id, mask);
    return mask;
  }

  writeStyle() {
    this.styleEl.textContent = buildRules(
      buildTargets(this.data, (catId) => ({
        farbe: this.colourOf(catId),
        stil: this.styleOf(catId),
        icon: this.iconOf(catId),
        childStil: this.childStyleOf(catId),
        childIcon: this.childIconOf(catId),
      })),
      (id) => this.maskOf(id)
    );
  }
}

/* ------------------------------------------------------------------ */
/* The management window                                               */
/* ------------------------------------------------------------------ */

/* List on the left, settings on the right. This keeps the window the
   same height whether there are three categories or thirty. On narrow
   screens the two stack instead. */
class CategoriesModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;

    this.chosenGroup = plugin.data.gruppen[0].id;
    const first = plugin.categoriesIn(this.chosenGroup)[0];
    this.chosen = first ? first.id : null;

    /* Which of the two looks the right-hand panel edits. Always starts
       at the parent: that is the one every category has, and for the
       many that pass nothing down it is the only one. */
    this.ansicht = 'vater';
  }

  onOpen() {
    this.modalEl.addClass('fc-window');
    this.plugin.startDraft();
    this.draw();
  }

  /* The last line of defence. Whoever gets here without going through
     Save has cancelled -- by the X, by Escape, by clicking beside the
     window, or because Obsidian closed it. Discarding is the safe
     direction: the file on disk is still the old one either way, so the
     tree must show the old one too. */
  onClose() {
    this.plugin.discardDraft();
    this.contentEl.empty();
  }

  /* Asks before throwing work away. Obsidian routes the X, Escape and
     the click beside the window through close(), so one place is
     enough. On the phone a tap beside the window is easy to trigger by
     accident, and without this everything set would be gone. */
  close() {
    if (!this.plugin.draftChanged()) {
      super.close();
      return;
    }
    new ConfirmModal(
      this.app,
      TEXTS.discardQuestion,
      async () => {
        this.plugin.discardDraft();
        super.close();
      },
      TEXTS.discard
    ).open();
  }

  /* Builds the frame. Only called when the structure changes -- not
     while typing in the name field, or the caret would jump out. */
  draw() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: TEXTS.windowTitle });

    this.tabsEl = contentEl.createDiv({ cls: 'fc-tab' });
    this.fillTabs();

    const columns = contentEl.createDiv({ cls: 'fc-columns' });
    this.listEl = columns.createDiv({ cls: 'fc-list' });
    this.detailEl = columns.createDiv({ cls: 'fc-detail' });

    this.fillList();
    this.fillDetail();

    /* Cancel first, Save on the right and highlighted: the same order
       Obsidian uses in its own dialogs, so the finishing button sits
       where the hand already expects it. */
    const footer = contentEl.createDiv({ cls: 'fc-footer' });

    /* Backing up and restoring sit apart from Cancel and Save, on the
       left. They are about the file on disk, not about this session's
       edits, and a hand reaching for Save should not find Restore next
       to it. */
    const backups = footer.createDiv({ cls: 'fc-footeraside' });

    const backupButton = backups.createEl('button', { text: TEXTS.backup });
    backupButton.addEventListener('click', async () => {
      try {
        const state = await this.plugin.writeBackup();
        new Notice(
          state.imVault
            ? TEXTS.backupInVault(state.name)
            : TEXTS.backupRestored(state.name)
        );
      } catch (e) {
        new Notice(TEXTS.backupFailed);
      }
    });

    const loadButton = backups.createEl('button', { text: TEXTS.load });
    loadButton.addEventListener('click', () => {
      if (Platform.isDesktopApp) this.pickBackupFile();
      else this.pickBackupInVault();
    });

    const cancel = footer.createEl('button', { text: TEXTS.cancel });
    cancel.addEventListener('click', () => this.close());

    const backup = footer.createEl('button', {
      text: TEXTS.save,
      cls: 'mod-cta',
    });
    backup.addEventListener('click', async () => {
      await this.plugin.commitDraft();
      super.close();
    });

    this.drawOrigin(contentEl);
  }

  /* A thin line at the very bottom: name, version, author, help.
   *
   * All of it read from the manifest, nothing duplicated here, so the
   * version can never go stale -- it is maintained in exactly one
   * place, manifest.json.
   *
   * Obsidian does show version and author in its settings too, but
   * someone with this window open is not there. */
  drawOrigin(target) {
    const m = this.plugin.manifest || {};
    const row = target.createDiv({ cls: 'fc-origin' });

    row.createSpan({ text: `${m.name || ''} ${m.version || ''}`.trim() });

    if (m.author) {
      row.createSpan({ text: ' · ' });
      /* Only link when an address is actually set -- a link that goes
         nowhere is worse than plain text. */
      if (m.authorUrl) {
        row.createEl('a', {
          text: m.author,
          href: m.authorUrl,
          attr: { target: '_blank', rel: 'noopener' },
        });
      } else {
        row.createSpan({ text: m.author });
      }
    }

    if (HELP_URL) {
      row.createSpan({ text: ' · ' });
      row.createEl('a', {
        text: TEXTS.help,
        href: HELP_URL,
        attr: { target: '_blank', rel: 'noopener' },
      });
    }
  }

  /* ---------------- Liste ----------------------------------------- */

  fillList() {
    this.listEl.empty();
    /* Handles on the individual rows, so name and colour can be updated
       while typing without rebuilding everything. */
    this.rows = new Map();

    /* The rows scroll, the button below stays put -- otherwise it drops
       out of sight once there are many categories. */
    /* Says what the list is. This one can sit above its column: the
       height it costs comes out of the list, not out of the settings
       column that has none to spare. */
    this.listEl.createDiv({
      cls: 'fc-groupingname fc-groupingrow',
      text: TEXTS.areaCategories,
    });

    const scroller = this.listEl.createDiv({ cls: 'fc-listscroll' });

    /* Only the active group. That is the whole point of groups: the same
       colour means different things in different parts of the vault, and
       all of them at once is what made the list unusable. */
    const kategorien = this.plugin.categoriesIn(this.chosenGroup);

    if (!kategorien.length) {
      scroller.createDiv({ cls: 'fc-empty', text: TEXTS.noCategoriesInGroup });
    }

    for (const cat of kategorien) {
      const row = scroller.createDiv({ cls: 'fc-listrow' });
      if (cat.id === this.chosen) row.addClass('fc-active');

      /* A holder of fixed width, so the names line up whatever marker
         sits in front of them -- a tab is narrower than a dot, an icon
         wider. Without it the column of names would shift from row to
         row. */
      const mark = row.createSpan({ cls: 'fc-listmarker' });

      /* The name sits in a span of its own inside the cell. The cell
         takes the leftover width and clips a long name; the span hugs
         the text, so a category's background colour wraps the word
         rather than the whole row -- and the row's own highlight for
         the selected entry stays visible underneath. */
      const name = row
        .createSpan({ cls: 'fc-listname' })
        .createSpan({ cls: 'fc-listtext', text: cat.name });

      this.drawRowStyle(
        { mark, name },
        cat.farbe,
        this.plugin.styleOf(cat.id),
        cat.icon
      );

      const count = row.createSpan({
        cls: 'fc-listcount',
        text: String(this.plugin.folderCount(cat.id)),
      });
      count.setAttribute('aria-label', TEXTS.folderCountText(this.plugin.folderCount(cat.id)));

      row.addEventListener('click', () => {
        this.chosen = cat.id;
        this.fillList();
        this.fillDetail();
      });

      this.rows.set(cat.id, { mark, name });
    }

    /* Under the rows: move the selected category, and add a new one.
       Both in one line, so the list keeps its height for the rows.

       The arrows sit in a fixed place instead of on every row. Moving
       something several places means tapping several times, and a button
       riding along with the row would walk out from under the finger
       after every tap -- on the iPad, where the finger covers what it is
       aiming at, that is the difference between working and fiddling. */
    const footer = this.listEl.createDiv({ cls: 'fc-listfooter' });
    const pair = footer.createDiv({ cls: 'fc-shiftpair' });

    /* Where the selected category stands WITHIN ITS GROUP -- that is the
       order shown, and the only one the arrows may go by. Without a
       selection this is -1, and both arrows are dead, which is right:
       there is nothing to move. */
    const slot = kategorien.findIndex((k) => k.id === this.chosen);

    this.shiftButton(pair, 'chevron-up', TEXTS.moveUp, slot > 0, () =>
      this.categoryShiftButton(-1)
    );
    this.shiftButton(
      pair,
      'chevron-down',
      TEXTS.moveDown,
      slot >= 0 && slot < kategorien.length - 1,
      () => this.categoryShiftButton(1)
    );

    /* Sorting sits in its own pair, a gap away from the arrows. Both do
       the same kind of thing to the same list, and the two that move one
       entry a step must not be confused with the two that rearrange
       everything.

       Dead below two entries: with one category there is no order to
       establish, and a button that can never do anything is a thing to
       wonder about. */
    const sortPair = footer.createDiv({ cls: 'fc-shiftpair fc-sortpair' });
    const enough = kategorien.length > 1;

    this.shiftButton(sortPair, 'arrow-down-az', TEXTS.sortAscending, enough, () =>
      this.sortCategories(false)
    );
    this.shiftButton(sortPair, 'arrow-up-az', TEXTS.sortDescending, enough, () =>
      this.sortCategories(true)
    );

    const fresh = footer.createEl('button', {
      cls: 'fc-new',
      text: '+ ' + TEXTS.newCategory,
    });
    fresh.addEventListener('click', async () => {
      this.chosen = await this.plugin.addCategory(this.chosenGroup);
      this.fillList();
      this.fillDetail();
    });
  }

  /* ---------------- Reihenfolge ----------------------------------- */

  /* One arrow button.
   *
   * It deliberately carries Obsidian's own class "clickable-icon". Not
   * for the looks: the rule .is-tablet button:not(.clickable-icon) puts
   * 20 pixels of padding on either side of every other kind of button,
   * and that is what squashed the icon picker flat on the iPad in
   * 0.9.20. A button that is an icon button says so.
   *
   * At the end of the list the button stays put and goes dead rather
   * than disappearing -- the other one would jump sideways, and a target
   * that moves is worse than one that says no. */
  shiftButton(target, iconName, label, possible, act) {
    const button = target.createEl('button', { cls: 'clickable-icon fc-shift' });
    setIcon(button, iconName);
    button.setAttribute('aria-label', label);

    if (!possible) {
      button.disabled = true;
      return button;
    }
    button.addEventListener('click', act);
    return button;
  }

  /* Only the list is redrawn. The category stays selected, so its
     settings on the right have not changed -- redrawing them would throw
     away the caret in the name field for nothing. */
  async categoryShiftButton(direction) {
    if (!this.chosen) return;
    const moved = await this.plugin.moveCategory(this.chosen, direction);
    if (!moved) return;
    this.fillList();
  }

  /* --- Restoring --------------------------------------------------- */

  /* The system's own open dialog. A plain file input, nothing to do with
     Electron -- verified in Obsidian on 2026-08-29. Whatever the person
     can reach in Finder they can reach here, which is the whole point of
     writing the backup outside the vault in the first place.
   *
     Read and checked before anything is asked, so a file that turns out
     not to be a backup is refused without a pointless question first. */
  pickBackupFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;

      let data;
      try {
        data = this.plugin.backupFromText(await file.text());
      } catch (e) {
        new Notice(e.message || TEXTS.backupUnreadable);
        return;
      }

      new ConfirmModal(
        this.app,
        TEXTS.backupQuestion(file.name),
        () => this.applyBackup(data),
        TEXTS.load
      ).open();
    });

    input.click();
  }

  pickBackupInVault() {
    new BackupModal(this.app, this.plugin, (data) =>
      this.applyBackup(data)
    ).open();
  }

  /* Everything on screen came from the old data -- which group is open,
     which category is selected. Both are worked out again rather than
     kept, or the window would point at entries the restored file does
     not have. */
  applyBackup(data) {
    this.plugin.restoreBackup(data);
    this.chosenGroup = this.plugin.data.gruppen[0].id;
    const first = this.plugin.categoriesIn(this.chosenGroup)[0];
    this.chosen = first ? first.id : null;
    this.draw();
    new Notice(TEXTS.backupLoaded);
  }

  /* Only the list is redrawn, same as for the arrows: sorting changes
     the order, not the settings of the category that stays selected. */
  async sortCategories(absteigend) {
    const changed = await this.plugin.sortCategories(
      this.chosenGroup,
      absteigend
    );
    if (!changed) return;
    this.fillList();
  }

  /* Only the tabs. Which categories the group holds does not change by
     moving it, so list and settings stay as they are. */
  async groupShiftButton(direction) {
    const moved = await this.plugin.moveGroup(this.chosenGroup, direction);
    if (!moved) return;
    this.fillTabs();
  }

  /* ---------------- Gruppen --------------------------------------- */

  /* One tab per group, plus a button to add one. The tabs scroll
     sideways rather than wrapping: with eight legends a wrapping row
     would change height as you switch, and everything below it would
     jump. */
  fillTabs() {
    this.tabsEl.empty();

    /* Says what the tabs are, on the same line as the tabs themselves.
       Above them it would cost a row of height, and the settings column
       below has none to give -- the window is at Obsidian's ceiling. */
    const bar = this.tabsEl.createDiv({ cls: 'fc-tabbar' });
    bar.createSpan({ cls: 'fc-groupingname', text: TEXTS.areaGroups });

    for (const gruppe of this.plugin.data.gruppen) {
      const button = bar.createEl('button', {
        cls: 'fc-tabbutton',
        text: gruppe.name,
      });
      if (gruppe.id === this.chosenGroup) button.addClass('fc-tabactive');

      button.setAttribute(
        'aria-label',
        TEXTS.groupCount(this.plugin.categoriesIn(gruppe.id).length)
      );

      button.addEventListener('click', () => {
        if (gruppe.id === this.chosenGroup) return;
        this.chosenGroup = gruppe.id;
        /* The selection cannot survive a group change: the category it
           points at is not in the new group. */
        const first = this.plugin.categoriesIn(gruppe.id)[0];
        this.chosen = first ? first.id : null;
        this.fillTabs();
        this.fillList();
        this.fillDetail();
      });
    }

    const fresh = bar.createEl('button', {
      cls: 'fc-tabnew',
      text: '+',
    });
    fresh.setAttribute('aria-label', TEXTS.groupNew);
    fresh.addEventListener('click', async () => {
      this.chosenGroup = await this.plugin.addGroup();
      this.chosen = null;
      this.fillTabs();
      this.fillList();
      this.fillDetail();
    });

    /* Name and delete for the group sit under the tabs, not in them: a
       tab you can type in is hard to hit, and the delete button has to
       be somewhere it cannot be pressed by accident while switching. */
    const row = this.tabsEl.createDiv({ cls: 'fc-grouprow' });
    const gruppe = this.plugin.data.gruppen.find(
      (g) => g.id === this.chosenGroup
    );
    if (!gruppe) return;

    /* The order of the tabs, at the left end of the row and directly
       under the strip it belongs to. Same mechanic as under the list,
       only lying down, because the tabs lie down.

       Hidden while there is only one group, for the same reason the
       delete button is: nothing to move it past. */
    if (this.plugin.data.gruppen.length > 1) {
      const pair = row.createDiv({ cls: 'fc-shiftpair' });
      const slot = this.plugin.data.gruppen.findIndex(
        (g) => g.id === gruppe.id
      );

      this.shiftButton(pair, 'chevron-left', TEXTS.groupLeft, slot > 0, () =>
        this.groupShiftButton(-1)
      );
      this.shiftButton(
        pair,
        'chevron-right',
        TEXTS.groupRight,
        slot < this.plugin.data.gruppen.length - 1,
        () => this.groupShiftButton(1)
      );
    }

    const name = row.createEl('input', {
      type: 'text',
      cls: 'fc-groupname',
      placeholder: TEXTS.groupName,
    });
    name.value = gruppe.name;

    /* Deliberately no full redraw while typing, or the field would lose
       the caret after every character -- only the tab's label follows. */
    name.addEventListener('input', () => {
      this.plugin.renameGroup(gruppe.id, name.value);
      const button = bar.querySelector('.fc-tabactive');
      if (button) button.setText(name.value);
    });

    /* Copies the whole legend. Stands before Delete, so the harmless
       button is the one closer to the middle of the row. */
    const duplicate = row.createEl('button', {
      cls: 'fc-groupduplicate',
      text: TEXTS.duplicateGroup,
    });
    duplicate.addEventListener('click', async () => {
      const id = await this.plugin.duplicateGroup(gruppe.id);
      if (!id) return;

      this.chosenGroup = id;
      const first = this.plugin.categoriesIn(id)[0];
      this.chosen = first ? first.id : null;
      this.fillTabs();
      this.fillList();
      this.fillDetail();
    });

    /* Hidden rather than disabled while there is only one group: a
       button that can never be pressed is just a thing to wonder
       about. */
    if (this.plugin.data.gruppen.length < 2) return;

    const gone = row.createEl('button', {
      cls: 'fc-groupremove',
      text: TEXTS.deleteGroup,
    });
    gone.addEventListener('click', () => {
      const count = this.plugin.categoriesIn(gruppe.id).length;
      const oldName = gruppe.name;

      new ConfirmModal(
        this.app,
        TEXTS.groupDeleteQuestion(oldName, count),
        async () => {
          await this.plugin.deleteGroup(gruppe.id);
          new Notice(TEXTS.groupDeleted(oldName));
          this.chosenGroup = this.plugin.data.gruppen[0].id;
          const first = this.plugin.categoriesIn(this.chosenGroup)[0];
          this.chosen = first ? first.id : null;
          this.fillTabs();
          this.fillList();
          this.fillDetail();
        }
      ).open();
    });
  }

  /* The marker in front of a name in the list: dot, tab or icon,
     whichever the category actually carries. Added on 2026-08-27 -- the
     list showed a coloured dot no matter what was set on the right,
     which read as if the setting had not taken.

     Only the marker is mirrored. Background, coloured text and bold stay
     out of it: a filled row would compete with the highlight on the
     selected category, and that highlight is what tells you where you
     are.

     With "no marker" the row stays empty, because that is what the tree
     does. Until 0.9.33 a dot stood in, so that a category without a
     marker still showed its colour somewhere -- but a dot the tree does
     not have reads as a setting that did not take, which is the very
     thing this marker was added to fix. The holder keeps its width
     either way, so the names still line up.

     Since 0.9.43 the row carries the whole appearance, not just the
     marker: background, coloured text, bold and dimming, exactly as the
     tree shows them. That is what let the separate preview section go,
     and it shows every category at once instead of only the selected
     one. */
  drawRowStyle(row, farbe, stil, icon) {
    const target = row.mark;
    const text = row.name;

    target.empty();

    /* Everything set here is set again every time, the "off" value
       included. The row is redrawn while the colour picker is being
       dragged, and a style left over from the previous state would
       simply stay on the span. */
    text.style.backgroundColor = '';
    text.style.color = '';
    text.style.fontWeight = '';
    text.style.opacity = '';
    target.style.opacity = '';

    /* On a coloured background the marker takes the readable colour, or
       it would be standing on itself. Same rule as the stylesheet uses
       for the tree. */
    const markColour = stil.hintergrund ? readableText(farbe) : farbe;

    if (stil.markierung !== 'keine') {
      if (icon) {
        const iconName = target.createSpan({ cls: 'fc-listicon' });
        setIcon(iconName, icon);
        iconName.style.color = markColour;
      } else {
        const mark = target.createSpan({ cls: 'fc-listmark' });
        mark.addClass(stil.markierung === 'lasche' ? 'fc-bar' : 'fc-dot');
        mark.style.backgroundColor = farbe;
      }
    }

    if (stil.hintergrund) {
      text.style.backgroundColor = farbe;
      text.style.color = readableText(farbe);
    } else if (stil.schriftFarbig) {
      text.style.color = farbe;
    }

    if (stil.fett) text.style.fontWeight = '700';

    /* Same value the stylesheet uses for the tree. On marker and text,
       not on the row: the row carries the highlight for the selected
       entry, and that must not fade with the category. */
    if (stil.gedimmt) {
      text.style.opacity = '0.45';
      target.style.opacity = '0.45';
    }
  }

  /* ---------------- Detail ---------------------------------------- */

  /* Every valid icon id, fetched once per open window. The typing
     handler asks after every keystroke, and getIconIds() builds the
     whole list of over a thousand each time it is called.

     If it fails, the list stays empty -- then no typed name is
     recognised, and the grid button is still there. Better than a
     window that will not open. */
  iconList() {
    if (!this.icons) {
      try {
        this.icons = getIconIds() || [];
      } catch (e) {
        this.icons = [];
      }
    }
    return this.icons;
  }

  /* One section: its heading on the left, everything it controls on the
     right. Returns the right-hand box, so the caller fills that instead
     of the column itself.
   *
   * Six headings used to sit on six rows of their own. Measured at the
   * real column width of 430px, that layout came to 405px where this one
   * comes to 297 -- the heading rows were 168 of them. The window was
   * pinned to Obsidian's maximum height then, so that cost a scrollbar;
   * since 0.9.44 it costs window height instead, which is not much
   * better.
   *
   * The 7em for the heading column is measured, not picked: wider and
   * the switches under "Zusaetzlich" and "Vererbung" start wrapping,
   * which gives back more than the heading row saved. */
  section(text) {
    const row = this.detailEl.createDiv({ cls: 'fc-section' });
    row.createDiv({ cls: 'fc-subtitle', text });
    return row.createDiv({ cls: 'fc-sectionbody' });
  }

  fillDetail() {
    this.detailEl.empty();

    const cat = this.plugin.data.kategorien.find((k) => k.id === this.chosen);
    if (!cat) {
      this.detailEl.createDiv({ cls: 'fc-empty', text: TEXTS.nothingChosen });
      return;
    }

    const vaterStil = this.plugin.styleOf(cat.id);

    /* Since 1.1.0 a category has two looks, and this panel edits one of
       them at a time. Which one is a property of the window, not of the
       data -- closing and reopening starts at the parent again.

       The children's view only exists where something inherits. Without
       that there are no children, and a switch that edits nothing is
       worse than a missing one. */
    const hatKinder = Boolean(vaterStil.vererbt || vaterStil.vererbtDateien);
    const kinderAnsicht = this.ansicht === 'kinder' && hatKinder;
    const folgt = !cat.childStyle;

    /* What the switches below show, and what they write to. Everything
       further down goes through these three, so a switch cannot end up
       editing the parent while the panel says "children". */
    const stil = kinderAnsicht
      ? this.plugin.childStyleOf(cat.id) || vaterStil
      : vaterStil;
    const zeigeIcon = kinderAnsicht
      ? this.plugin.childIconOf(cat.id)
      : cat.icon || null;

    const setzeStil = async (felder) => {
      if (kinderAnsicht) await this.plugin.changeChildStyle(cat.id, felder);
      else await this.plugin.changeStyle(cat.id, felder);
    };
    const setzeIcon = async (name) => {
      if (kinderAnsicht) await this.plugin.changeChildIcon(cat.id, name);
      else await this.plugin.changeCategory(cat.id, { icon: name });
    };

    /* The row in the list is the preview since 0.9.43, so it has to
       follow every change made here -- not only the ones with a handler
       of their own. Every switch redraws this column through
       fillDetail, so redrawing the row here catches all of them at
       once.

       Reported 2026-08-29: pressing "Background" left the row in the
       list uncoloured until something else was changed. */
    const listRow = this.rows && this.rows.get(cat.id);
    /* Always the parent: the row stands for the category as a whole, and
       it would be a strange preview that changed depending on which tab
       of the panel happens to be open. */
    if (listRow) this.drawRowStyle(listRow, cat.farbe, vaterStil, cat.icon);

    /* --- Colour and name ------------------------------------------ */
    const head = this.detailEl.createDiv({ cls: 'fc-row' });

    /* A coloured square is a coloured square -- nothing about it says it
       can be pressed. Reported on 2026-08-29: the colour was there to be
       seen, not to be found.

       So a picker lies on top of it. The field keeps showing the
       colour, the icon says what pressing it does. The icon itself
       cannot be pressed -- pointer-events are off, every click goes
       through to the field underneath, which is still the real colour
       input. Replacing that input was never on the table: the picker
       behind it belongs to the system, and no plugin builds a better
       one. */
    const colourField = head.createDiv({ cls: 'fc-colourfield' });

    const farbe = colourField.createEl('input', { type: 'color', cls: 'fc-colour' });
    farbe.value = cat.farbe;
    farbe.setAttribute('aria-label', TEXTS.pickColour);
    farbe.setAttribute('title', TEXTS.pickColour);

    const picker = colourField.createSpan({ cls: 'fc-colourpicker' });
    setIcon(picker, 'pipette');

    /* Black or white, whichever reads on the colour underneath -- the
       same sum the tree uses for its text. One fixed colour would
       disappear on half the palette. */
    const colourPicker = () => {
      picker.style.color = readableText(farbe.value);
    };
    colourPicker();

    const name = head.createEl('input', {
      type: 'text',
      cls: 'fc-title',
      placeholder: TEXTS.namePlaceholder,
    });
    name.value = cat.name;

    /* --- Vater oder Kinder ----------------------------------------- */
    /* Sits above everything it switches, so you can see what you are
       about to edit before you press anything.

       Only drawn where something inherits. Elsewhere the panel looks
       exactly as it did before 1.1.0 -- one folder, one look, no tabs to
       understand. */
    if (hatKinder) {
      const viewField = this.section(TEXTS.editingFor);
      const viewRow = viewField.createDiv({ cls: 'fc-group' });

      for (const view of [
        { id: 'vater', name: TEXTS.viewParent },
        { id: 'kinder', name: TEXTS.viewChildren },
      ]) {
        const button = viewRow.createEl('button', { text: view.name });
        if ((view.id === 'kinder') === kinderAnsicht) button.addClass('mod-cta');
        button.addEventListener('click', () => {
          this.ansicht = view.id;
          this.fillDetail();
        });
      }

      /* The way back. Only in the children's view, and only usable once
         they have a look of their own -- pressing it while they already
         follow would do nothing and say nothing. */
      if (kinderAnsicht) {
        /* Its own row, not part of the pair above: those two are a
           choice between views, this one changes the data. Sharing a
           joined group would read as a third view. */
        const followRow = viewField.createDiv({ cls: 'fc-switches' });
        const follow = followRow.createEl('button', { text: TEXTS.childFollows });
        if (folgt) follow.addClass('mod-cta');
        follow.addEventListener('click', async () => {
          if (folgt) return;
          await this.plugin.childFollowParent(cat.id);
          this.fillList();
          this.fillDetail();
        });

        viewField.createDiv({
          cls: 'fc-hint',
          text: folgt ? TEXTS.childFollowsHint : TEXTS.childOwnHint,
        });
      }
    }

    /* --- Markierung ------------------------------------------------ */
    const markerField = this.section(TEXTS.markierung);

    const gruppe = markerField.createDiv({ cls: 'fc-group' });

    /* Collected because the icon field strikes them through as you type
       -- see showIconState below. "None" is not in here: it keeps
       working with an icon set, it is what leaves the folder unmarked. */
    const markButtons = [];

    for (const m of MARKERS) {
      const button = gruppe.createEl('button', { text: m.name });
      if (stil.markierung === m.id) button.addClass('mod-cta');
      if (m.id !== 'keine') markButtons.push(button);
      button.addEventListener('click', async () => {
        await setzeStil({ markierung: m.id });
        /* The list carries the marker too, so it has to follow. */
        this.fillList();
        this.fillDetail();
      });
    }

    /* --- Icon ------------------------------------------------------ */
    /* Sits directly under the marker because it takes the marker's
       place: choose one here and the tree shows no bar and no dot any
       more, but the icon in the category colour. */
    const iconSection = this.section(TEXTS.iconName);

    /* The name of the icon stands in a field you can type and paste
       into. Through the grid alone, setting one category after another
       meant opening a window, searching and closing it again for every
       single one.

       The grid did not go away, it moved into the small button beside
       the field. Browsing is still how you find an icon you cannot
       name. */
    const iconRow = iconSection.createDiv({ cls: 'fc-iconrow' });

    /* Keeps its width whether or not there is an icon, so the field
       does not shift sideways the moment one is set. */
    const iconImage = iconRow.createSpan({ cls: 'fc-iconimage' });

    const iconField = iconRow.createEl('input', {
      type: 'text',
      cls: 'fc-icontext',
      placeholder: TEXTS.iconLabel,
    });
    iconField.value = shortIconName(zeigeIcon);

    const paging = iconRow.createEl('button', {
      cls: 'clickable-icon fc-iconpaging',
    });
    setIcon(paging, 'layout-grid');
    paging.setAttribute('aria-label', TEXTS.pickIcon);
    paging.addEventListener('click', () => {
      new IconModal(this.app, zeigeIcon, async (chosen) => {
        await setzeIcon(chosen);
        this.fillList();
        this.fillDetail();
      }).open();
    });

    /* The button is always there, only invisible without an icon. Left
       out entirely, everything below it moved up by a row as soon as you
       clicked a category without an icon -- including "Delete", which
       then slid under the pointer. Reported 2026-08-28. */
    const iconRemove = iconRow.createEl('button', { text: TEXTS.removeIcon });
    if (!zeigeIcon) iconRemove.addClass('fc-placeholder');
    iconRemove.addEventListener('click', async () => {
      if (!zeigeIcon) return;
      await setzeIcon(null);
      this.fillList();
      this.fillDetail();
    });

    /* Same reason as the button above: the line keeps its space even
       when it has nothing to say. .fc-hint reserves one row. */
    const iconHintEl = iconSection.createDiv({ cls: 'fc-hint' });

    /* The one place that decides what the icon line says and looks like.
       Called on drawing and again after every keystroke, so the two can
       never drift apart.

       With "None" the folder stays unmarked -- the explicit choice beats
       the icon. The line is only dimmed, not disabled, so a chosen icon
       survives and takes effect again as soon as a marker comes back.
       Same pattern as "coloured text" underneath a background. */
    const showIconState = (unbekannt) => {
      const noEffect = Boolean(zeigeIcon) && stil.markierung === 'keine';
      iconRow.classList.toggle('fc-noeffect', noEffect);
      iconField.classList.toggle('fc-unknown', Boolean(unbekannt));

      /* The other direction of the same dependency: with an icon set,
         the bar and the dot both draw the icon, so the choice between
         them changes nothing and is struck through. Reported 2026-08-29
         -- "Lasche" looked selected and active while an icon was named
         right below it. Done here rather than where the buttons are
         built, because typing a name must not redraw the panel (the
         caret would jump out of the field), and this line runs on every
         keystroke. */
      for (const button of markButtons) {
        button.classList.toggle('fc-noeffect', Boolean(zeigeIcon));
      }

      if (unbekannt) iconHintEl.setText(TEXTS.iconUnknown);
      else if (noEffect) iconHintEl.setText(TEXTS.iconNoEffect);
      else iconHintEl.setText(zeigeIcon ? TEXTS.iconReplaces : '');
    };

    /* Draws the icon in front of the field, in the category colour --
       the same picture the tree will show. */
    const showIconImage = () => {
      iconImage.empty();
      if (!zeigeIcon) return;
      setIcon(iconImage, zeigeIcon);
      iconImage.style.color = cat.farbe;
    };

    showIconImage();
    showIconState(false);

    /* --- the four independent switches ------------------------------ */
    const extraField = this.section(TEXTS.extra);

    const switches = extraField.createDiv({ cls: 'fc-switches' });
    const toggle = [
      ['hintergrund', TEXTS.hintergrund],
      ['schriftFarbig', TEXTS.schriftFarbig],
      ['fett', TEXTS.fett],
      /* Last on purpose: it is the only one that turns the row down
         rather than up, and it works on top of whatever the three
         before it did. */
      ['gedimmt', TEXTS.gedimmt],
    ];

    for (const [field, label] of toggle) {
      const button = switches.createEl('button', { text: label });
      if (stil[field]) button.addClass('mod-cta');
      /* Coloured text has no effect while a background is on -- there
         the plugin works out the text colour itself. The switch stays
         usable but is visibly dimmed, so the setting takes effect again
         once the background is turned off. */
      if (field === 'schriftFarbig' && stil.hintergrund) button.addClass('fc-noeffect');

      button.addEventListener('click', async () => {
        await setzeStil({ [field]: !stil[field] });
        this.fillDetail();
      });
    }

    /* One reserved row, as everywhere else. The sentence used to need
       two at the window's 720 pixels; since 0.9.43 the window is 900
       and it fits on one -- measured, both German sentences and both
       English ones, in Obsidian's own Inter and in a wider interface
       font.

       Two switches can have something to say here, but only one line is
       shown: the background hint wins because it explains something you
       cannot see (the plugin picking the text colour), while dimming
       shows itself in the category list on the left. Reserving a second
       row for the rare case where both are on would move everything
       down for everyone else -- the very shifting that 0.9.16 fixed. */
    let switchHint = '';
    if (stil.hintergrund) switchHint = TEXTS.textAutomatic;
    else if (stil.gedimmt) switchHint = TEXTS.dimmedHint;

    extraField.createDiv({
      cls: 'fc-hint',
      text: switchHint,
    });

    /* --- Vererbung ------------------------------------------------- */
    /* This is not about looks but about reach: how far the colour
       carries. Used to be two entries in the context menu, set per
       folder -- hard to find, and the only thing about a category that
       was not set in this window. */
    const inheritField = this.section(TEXTS.inheritance);

    const reach = inheritField.createDiv({ cls: 'fc-switches' });
    const inheritSwitches = [
      ['vererbt', TEXTS.toSubfolders],
      ['vererbtDateien', TEXTS.toNotes],
    ];

    for (const [field, label] of inheritSwitches) {
      const button = reach.createEl('button', { text: label });
      if (stil[field]) button.addClass('mod-cta');
      button.addEventListener('click', async () => {
        await this.plugin.changeStyle(cat.id, { [field]: !stil[field] });
        this.fillDetail();
      });
    }

    /* The reach switches are the last thing set here. What used to
       follow -- the row "set the parent apart" -- is gone since 1.1.0:
       the children have a style of their own now, chosen with the
       switch at the top of this panel. That row could express exactly
       one difference between parent and children, and the first person
       who wanted two (coloured text AND an icon, only on the parent)
       ran into a wall. */

    /* --- Loeschen -------------------------------------------------- */
    const footer = this.detailEl.createDiv({ cls: 'fc-detailfooter' });

    /* Duplicating sits next to deleting because both act on the category
       shown above, and nowhere else does. Delete stays on the far right,
       away from the hand. */
    const duplicate = footer.createEl('button', { text: TEXTS.duplicateLabel });
    duplicate.addEventListener('click', async () => {
      const id = await this.plugin.duplicateCategory(cat.id);
      if (!id) return;
      /* The copy is selected straight away: it is called "... (copy)"
         and the first thing anyone does is rename it. */
      this.chosen = id;
      this.fillList();
      this.fillDetail();
    });

    /* Moving to another group, in the row that is already there rather
       than in a line of its own: the settings column has no height to
       give away.

       Only with somewhere to move to. With one group the field would
       have exactly one entry -- a control that can only say what is
       already true. */
    if (this.plugin.data.gruppen.length > 1) {
      footer.createSpan({ cls: 'fc-footername', text: TEXTS.groupField });

      const choice = footer.createEl('select', { cls: 'dropdown fc-groupchoice' });
      choice.setAttribute('aria-label', TEXTS.groupSwitch);
      choice.setAttribute('title', TEXTS.groupSwitch);

      for (const g of this.plugin.data.gruppen) {
        const entry = choice.createEl('option', { text: g.name });
        entry.value = g.id;
        if (g.id === cat.gruppe) entry.selected = true;
      }

      choice.addEventListener('change', async () => {
        const target = choice.value;
        if (!(await this.plugin.moveCategoryToGroup(cat.id, target))) return;

        /* The window follows it. Staying put would make the category
           vanish from the list with nothing to show where it went. */
        this.chosenGroup = target;
        this.chosen = cat.id;
        this.fillTabs();
        this.fillList();
        this.fillDetail();
      });
    }

    const gone = footer.createEl('button', { cls: 'fc-remove', text: TEXTS.remove });

    /* --- Ereignisse ------------------------------------------------ */

    /* The colour takes effect immediately, so you can see the tree
       change while still dragging in the picker. Only the row in the
       list is redrawn -- it is the preview since 0.9.43. */
    farbe.addEventListener('input', () => {
      this.plugin.changeCategory(cat.id, { farbe: farbe.value });
      colourPicker();
      const row = this.rows.get(cat.id);
      if (row) this.drawRowStyle(row, farbe.value, stil, cat.icon);
    });

    /* Same as the name field: no redraw while typing, only the pieces
       that show the icon. A name that matches nothing changes nothing --
       it says so and leaves the saved icon alone, so a half-typed word
       does not wipe out what was there. */
    iconField.addEventListener('input', () => {
      const id = resolveIcon(iconField.value, this.iconList());
      if (id === null) {
        showIconState(true);
        return;
      }

      this.plugin.changeCategory(cat.id, { icon: id || null });
      showIconImage();
      showIconState(false);

      const row = this.rows.get(cat.id);
      if (row) this.drawRowStyle(row, cat.farbe, stil, cat.icon);
    });

    /* Deliberately no redraw while typing, or the field would lose the
       caret after every character. */
    name.addEventListener('input', () => {
      this.plugin.changeCategory(cat.id, { name: name.value });
      const row = this.rows.get(cat.id);
      if (row) row.name.setText(name.value);
    });

    gone.addEventListener('click', async () => {
      const folderTotal = this.plugin.folderCount(cat.id);
      const oldName = cat.name;

      const remove = async () => {
        await this.plugin.deleteCategory(cat.id);
        new Notice(TEXTS.deleted(oldName));
        /* The next one from THIS group. Falling back to the first
           category overall would jump into another legend while the tab
           above still says this one. */
        const first = this.plugin.categoriesIn(this.chosenGroup)[0];
        this.chosen = first ? first.id : null;
        /* The tab carries the category count, so it follows too. */
        this.fillTabs();
        this.fillList();
        this.fillDetail();
      };

      /* Always ask, even when no folder hangs off the category.
         Deleting without a prompt is one click too few, however little
         is at stake. */
      new ConfirmModal(
        this.app,
        TEXTS.deleteQuestion(oldName, folderTotal),
        remove
      ).open();
    });
  }

}

/* Picks a backup to restore.
 *
 * A list of what is in the vault, not a file dialog. Obsidian has no
 * file picker of its own, and the browser one is a desktop thing --
 * this window has to work on the phone as well, where the whole vault
 * lives behind the same adapter either way.
 *
 * Restoring goes through the same confirmation as deleting: it throws
 * away everything currently on screen, and unlike a deleted category
 * there is no single thing to point at afterwards and say what went. */
class BackupModal extends Modal {
  constructor(app, plugin, onSuccess) {
    super(app);
    this.plugin = plugin;
    this.onSuccess = onSuccess;
  }

  async onOpen() {
    const { contentEl, titleEl } = this;
    if (titleEl) titleEl.setText(TEXTS.backupTitle);

    const files = await this.plugin.findBackups();

    if (!files.length) {
      contentEl.createDiv({ cls: 'fc-empty', text: TEXTS.backupEmpty });
      return;
    }

    const list = contentEl.createDiv({ cls: 'fc-backuplist' });

    for (const path of files) {
      const name = path.split('/').pop();
      const row = list.createEl('button', {
        cls: 'fc-backuprow',
        text: name,
      });
      row.addEventListener('click', () => {
        new ConfirmModal(
          this.app,
          TEXTS.backupQuestion(name),
          async () => {
            try {
              const data = await this.plugin.readBackup(path);
              this.close();
              this.onSuccess(data);
            } catch (e) {
              /* The message comes from readBackup and already says
                 which of the two things went wrong. */
              new Notice(e.message || TEXTS.backupUnreadable);
            }
          },
          TEXTS.load
        ).open();
      });
    }

    contentEl.createDiv({
      cls: 'fc-hint',
      text: TEXTS.backupPlace(BACKUP_FOLDER),
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

/* Own confirmation dialog instead of confirm(). The built-in one is not
   dependable inside Obsidian -- it looks foreign on mobile, and Electron
   can have it disabled. */
class ConfirmModal extends Modal {
  constructor(app, question, onYes, yesText) {
    super(app);
    this.question = question;
    this.onYes = onYes;
    /* No label given means this is a deletion -- then the button is
       red. */
    this.yesText = yesText || null;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('p', { text: this.question });

    const footer = contentEl.createDiv({ cls: 'fc-footer' });

    const no = footer.createEl('button', { text: TEXTS.cancel });
    no.addEventListener('click', () => this.close());

    const yes = footer.createEl('button', {
      text: this.yesText || TEXTS.remove,
      cls: this.yesText ? 'mod-cta' : 'mod-warning',
    });
    yes.addEventListener('click', async () => {
      this.close();
      await this.onYes();
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

/* The icon picker.
 *
 * Icons come from Obsidian itself (getIconIds), so the plugin carries no
 * icon set of its own. There are over a thousand of them, hence a search
 * field and a cap on how many are drawn at once: drawing all of them
 * makes the window stutter noticeably, and nobody picks an icon by
 * scrolling through a wall of a thousand anyway.
 *
 * Most ids carry a "lucide-" prefix. The full id is stored, the part
 * after the prefix is displayed -- the search looks at both. */
const ICON_LIMIT = 120;

class IconModal extends Modal {
  constructor(app, current, onPick) {
    super(app);
    this.current = current;
    this.onPick = onPick;
    this.all = [];
  }

  onOpen() {
    const { contentEl, titleEl } = this;
    if (titleEl) titleEl.setText(TEXTS.iconWindowTitle);
    contentEl.addClass('fc-iconwindow');

    /* If getIconIds fails, the list stays empty and the window says so
       -- better than crashing on open. */
    try {
      this.all = (getIconIds() || []).slice().sort();
    } catch (e) {
      this.all = [];
    }

    const search = contentEl.createEl('input', {
      type: 'text',
      cls: 'fc-iconsearch',
      placeholder: TEXTS.iconSearch,
    });

    this.gridEl = contentEl.createDiv({ cls: 'fc-icongrid' });
    this.hintEl = contentEl.createDiv({ cls: 'fc-hint' });

    search.addEventListener('input', () => this.fillGrid(search.value));
    this.fillGrid('');

    /* Without the detour through setTimeout the field never gets the
       caret -- Obsidian sets it again itself while opening. */
    window.setTimeout(() => search.focus(), 0);
  }

  fillGrid(suchtext) {
    this.gridEl.empty();
    this.hintEl.empty();

    const text = suchtext.trim().toLowerCase();
    const fitting = text
      ? this.all.filter((id) => id.toLowerCase().includes(text))
      : this.all;

    if (!fitting.length) {
      this.hintEl.setText(TEXTS.iconNothingFound);
      return;
    }

    for (const id of fitting.slice(0, ICON_LIMIT)) {
      const button = this.gridEl.createEl('button', { cls: 'fc-iconfield' });
      button.setAttribute('aria-label', shortIconName(id));
      button.setAttribute('title', shortIconName(id));
      if (id === this.current) button.addClass('mod-cta');

      setIcon(button, id);

      button.addEventListener('click', async () => {
        this.close();
        await this.onPick(id);
      });
    }

    if (fitting.length > ICON_LIMIT) {
      this.hintEl.setText(TEXTS.iconMore(ICON_LIMIT, fitting.length));
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

/* ------------------------------------------------------------------ */
/* Stylesheet generation                                               */
/* ------------------------------------------------------------------ */

/* Translates the old either-or choice into the four switches. */
function styleFromOldShape(old) {
  const stil = Object.assign({}, STYLE_DEFAULT);

  switch (old) {
    case 'punkt':
      stil.markierung = 'punkt';
      break;
    case 'hintergrund':
      stil.markierung = 'keine';
      stil.hintergrund = true;
      break;
    case 'schrift':
      stil.markierung = 'keine';
      stil.schriftFarbig = true;
      stil.fett = true;
      break;
    default:
      stil.markierung = 'lasche';
  }

  return stil;
}

/* Brings data from before groups existed up to date, and repairs data
 * that lost its way.
 *
 * Three things can be wrong, and all three end up the same way -- every
 * category sits in a group that exists:
 *   1. No groups at all: the file predates them.
 *   2. Groups exist, but a category has no group, because it was written
 *      by an older version running alongside a newer one (a vault synced
 *      between two machines).
 *   3. A category names a group that is gone.
 *
 * Cases 2 and 3 matter more than they look. A category in no group would
 * be invisible in the window and unreachable in the menu, while still
 * colouring folders -- a colour you cannot find and cannot change is
 * worse than a lost one. So they are moved into the first group rather
 * than dropped.
 *
 * Pure function on the data, no vault involved, so it can be tested
 * without Obsidian. */
function catchUpGroups(data, defaultName) {
  if (!Array.isArray(data.gruppen) || !data.gruppen.length) {
    data.gruppen = [{ id: 'grp-1', name: defaultName }];
  }

  const known = new Set(data.gruppen.map((g) => g.id));
  const first = data.gruppen[0].id;

  for (const cat of data.kategorien || []) {
    if (!cat.gruppe || !known.has(cat.gruppe)) cat.gruppe = first;
  }

  return data;
}

/* A fresh id that is really free.
 *
 * Date.now() on its own is not enough any more. Duplicating a group
 * makes a copy of every category in it within the same millisecond --
 * they would all come out with the same id, and a category is looked up
 * by id everywhere: in the folder assignments, in the stylesheet, in the
 * window. The second one would quietly state in for the first.
 *
 * The ids already taken are handed in, so this can be tested without
 * Obsidian. */
function newId(prefix, assigned) {
  const taken = new Set(assigned || []);
  const now = Date.now();

  let candidate = `${prefix}-${now}`;
  let n = 2;
  while (taken.has(candidate)) {
    candidate = `${prefix}-${now}-${n}`;
    n++;
  }
  return candidate;
}

/* The id without the prefix. Almost all of them read "lucide-folder";
 * what a person types, pastes or looks up is "folder". */
function shortIconName(id) {
  return (id || '').replace(/^lucide-/, '');
}

/* Turns whatever someone typed into the icon line into a real id.
 *
 *   ''    the field is empty -- no icon
 *   id    an icon of that name exists
 *   null  there is none, so nothing may be saved
 *
 * Both spellings are accepted, "folder" and "lucide-folder": the window
 * shows the short one, the file holds the full one, and a name copied
 * from somewhere else can be either. Spaces become hyphens, because the
 * icon pages write "folder open" where the id says "folder-open".
 *
 * The list of valid ids is handed in rather than fetched here, so this
 * can be tested without Obsidian. */
function resolveIcon(text, all) {
  const raw = (text || '').trim().toLowerCase().replace(/\s+/g, '-');
  if (!raw) return '';

  const list = all || [];
  if (list.includes(raw)) return raw;

  const withPrefix = 'lucide-' + raw;
  if (list.includes(withPrefix)) return withPrefix;

  return null;
}

/* Sorts index entries by plain code-point order. Never localeCompare
 * here: the prefix search below only works if "a/b" and "a/c" really do
 * end up next to each other, and locale rules do not guarantee that. */
function toPath(a, b) {
  return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
}

/* Turns a list of paths into a searchable index: every entry keeps the
 * position it had in the original list, so results can be handed back
 * in that order later. */
function buildIndex(paths) {
  return paths.map((path, idx) => ({ path, idx })).sort(toPath);
}

/* First position in the index whose path is not less than the prefix.
 * Everything starting with that prefix sits in one unbroken block from
 * there on, which is what makes the scan cheap. */
function firstSlot(index, prefix) {
  let lo = 0;
  let hi = index.length;
  while (lo < hi) {
    const middle = (lo + hi) >> 1;
    if (index[middle].path < prefix) lo = middle + 1;
    else hi = middle;
  }
  return lo;
}

/* All paths starting with the prefix, back in the order of the list the
 * index was built from.
 *
 * This replaces a scan over every assignment per inheritance source. That
 * scan was quadratic: measured on 2026-08-27 with 300,000 assignments and
 * 60 sources it took 2.8 seconds, and it ran on every rebuild, not just
 * at startup. Cost now is one sort up front plus a binary search per
 * source -- the same case lands in a few milliseconds.
 *
 * The output order is restored on purpose. ":not(a):not(b)" and
 * ":not(b):not(a)" mean the same thing to a browser, but keeping the old
 * order makes this a pure speed change with an unchanged result, which
 * the tests can then confirm. */
function prefixHits(index, prefix) {
  const hits = [];
  for (let i = firstSlot(index, prefix); i < index.length; i++) {
    if (!index[i].path.startsWith(prefix)) break;
    hits.push(index[i]);
  }
  hits.sort((a, b) => a.idx - b.idx);
  return hits;
}

/* Turns the stored data into a list of targets: a CSS selector with a
 * colour and a style each.
 *
 * Two kinds of target:
 *   1. Inheritance -- one folder colours everything beneath it, because
 *      its category says so. A single selector using ^= ("starts with")
 *      covers any number of folders, including ones that do not exist
 *      yet.
 *   2. The entry itself -- an exact selector. Folders and files both,
 *      each in its own table and each with its own class in the tree.
 *
 * Order decides who wins, because both kinds of selector carry the same
 * specificity. So: inheritance first, shallow to deep (the nearer parent
 * wins), then the exact assignments (which beat any inheritance).
 *
 * On top of that, every inheritance rule excludes anything below it that
 * has an assignment or an inheritance of its own. Without that, a mix of
 * styles would leave the inherited bar sitting next to the folder's own
 * background. */
function buildTargets(data, nachschlagen) {
  const zuordnung = data.zuordnung || {};
  const fileAssignments = data.fileAssignments || {};
  const targets = [];

  const depth = (path) => path.split('/').length;

  /* --- parent and children ---------------------------------------- */

  /* Since 1.1.0 a category carries two looks: the one for the folder it
     is assigned to, and the one for everything inheriting below it. The
     second is optional -- without it the children look like the parent,
     which is what every category did before and what most still want.
   *
     Both come ready-made from the lookup. Nothing is worked out here any
     more; the old "set the parent apart" needed three helpers to derive
     one look from the other, and could still only express one difference
     at a time. */
  const childLook = (entry) => ({
    stil: entry.childStil || entry.stil,
    icon: 'childIcon' in entry ? entry.childIcon : entry.icon || null,
  });

  /* Which folders pass their colour down? Every folder whose category
     says so. There is no table of its own for this any more -- the
     switch sits on the category, so this is a lookup. */
  const sourcesWith = (field) =>
    Object.keys(zuordnung)
      .filter((path) => {
        const entry = nachschlagen(zuordnung[path]);
        return !!(entry && entry.stil && entry.stil[field]);
      })
      .sort((a, b) => depth(a) - depth(b) || a.localeCompare(b));

  /* --- 1. inheritance, shallow to deep ---------------------------- */
  const sources = sourcesWith('vererbt');

  /* Both indexes are built once and then searched per source, instead of
     walking the full lists again for every single one. */
  const assignIndex = buildIndex(Object.keys(zuordnung));
  const sourceIndex = buildIndex(sources);

  for (const source of sources) {
    const entry = nachschlagen(zuordnung[source]);
    const { farbe, stil } = entry;
    if (!farbe || !stil) continue;
    const kinder = childLook(entry);

    const prefix = source + '/';

    /* Anything below this source with an assignment of its own is an
       exception -- as is a deeper inheritance source together with
       everything beneath it. */
    const exceptions = [];

    for (const { path } of prefixHits(assignIndex, prefix)) {
      exceptions.push(`[data-path="${toMask(path)}"]`);
    }

    /* A source can never start with its own prefix -- the prefix is one
       separator longer -- so nothing has to be filtered out here. */
    for (const { path } of prefixHits(sourceIndex, prefix)) {
      exceptions.push(`[data-path^="${toMask(path + '/')}"]`);
    }

    targets.push({
      selector: `.nav-folder-title[data-path^="${toMask(prefix)}"]${exceptions
        .map((a) => `:not(${a})`)
        .join('')}`,
      farbe,
      stil: kinder.stil,
      icon: kinder.icon,
    });
  }

  /* --- 2. the folders themselves ---------------------------------- */
  for (const [path, catId] of Object.entries(zuordnung)) {
    const { farbe, stil, icon } = nachschlagen(catId);
    if (!farbe || !stil) continue;
    targets.push({
      selector: `.nav-folder-title[data-path="${toMask(path)}"]`,
      farbe,
      stil,
      icon: icon || null,
    });
  }

  /* --- 3. the notes below a folder -------------------------------- */
  /* Its own switch, separate from the one for subfolders. Folded into
     that one, every category that already inherits would have turned
     its notes colourful in one go, without anyone changing a setting.

     Reaches the whole subtree, not just the files sitting directly in
     the folder: a CSS attribute selector cannot express "exactly one
     level down", and excluding every subfolder by name would produce a
     selector as long as the vault. */
  const fileSources = sourcesWith('vererbtDateien');

  const fileIndex = buildIndex(fileSources);
  const ownFileIndex = buildIndex(Object.keys(fileAssignments));

  for (const source of fileSources) {
    const entry = nachschlagen(zuordnung[source]);
    const { farbe, stil } = entry;
    if (!farbe || !stil) continue;
    const kinder = childLook(entry);

    const prefix = source + '/';

    /* A deeper folder that colours its own notes wins over this one --
       otherwise the outer colour would reach past it. */
    const exceptions = [];
    for (const { path } of prefixHits(fileIndex, prefix)) {
      exceptions.push(`[data-path^="${toMask(path + '/')}"]`);
    }

    /* And a file that carries a category of its own is left out
       altogether. Coming later in the sheet would already win on
       colour, but not on the switches: the inherited bar would sit
       there next to the file's own background, because the two rules
       set different properties. */
    for (const { path } of prefixHits(ownFileIndex, prefix)) {
      exceptions.push(`[data-path="${toMask(path)}"]`);
    }

    targets.push({
      selector: `.nav-file-title[data-path^="${toMask(prefix)}"]${exceptions
        .map((a) => `:not(${a})`)
        .join('')}`,
      body: 'nav-file-title-content',
      farbe,
      stil: kinder.stil,
      icon: kinder.icon,
    });
  }

  /* --- 4. the files themselves ------------------------------------ */
  /* Last, so an assignment of its own beats anything the file inherits.
     Drawn with the plain style, never the parent one: "set the parent
     apart" is about a folder standing out from what hangs below it, and
     a file has nothing below it. */
  for (const [path, catId] of Object.entries(fileAssignments)) {
    const { farbe, stil, icon } = nachschlagen(catId);
    if (!farbe || !stil) continue;
    targets.push({
      selector: `.nav-file-title[data-path="${toMask(path)}"]`,
      body: 'nav-file-title-content',
      farbe,
      stil,
      icon: icon || null,
    });
  }

  return targets;
}

/* Builds the whole stylesheet. Rules of the same kind are merged so the
 * result stays short even with several hundred folders. Bar, dot and
 * icon hang off the text content rather than the row box, which leaves
 * the explorer's indentation untouched.
 *
 * "maskOf" turns an icon id into a finished CSS value for mask-image.
 * The icon itself is fetched from Obsidian by the plugin; keeping that
 * out of here is what makes this function testable without Obsidian.
 * If the function is missing or does not know an icon, the entry falls
 * back to its bar or dot -- a folder with no marker at all would be the
 * worse surprise. */
function buildRules(eintraege, maskOf) {
  if (!eintraege.length) return '';

  const title = (e) => e.selector;
  /* Folders and notes carry their text in differently named elements.
     Defaults to the folder, so an entry without the field behaves the
     way every entry did before notes could be coloured. */
  const body = (e) =>
    `${e.selector} .${e.body || 'nav-folder-title-content'}`;
  const blocks = [];

  /* What colour the marker is painted in.
   *
   * Normally the category colour. But with the background switched on,
   * that is the very colour the marker is standing on -- dot, bar and
   * icon all vanished into it, while the text beside them was readable
   * because it gets black or white worked out for it. So on a background
   * the marker follows the text.
   *
   * Not a new setting: the same decision as for the text colour on
   * 2026-08-26, worked out rather than chosen by hand. */
  const markColour = (e) =>
    e.stil.hintergrund ? readableText(e.farbe) : e.farbe;

  /* Which entries actually show an icon? Only those that have one, that
     show a marker at all, and whose icon can be resolved. Worked out
     once so the blocks below agree with each other. */
  const masks = new Map();
  const showsIcon = (e) => {
    if (!e.icon || e.stil.markierung === 'keine') return false;
    if (!masks.has(e.icon)) {
      masks.set(e.icon, (maskOf && maskOf(e.icon)) || null);
    }
    return masks.get(e.icon) !== null;
  };

  /* --- marker: icon ----------------------------------------------- */
  /* Grouped by icon, not by entry: that way the image data appears once
     per icon in the stylesheet rather than once per folder. With a few
     hundred folders sharing a category, that is the difference between
     a few hundred bytes and a few hundred kilobytes. */
  const toIcon = new Map();
  for (const e of eintraege.filter(showsIcon)) {
    if (!toIcon.has(e.icon)) toIcon.set(e.icon, []);
    toIcon.get(e.icon).push(e);
  }

  for (const [id, fitting] of toIcon) {
    const shape = fitting.map((e) => `${body(e)}::before`).join(',\n');
    const colours = fitting
      .map((e) => `${body(e)}::before { background-color: ${markColour(e)}; }`)
      .join('\n');

    /* The colour comes from the background, the icon only supplies the
       shape -- hence a mask rather than an image. That is what lets
       every folder carry the icon in its own category colour.
       The "-webkit-" prefix is there because Obsidian runs inside a
       WebKit view on iOS, where the property still needs it. */
    blocks.push(`${shape} {
  content: '';
  display: inline-block;
  width: 15px;
  height: 15px;
  margin-right: 6px;
  vertical-align: -0.19em;
  flex: 0 0 auto;
  -webkit-mask-image: ${masks.get(id)};
  mask-image: ${masks.get(id)};
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
}
${colours}`);
  }

  /* --- marker: bar and dot ---------------------------------------- */
  for (const mode of ['lasche', 'punkt']) {
    const fitting = eintraege.filter(
      (e) => e.stil.markierung === mode && !showsIcon(e)
    );
    if (!fitting.length) continue;

    const round = mode === 'punkt';
    const shape = fitting.map((e) => `${body(e)}::before`).join(',\n');
    const colours = fitting
      .map((e) => `${body(e)}::before { background-color: ${markColour(e)}; }`)
      .join('\n');

    blocks.push(`${shape} {
  content: '';
  display: inline-block;
  width: ${round ? '9px' : '5px'};
  height: ${round ? '9px' : '0.95em'};
  border-radius: ${round ? '50%' : '3px'};
  margin-right: 7px;
  vertical-align: ${round ? '0.02em' : '-0.12em'};
  flex: 0 0 auto;
}
${colours}`);
  }

  /* --- background -------------------------------------------------- */
  /* Obsidian colours the background itself on hover and for the active
     row -- that paints over the category colour and the folder turns
     grey. So the colour is set for :hover and .is-active too, and the
     feedback is laid on top as a dark veil instead. A veil works on any
     colour; a second fixed colour value would not.
     The "!important" is deliberate: third-party themes ship their own
     hover rules, and a rule of equal specificity loses against them. */
  for (const e of eintraege.filter((x) => x.stil.hintergrund)) {
    blocks.push(`${title(e)},
${title(e)}:hover,
${title(e)}.is-active,
${title(e)}.has-focus {
  background-color: ${e.farbe} !important;
  color: ${readableText(e.farbe)};
  border-radius: 4px;
}
${title(e)}:hover {
  box-shadow: inset 0 0 0 999px rgba(0, 0, 0, 0.13);
}
${title(e)}.is-active {
  box-shadow: inset 0 0 0 999px rgba(0, 0, 0, 0.22);
}`);
  }

  /* --- coloured text ----------------------------------------------- */
  /* Only where no background is set: there the block above already
     works out a readable text colour, and a second colour would
     override it and make the text unreadable. */
  const colouredText = eintraege.filter(
    (e) => e.stil.schriftFarbig && !e.stil.hintergrund
  );
  for (const e of colouredText) {
    blocks.push(`${body(e)} { color: ${e.farbe}; }`);
  }

  /* --- bold --------------------------------------------------------- */
  const fett = eintraege.filter((e) => e.stil.fett);
  if (fett.length) {
    const selection = fett.map((e) => body(e)).join(',\n');
    blocks.push(`${selection} {
  font-weight: 700;
}`);
  }

  /* --- dimmed ------------------------------------------------------- */
  /* Last block on purpose: this one turns a category down while every
     block above turns it up, and it has to sit after the background
     rule to reach it.

     On the row, not on the text: opacity on the row takes the marker,
     the icon, the collapse arrow and the background veil with it, which
     is what "the whole row steps back" means. Fading only the text
     would leave a bar at full colour next to a pale name -- the eye
     would go straight to the row that is meant to be quiet.

     Deliberately not on :hover: pointing at a dimmed folder brings it
     back to full strength, so a row you actually reach for is readable
     while you work with it. */
  const gedimmt = eintraege.filter((e) => e.stil.gedimmt);
  if (gedimmt.length) {
    const selection = gedimmt.map((e) => title(e)).join(',\n');
    const atCursor = gedimmt.map((e) => `${title(e)}:hover`).join(',\n');
    blocks.push(`${selection} {
  opacity: 0.45;
}
${atCursor} {
  opacity: 1;
}`);
  }

  return blocks.join('\n\n');
}

/* Text on a coloured box has to stay readable. The formula is the usual
   luminance weighting -- the eye perceives red, green and blue as
   differently bright. Above the threshold black text, below it white. */
function readableText(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'inherit';
  const lightness = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return lightness > 0.6 ? '#1c1c1c' : '#ffffff';
}

function hexToRgb(hex) {
  const t = String(hex).trim().replace(/^#/, '');
  const full = t.length === 3 ? t.split('').map((c) => c + c).join('') : t;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function randomColour() {
  /* Fixed saturation and lightness, only the hue is rolled -- so a new
     category never comes out washed out or garish. */
  const hue = Math.floor(Math.random() * 360);
  return hslToHex(hue, 65, 55);
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) =>
    Math.round(255 * x)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/* Rewrites one path in a map (path -> value), together with everything
   below it. Renaming a parent folder changes its children's paths too.
   Returns whether anything changed. */
function rewriteKeys(verzeichnis, old, fresh) {
  let changed = false;

  for (const path of Object.keys(verzeichnis)) {
    if (path === old) {
      verzeichnis[fresh] = verzeichnis[path];
      delete verzeichnis[path];
      changed = true;
    } else if (path.startsWith(old + '/')) {
      verzeichnis[fresh + path.slice(old.length)] = verzeichnis[path];
      delete verzeichnis[path];
      changed = true;
    }
  }

  return changed;
}

/* Which category do ALL of these folders share? If there is none, the
   result is null -- then no checkmark appears anywhere in the menu, and
   one click recolours the whole selection. Note that "none of them has
   one" counts as shared too, giving null just like "mixed does". For the
   menu that makes no difference: in both cases no checkmark is the
   right answer. */
function sharedCategory(zuordnung, paths) {
  if (!paths.length) return null;
  const first = zuordnung[paths[0]] || null;
  if (first === null) return null;
  for (const path of paths) {
    if ((zuordnung[path] || null) !== first) return null;
  }
  return first;
}

/* Quotes and backslashes in a path have to be escaped inside a CSS
   selector, or the rule breaks. Folder names may contain both. */
function toMask(text) {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/* Turns an icon's SVG into a CSS value for mask-image.
 *
 * The image data sits directly in the stylesheet ("data:"), so nothing
 * is ever loaded afterwards -- no network, no file, no moment at which
 * the icon is still missing.
 *
 * Encoding is complete rather than sparing: a "#" in the SVG would
 * otherwise be read as a fragment and the rest of the image would
 * vanish, and line breaks would break the CSS value. A few extra bytes
 * are worth that. */
function svgToMask(svgText) {
  const text = String(svgText || '').trim();
  if (!text.startsWith('<svg')) return null;
  return `url("data:image/svg+xml,${encodeURIComponent(text)}")`;
}

module.exports = ExplorerCategoriesPlugin;
