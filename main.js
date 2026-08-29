/* Explorer Categories
 *
 * A folder gets a category; the category carries the appearance. Change
 * the category and every folder in it follows at once -- that is the
 * whole point of the plugin.
 *
 * HOW IT IS BUILT
 * The plugin never touches the file explorer. It writes one <style>
 * element into the document head and lets Obsidian do the drawing. No
 * MutationObserver, nothing running in the background. The approach is
 * borrowed from "Color Folders and Files" (MIT,
 * github.com/Mithadon/obsidian-color-folders-files).
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
  Notice,
  setIcon,
  getIconIds,
  getLanguage,
} = require('obsidian');

/* Every visible string, once per language. Which list applies is decided
   by Obsidian's interface language, see spracheWaehlen() below.

   To contribute a third language: copy TEXTE_EN, translate the entries,
   and add the list to SPRACHEN. Nothing in the code itself changes. */
const TEXTE_DE = {
  /* "Category" on its own would be lost in the context menu -- there are
     a dozen other entries competing with it. */
  menue: 'Farbkategorie',
  keine: 'Farbe entfernen',
  verwalten: 'Kategorien verwalten …',
  aufUnterordner: 'Gilt auch für Unterordner',
  aufDateien: 'Gilt auch für Notizen darin',
  erbtVon: (ordner, kategorie) => `Erbt „${kategorie}" von „${ordner}"`,
  fensterTitel: 'Farbkategorien',
  fensterOeffnen: 'Farbkategorien verwalten',
  neue: 'Neue Kategorie',
  neueVorgabe: 'Neue Kategorie',
  loeschen: 'Löschen',
  namePlatzhalter: 'Name',
  farbeWaehlen: 'Farbe wählen',
  nichtsGewaehlt: 'Links eine Kategorie auswählen.',
  markierung: 'Markierung',
  zusaetzlich: 'Zusätzlich',
  vererbung: 'Vererbung',
  /* Names the two areas that had none. What the third area is, its own
     first row says: a colour and a name. */
  bereichGruppen: 'Gruppen',
  bereichKategorien: 'Kategorien',
  /* Telling the folder that carries the assignment apart from the ones
     that only inherit from it. */
  vaterHervorheben: 'Vater hervorheben',
  vaterKeine: 'Ohne',
  vaterFett: 'Fett',
  vaterHintergrund: 'Hintergrund',
  vaterSchrift: 'Schrift farbig',
  vaterSymbol: 'Symbol',
  vaterMarkierung: 'Markierung',
  vaterBlass: 'Kinder blasser',
  /* Short on purpose: these share one reserved line with the sentence
     above them, and a second line would push the window into a
     scrollbar. */
  vaterSchonFett: 'Die Kategorie ist ohnehin ganz fett.',
  vaterSchonHintergrund: 'Die Kategorie hat ohnehin einen Hintergrund.',
  vaterSchonSchrift: 'Die Kategorie hat ohnehin farbige Schrift.',
  vaterSchriftUnterHintergrund: 'Mit Hintergrund wählt das Plugin die Schriftfarbe selbst.',
  vaterSchonBlass: 'Die Kategorie ist ohnehin abgedunkelt.',
  vaterOhneSymbol: 'Dafür muss oben ein Symbol gesetzt sein.',
  vaterSymbolSchlaegt: 'Mit Symbol tragen beide dasselbe Zeichen.',
  vorschau: 'Vorschau',
  symbol: 'Symbol',
  symbolWaehlen: 'Symbol wählen …',
  symbolName: 'Name des Symbols',
  symbolUnbekannt: 'Ein Symbol dieses Namens gibt es nicht.',
  symbolEntfernen: 'Entfernen',
  symbolSuche: 'Symbol suchen',
  symbolNichtsGefunden: 'Kein Symbol gefunden.',
  symbolFensterTitel: 'Symbol wählen',
  symbolErsetzt: 'Das Symbol tritt an die Stelle von Lasche und Punkt.',
  symbolOhneWirkung: 'Bei „Ohne" bleibt der Ordner unmarkiert, auch mit Symbol.',
  symbolMehr: (gezeigt, gesamt) => `${gezeigt} von ${gesamt} — weiter eingrenzen.`,
  beispielOrdner: 'Beispielordner',
  ordnerZahl: (n) => (n === 1 ? '1 Ordner' : `${n} Ordner`),
  loeschFrage: (name, n) =>
    n === 0
      ? `„${name}" löschen?`
      : `„${name}" löschen? ${n === 1 ? 'Ein Ordner verliert' : `${n} Ordner verlieren`} damit die Farbe.`,
  geloescht: (name) => `„${name}" gelöscht.`,
  abbrechen: 'Abbrechen',
  speichern: 'Speichern',
  verwerfen: 'Verwerfen',
  verwerfenFrage: 'Die Änderungen verwerfen? Sie gehen dabei verloren.',
  sichern: 'Sichern',
  laden: 'Laden',
  gesichert: (name) => `Gesichert als „${name}".`,
  sicherungFehlgeschlagen: 'Die Sicherung konnte nicht geschrieben werden.',
  sicherungTitel: 'Sicherung laden',
  sicherungSchreibenTitel: 'Sichern',
  ordnerWaehlenTitel: 'Ordner wählen',
  ordnerWaehlen: 'Ändern',
  ordnerSuchen: 'Ordner suchen',
  ordnerWurzel: '(oberste Ebene des Vaults)',
  ordnerKeiner: 'Kein Ordner passt zur Suche.',
  sicherungZiel: 'Ziel',
  sicherungQuelle: 'Ordner',
  sicherungJetzt: 'Jetzt sichern',
  sicherungLeer: 'Es liegt noch keine Sicherung vor. „Sichern" legt die erste an.',
  sicherungFrage: (name) =>
    `„${name}" laden? Ersetzt den Stand im Fenster — geschrieben wird er erst mit „Speichern".`,
  sicherungGeladen: 'Geladen. Mit „Speichern" übernehmen, mit „Abbrechen" verwerfen.',
  sicherungUnlesbar: 'Die Datei lässt sich nicht lesen.',
  sicherungOhneKategorien: 'In der Datei stehen keine Kategorien.',
  markierungKeine: 'Ohne',
  markierungLasche: 'Lasche',
  markierungPunkt: 'Punkt',
  hintergrund: 'Hintergrund',
  schriftFarbig: 'Schrift farbig',
  fett: 'Fett',
  gedimmt: 'Abdunkeln',
  schriftAutomatisch: 'Bei Hintergrund wählt das Plugin die Schriftfarbe selbst, damit sie lesbar bleibt.',
  gedimmtHinweis: 'Abgedunkelt tritt die ganze Zeile zurück, Markierung und Symbol werden blasser.',
  /* With a multi-selection the count goes in the title. It counts
     folders, not selected items: select five folders and three notes and
     this reads "5 folders", making it obvious that notes are left
     alone. */
  menueMehrere: (n) => `Farbkategorie (${n} Ordner)`,
  zugewiesen: (n, name) =>
    n === 1 ? `1 Ordner → „${name}"` : `${n} Ordner → „${name}"`,
  entfernt: (n) =>
    n === 1 ? 'Farbe von 1 Ordner entfernt.' : `Farbe von ${n} Ordnern entfernt.`,
  beispielName: (n) => `Kategorie ${n}`,
  hilfe: 'Hilfe',
  /* Groups: one legend per part of the vault. */
  beispielGruppe: 'Legende 1',
  gruppeNeu: 'Neue Gruppe',
  gruppeNeuVorgabe: 'Neue Gruppe',
  gruppeName: 'Name der Gruppe',
  gruppeLoeschen: 'Gruppe löschen',
  gruppeDuplizieren: 'Gruppe duplizieren',
  duplizieren: 'Duplizieren',
  gruppeFeld: 'Gruppe',
  gruppeWechseln: 'In eine andere Gruppe verschieben',
  kopieName: (name) => `${name} (Kopie)`,
  gruppeLoeschFrage: (name, n) =>
    n === 0
      ? `Gruppe „${name}" löschen?`
      : `Gruppe „${name}" löschen? ${n === 1 ? 'Die Kategorie darin wird' : `Die ${n} Kategorien darin werden`} mitgelöscht, und Ordner mit diesen Farben verlieren sie.`,
  gruppeGeloescht: (name) => `Gruppe „${name}" gelöscht.`,
  gruppeZahl: (n) => (n === 1 ? '1 Kategorie' : `${n} Kategorien`),
  keineKategorienInGruppe: 'In dieser Gruppe ist noch keine Kategorie.',
  /* Order. The list stands upright, the tabs lie down -- hence up/down
     for one and left/right for the other. */
  hochSchieben: 'Nach oben',
  runterSchieben: 'Nach unten',
  sortierenAuf: 'Nach Namen sortieren, A bis Z',
  sortierenAb: 'Nach Namen sortieren, Z bis A',
  gruppeLinks: 'Gruppe nach links',
  gruppeRechts: 'Gruppe nach rechts',
};

/* American spelling ("color"), matching Obsidian itself. */
const TEXTE_EN = {
  menue: 'Color category',
  keine: 'Remove color',
  verwalten: 'Manage categories …',
  aufUnterordner: 'Also applies to subfolders',
  aufDateien: 'Also applies to the notes inside',
  erbtVon: (ordner, kategorie) => `Inherits "${kategorie}" from "${ordner}"`,
  fensterTitel: 'Color categories',
  fensterOeffnen: 'Manage color categories',
  neue: 'New category',
  neueVorgabe: 'New category',
  loeschen: 'Delete',
  namePlatzhalter: 'Name',
  farbeWaehlen: 'Choose the colour',
  nichtsGewaehlt: 'Select a category on the left.',
  markierung: 'Marker',
  zusaetzlich: 'Additional',
  vererbung: 'Inheritance',
  bereichGruppen: 'Groups',
  bereichKategorien: 'Categories',
  vaterHervorheben: 'Set the parent apart',
  vaterKeine: 'None',
  vaterFett: 'Bold',
  vaterHintergrund: 'Background',
  vaterSchrift: 'Colored text',
  vaterSymbol: 'Icon',
  vaterMarkierung: 'Marker',
  vaterBlass: 'Children fainter',
  vaterSchonFett: 'The category is bold throughout anyway.',
  vaterSchonHintergrund: 'The category already has a background.',
  vaterSchonSchrift: 'The category already has colored text.',
  vaterSchriftUnterHintergrund: 'With a background, the plugin picks the text color itself.',
  vaterSchonBlass: 'The category is dimmed anyway.',
  vaterOhneSymbol: 'An icon has to be set above for this.',
  vaterSymbolSchlaegt: 'With an icon, both carry the same mark.',
  vorschau: 'Preview',
  symbol: 'Icon',
  symbolWaehlen: 'Choose icon …',
  symbolName: 'Icon name',
  symbolUnbekannt: 'There is no icon of that name.',
  symbolEntfernen: 'Remove',
  symbolSuche: 'Search icons',
  symbolNichtsGefunden: 'No icon found.',
  symbolFensterTitel: 'Choose icon',
  symbolErsetzt: 'The icon takes the place of the bar and the dot.',
  symbolOhneWirkung: 'With "None" the folder stays unmarked, icon or not.',
  symbolMehr: (gezeigt, gesamt) => `${gezeigt} of ${gesamt} — narrow the search.`,
  beispielOrdner: 'Example folder',
  ordnerZahl: (n) => (n === 1 ? '1 folder' : `${n} folders`),
  loeschFrage: (name, n) =>
    n === 0
      ? `Delete "${name}"?`
      : `Delete "${name}"? ${n === 1 ? 'One folder loses' : `${n} folders lose`} their color.`,
  geloescht: (name) => `"${name}" deleted.`,
  abbrechen: 'Cancel',
  speichern: 'Save',
  verwerfen: 'Discard',
  verwerfenFrage: 'Discard the changes? They will be lost.',
  sichern: 'Back up',
  laden: 'Restore',
  gesichert: (name) => `Backed up as "${name}".`,
  sicherungFehlgeschlagen: 'The backup could not be written.',
  sicherungTitel: 'Restore a backup',
  sicherungSchreibenTitel: 'Back up',
  ordnerWaehlenTitel: 'Choose a folder',
  ordnerWaehlen: 'Change',
  ordnerSuchen: 'Search folders',
  ordnerWurzel: '(top level of the vault)',
  ordnerKeiner: 'No folder matches the search.',
  sicherungZiel: 'Into',
  sicherungQuelle: 'Folder',
  sicherungJetzt: 'Back up now',
  sicherungLeer: 'There is no backup yet. "Back up" makes the first one.',
  sicherungFrage: (name) =>
    `Restore "${name}"? It replaces what is in the window -- nothing is written until you press Save.`,
  sicherungGeladen: 'Restored. Press Save to keep it, Cancel to drop it.',
  sicherungUnlesbar: 'The file cannot be read.',
  sicherungOhneKategorien: 'The file holds no categories.',
  markierungKeine: 'None',
  markierungLasche: 'Bar',
  markierungPunkt: 'Dot',
  hintergrund: 'Background',
  schriftFarbig: 'Colored text',
  fett: 'Bold',
  gedimmt: 'Dim',
  schriftAutomatisch: 'With a background, the plugin picks the text color itself so it stays readable.',
  gedimmtHinweis: 'Dimmed, the whole row steps back: marker and icon fade with it.',
  menueMehrere: (n) => `Color category (${n} folders)`,
  zugewiesen: (n, name) =>
    n === 1 ? `1 folder → "${name}"` : `${n} folders → "${name}"`,
  entfernt: (n) =>
    n === 1 ? 'Color removed from 1 folder.' : `Color removed from ${n} folders.`,
  beispielName: (n) => `Category ${n}`,
  hilfe: 'Help',
  beispielGruppe: 'Legend 1',
  gruppeNeu: 'New group',
  gruppeNeuVorgabe: 'New group',
  gruppeName: 'Group name',
  gruppeLoeschen: 'Delete group',
  gruppeDuplizieren: 'Duplicate group',
  duplizieren: 'Duplicate',
  gruppeFeld: 'Group',
  gruppeWechseln: 'Move to another group',
  kopieName: (name) => `${name} copy`,
  gruppeLoeschFrage: (name, n) =>
    n === 0
      ? `Delete group "${name}"?`
      : `Delete group "${name}"? ${n === 1 ? 'The category in it goes' : `The ${n} categories in it go`} with it, and folders carrying those colors lose them.`,
  gruppeGeloescht: (name) => `Group "${name}" deleted.`,
  gruppeZahl: (n) => (n === 1 ? '1 category' : `${n} categories`),
  keineKategorienInGruppe: 'No category in this group yet.',
  hochSchieben: 'Move up',
  runterSchieben: 'Move down',
  sortierenAuf: 'Sort by name, A to Z',
  sortierenAb: 'Sort by name, Z to A',
  gruppeLinks: 'Move group left',
  gruppeRechts: 'Move group right',
};

const SPRACHEN = { de: TEXTE_DE, en: TEXTE_EN };

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
function spracheWaehlen() {
  try {
    const kennung = String(getLanguage() || '').toLowerCase().split('-')[0];
    return SPRACHEN[kennung] || TEXTE_EN;
  } catch (e) {
    return TEXTE_EN;
  }
}

const TEXTE = spracheWaehlen();

const MARKIERUNGEN = [
  { id: 'keine', name: TEXTE.markierungKeine },
  { id: 'lasche', name: TEXTE.markierungLasche },
  { id: 'punkt', name: TEXTE.markierungPunkt },
];

/* How the folder carrying the assignment is told apart from the ones
 * that only inherit from it. One choice, not a set of switches: two of
 * these at once would fight each other for the same row.
 *
 * "blass" is the odd one out -- it does not touch the parent at all, it
 * takes the children down. The result is the same, the parent is the
 * row that stands out, and it is the only way to do that without making
 * anything louder. */
const VATER_ARTEN = [
  { id: 'keine', name: TEXTE.vaterKeine },
  { id: 'fett', name: TEXTE.vaterFett },
  { id: 'hintergrund', name: TEXTE.vaterHintergrund },
  { id: 'schrift', name: TEXTE.vaterSchrift },
  { id: 'symbol', name: TEXTE.vaterSymbol },
  { id: 'markierung', name: TEXTE.vaterMarkierung },
  { id: 'blass', name: TEXTE.vaterBlass },
];

/* What a freshly created category starts out with. */
const STIL_VORGABE = {
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
  /* Nothing by default: a folder and what inherits from it look the
     same, the way they always did. */
  vaterHervor: 'keine',
};

/* Neutral examples, deliberately meaningless -- users rename them. The
   names come from the language list: they are the first thing anyone
   sees after installing, and an untranslated name would be a poor first
   impression. */
const BEISPIEL_KATEGORIEN = [
  { id: 'kat-1', name: TEXTE.beispielName(1), farbe: '#4a90d9', gruppe: 'grp-1' },
  { id: 'kat-2', name: TEXTE.beispielName(2), farbe: '#e05252', gruppe: 'grp-1' },
  { id: 'kat-3', name: TEXTE.beispielName(3), farbe: '#3fb950', gruppe: 'grp-1' },
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
const BEISPIEL_GRUPPEN = [{ id: 'grp-1', name: TEXTE.beispielGruppe }];

const STANDARD_DATEN = {
  gruppen: BEISPIEL_GRUPPEN,
  kategorien: BEISPIEL_KATEGORIEN,
  /* folder path -> category id.
     The only table about folders. Whether a folder passes its colour
     down is not stored here: that hangs off the category, see
     STIL_VORGABE above. */
  zuordnung: {},
};

const STIL_ID = 'explorer-categories-stil';

/* Backups go into the vault, not next to data.json.
 *
 * A copy in the plugin's own folder would share the fate of the file it
 * is meant to survive -- the same folder, the same sync, the same
 * mishap. In the vault the folder shows up in the file explorer, which
 * is the point: a backup nobody can see is one nobody copies off the
 * machine.
 *
 * Lower case and no spaces, so the name survives every filesystem and
 * every sync in one piece. */
const SICHERUNG_ORDNER = 'explorer-categories-backup';

/* Joins a folder and a file name. The top level of the vault is the
   empty string for the adapter, and "" + "/" + name would make an
   absolute path that writes outside the vault on some platforms. */
const pfadBauen = (ordner, name) => (ordner ? `${ordner}/${name}` : name);

/* Sorts by name, so the file name has to carry the date in an order
   that sorts: year, month, day, hour, minute. */
const zeitstempel = () => {
  const jetzt = new Date();
  const zwei = (n) => String(n).padStart(2, '0');
  return (
    `${jetzt.getFullYear()}${zwei(jetzt.getMonth() + 1)}${zwei(jetzt.getDate())}` +
    `-${zwei(jetzt.getHours())}${zwei(jetzt.getMinutes())}`
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
 * is worse than none. */
const HILFE_ADRESSE = 'https://github.com/jdaehler/obsidian-explorer-categories';

class ExplorerCategoriesPlugin extends Plugin {
  async onload() {
    const geladen = await this.loadData();
    /* Deep copy of the defaults: otherwise the data would point at the
       very objects declared above, and editing a category would mutate
       the examples along with it. */
    this.daten = Object.assign(JSON.parse(JSON.stringify(STANDARD_DATEN)), geladen);
    this.altbestandUmstellen();

    this.stilEl = document.createElement('style');
    this.stilEl.id = STIL_ID;
    document.head.appendChild(this.stilEl);
    this.stilSchreiben();

    /* Right-click on a single folder */
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, datei) => {
        if (datei instanceof TFolder) this.menueEintragBauen(menu, [datei]);
      })
    );

    /* Right-click on a multi-selection. Obsidian fires a separate event
       for this; "file-menu" does not arrive at all. Users select with
       alt-click (single) or shift-click (range) in the file explorer.

       Verified against Obsidian 1.12.7: the file explorer triggers
       "files-menu" with every selected entry and only filters out
       unsupported *files*, never folders. Notes are included, so they
       are filtered here -- only folders ever get colored. */
    this.registerEvent(
      this.app.workspace.on('files-menu', (menu, dateien) => {
        const ordner = (dateien || []).filter((d) => d instanceof TFolder);
        if (ordner.length) this.menueEintragBauen(menu, ordner);
      })
    );

    /* Renaming and moving: the assignment follows the folder. */
    this.registerEvent(
      this.app.vault.on('rename', (datei, alterPfad) => {
        this.pfadUmschreiben(alterPfad, datei.path);
      })
    );

    /* Deliberately no ribbon icon: the window hangs in the folder's own
       context menu, which is where you already are. The ribbon is
       crowded enough. The command stays so the window is reachable
       without a mouse. */
    this.addCommand({
      id: 'open-categories',
      name: TEXTE.fensterOeffnen,
      callback: () => this.fensterOeffnen(),
    });
  }

  onunload() {
    if (this.stilEl) this.stilEl.remove();
  }

  fensterOeffnen() {
    new KategorienFenster(this.app, this).open();
  }

  /* Three older data shapes have to be carried over so nobody loses
     their settings:
       1. A single appearance for everything (top-level "darstellung").
       2. One appearance per category, but only one of four at a time
          (a "darstellung" field inside the category).
       3. No groups at all -- one flat list of categories.
     The first two are translated into the current form with four
     independent switches, the third into a single group holding
     everything. */
  altbestandUmstellen() {
    const alteGlobale = this.daten.darstellung;
    delete this.daten.darstellung;
    delete this.daten.darstellungVorgabe;

    for (const kat of this.daten.kategorien) {
      if (kat.stil) continue;

      const alt = kat.darstellung || alteGlobale;
      delete kat.darstellung;
      kat.stil = stilAusAlterForm(alt);
    }

    this.vererbungUmstellen();
    gruppenNachziehen(this.daten, TEXTE.beispielGruppe);
  }

  /* Inheritance used to be two tables of folder paths. It is a property
     of the category now, so the old flags are carried over: a category
     inherits from now on if at least one of its folders used to.
     Deliberately generous rather than exact -- the alternative is a
     folder that quietly loses a colour it had yesterday, and that is
     harder to notice than one that has too much. */
  vererbungUmstellen() {
    const stilSetzen = (pfad, feld) => {
      const katId = this.daten.zuordnung[pfad];
      if (!katId) return;
      const kat = this.daten.kategorien.find((k) => k.id === katId);
      if (!kat) return;
      kat.stil = Object.assign({}, STIL_VORGABE, kat.stil || {}, { [feld]: true });
    };

    for (const pfad of Object.keys(this.daten.vererbung || {})) {
      if (this.daten.vererbung[pfad]) stilSetzen(pfad, 'vererbt');
    }
    for (const pfad of Object.keys(this.daten.dateiVererbung || {})) {
      if (this.daten.dateiVererbung[pfad]) stilSetzen(pfad, 'vererbtDateien');
    }

    delete this.daten.vererbung;
    delete this.daten.dateiVererbung;
  }

  /* The categories of one group, in the order they are stored. */
  kategorienIn(gruppenId) {
    return this.daten.kategorien.filter((k) => k.gruppe === gruppenId);
  }

  async gruppeAnlegen() {
    const id = neueId('grp', this.daten.gruppen.map((g) => g.id));
    this.daten.gruppen.push({ id, name: TEXTE.gruppeNeuVorgabe });
    await this.speichern();
    return id;
  }

  async gruppeUmbenennen(gruppenId, name) {
    const gruppe = this.daten.gruppen.find((g) => g.id === gruppenId);
    if (!gruppe) return;
    gruppe.name = name;
    await this.speichern();
  }

  /* Moves a group one place along the strip of tabs. The array is the
     order -- nothing sorts anywhere else, so swapping two entries is the
     whole job.

     Says whether anything moved, so the window can leave itself alone
     when the group is already at the end. */
  async gruppeVerschieben(gruppenId, richtung) {
    const gruppen = this.daten.gruppen;
    const von = gruppen.findIndex((g) => g.id === gruppenId);
    if (von < 0) return false;

    const nach = von + richtung;
    if (nach < 0 || nach >= gruppen.length) return false;

    const merk = gruppen[von];
    gruppen[von] = gruppen[nach];
    gruppen[nach] = merk;

    await this.speichern();
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
  async gruppeDuplizieren(gruppenId) {
    const gruppen = this.daten.gruppen;
    const von = gruppen.findIndex((g) => g.id === gruppenId);
    if (von < 0) return null;

    const vorlage = gruppen[von];
    const neu = {
      id: neueId('grp', gruppen.map((g) => g.id)),
      name: TEXTE.kopieName(vorlage.name),
    };
    gruppen.splice(von + 1, 0, neu);

    /* The ids taken grow with every copy made here -- all of them fall
       in the same millisecond, so asking the array once at the start
       would not be enough. */
    const vergeben = this.daten.kategorien.map((k) => k.id);
    for (const kat of this.kategorienIn(gruppenId)) {
      const id = neueId('kat', vergeben);
      vergeben.push(id);
      this.daten.kategorien.push(this.kategorieKopie(kat, id, neu.id, kat.name));
    }

    await this.speichern();
    return neu.id;
  }

  /* Copies a category with everything that makes it look the way it
     does, and puts the copy directly behind the original -- the place
     you were looking at when you asked for it.

     No folder assignments, same reason as above. */
  async kategorieDuplizieren(katId) {
    const alle = this.daten.kategorien;
    const von = alle.findIndex((k) => k.id === katId);
    if (von < 0) return null;

    const vorlage = alle[von];
    const id = neueId('kat', alle.map((k) => k.id));

    alle.splice(
      von + 1,
      0,
      this.kategorieKopie(vorlage, id, vorlage.gruppe, TEXTE.kopieName(vorlage.name))
    );

    await this.speichern();
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
  async kategorieUmhaengen(katId, gruppenId) {
    const alle = this.daten.kategorien;
    const von = alle.findIndex((k) => k.id === katId);
    if (von < 0) return false;
    if (alle[von].gruppe === gruppenId) return false;
    if (!this.daten.gruppen.some((g) => g.id === gruppenId)) return false;

    const kat = alle[von];
    kat.gruppe = gruppenId;
    alle.splice(von, 1);
    alle.push(kat);

    await this.speichern();
    return true;
  }

  /* One category, copied. The style is copied over STIL_VORGABE rather
     than handed on: sharing the object would tie the two categories
     together, and a switch flipped on one would move on the other. */
  kategorieKopie(vorlage, id, gruppenId, name) {
    return {
      id,
      name,
      farbe: vorlage.farbe,
      gruppe: gruppenId,
      icon: vorlage.icon || null,
      stil: Object.assign({}, STIL_VORGABE, vorlage.stil || {}),
    };
  }

  /* Deletes the group and everything in it. The categories cannot stay
     behind: a category outside every group would show up nowhere and be
     impossible to get at again.

     Never the last one. Without a group there is no place to put a new
     category, and the window would have nothing to show. */
  async gruppeLoeschen(gruppenId) {
    if (this.daten.gruppen.length < 2) return false;

    for (const kat of this.kategorienIn(gruppenId)) {
      this.zuordnungenEntfernen(kat.id);
    }

    this.daten.kategorien = this.daten.kategorien.filter(
      (k) => k.gruppe !== gruppenId
    );
    this.daten.gruppen = this.daten.gruppen.filter((g) => g.id !== gruppenId);

    await this.speichern();
    return true;
  }

  /* Drops every assignment pointing at a category. Used when a category
     or a whole group is deleted -- an assignment left pointing at
     something gone would colour nothing and sit in the file forever.
     The inheritance flags need no cleaning up: they went with the
     category. */
  zuordnungenEntfernen(katId) {
    for (const pfad of Object.keys(this.daten.zuordnung)) {
      if (this.daten.zuordnung[pfad] === katId) delete this.daten.zuordnung[pfad];
    }
  }

  stilVon(katId) {
    const kat = this.daten.kategorien.find((k) => k.id === katId);
    if (!kat) return null;
    return Object.assign({}, STIL_VORGABE, kat.stil || {});
  }

  /* Which folder further up gives this one its color? Searched from
     near to far, because the closest ancestor wins -- the same order the
     CSS rules are sorted in. */
  erbtVon(pfad) {
    const teile = pfad.split('/');

    for (let i = teile.length - 1; i > 0; i--) {
      const eltern = teile.slice(0, i).join('/');
      const katId = this.daten.zuordnung[eltern];
      if (!katId) continue;
      const stil = this.stilVon(katId);
      if (!stil || !stil.vererbt) continue;
      const kat = this.daten.kategorien.find((k) => k.id === katId);
      if (kat) return { ordner: eltern, kategorie: kat.name };
    }

    return null;
  }

  /* ---------------------------------------------------------------- */
  /* Context menu                                                      */
  /* ---------------------------------------------------------------- */

  /* Takes a list of folders, never a single one. Right-clicking one
     folder simply passes a list of one -- that way there is a single
     path through this code instead of two that drift apart. */
  menueEintragBauen(menu, ordnerListe) {
    const pfade = ordnerListe.map((o) => o.path);
    const mehrere = pfade.length > 1;

    /* With several folders, a checkmark only when all of them really
       share a category. Otherwise the mark would claim something that
       is wrong for half of the selection. */
    const aktuell = gemeinsameKategorie(this.daten.zuordnung, pfade);
    /* For "remove" and "inherit", a single coloured folder in the
       selection is enough -- otherwise the entry would be missing
       exactly when it is needed. */
    const irgendeine = pfade.some((p) => this.daten.zuordnung[p]);

    /* One row per category. Pulled out because it is needed in three
       places: flat, inside the one submenu, and inside a group's
       submenu. */
    const katZeilen = (ziel, kategorien, titel) => {
      for (const kat of kategorien) {
        ziel.addItem((i) =>
          i
            .setTitle(titel(kat.name))
            .setChecked(aktuell === kat.id)
            .onClick(() => this.zuweisenMehrere(pfade, kat.id))
        );
      }
    };

    /* The entries are identical either way; only the place differs:
       inside a submenu, or flat in the main menu.

       "mitUnter" says whether this Obsidian has submenus at all. It is
       known from the outer entry: if that one could not open a submenu,
       nothing below it can either. */
    const eintraegeFuellen = (ziel, mitPraefix, mitUnter) => {
      const kopf = mehrere ? TEXTE.menueMehrere(pfade.length) : TEXTE.menue;
      const titel = (t) => (mitPraefix ? `${kopf}: ${t}` : t);

      const gruppen = this.daten.gruppen;

      /* A single legend gets no level of its own. A submenu that always
         holds exactly one thing is a click for nothing -- and until
         somebody sets up a second legend, that is every vault. */
      if (gruppen.length < 2 || !mitUnter) {
        for (const gruppe of gruppen) {
          const kats = this.kategorienIn(gruppe.id);
          if (!kats.length) continue;
          /* Flat with several legends: the group name has to travel
             with each entry, or two identical reds give no clue which
             legend they belong to. */
          const mitGruppe =
            gruppen.length < 2 ? titel : (t) => titel(`${gruppe.name}: ${t}`);
          katZeilen(ziel, kats, mitGruppe);
        }
      } else {
        for (const gruppe of gruppen) {
          const kats = this.kategorienIn(gruppe.id);
          /* An empty legend would be a submenu that opens on nothing. */
          if (!kats.length) continue;

          ziel.addItem((eintrag) => {
            eintrag.setTitle(gruppe.name);
            const unter = eintrag.setSubmenu();
            katZeilen(unter, kats, (t) => t);
          });
        }
      }

      /* If the folder inherits from above, say so here -- otherwise you
         see a color, find nothing about it in the menu, and blame the
         plugin. Single folder only: twenty selected folders would mean
         twenty different sources, which fits in no single line. */
      const quelle =
        !mehrere && aktuell === null ? this.erbtVon(pfade[0]) : null;
      if (quelle) {
        if (typeof ziel.addSeparator === 'function') ziel.addSeparator();
        ziel.addItem((i) => {
          i.setTitle(
            titel(TEXTE.erbtVon(quelle.ordner, quelle.kategorie))
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
      if (irgendeine) {
        if (typeof ziel.addSeparator === 'function') ziel.addSeparator();

        ziel.addItem((i) =>
          i
            .setTitle(titel(TEXTE.keine))
            .setIcon('eraser')
            .onClick(() => this.zuweisenMehrere(pfade, null))
        );
      }

      /* The way into the window lives here so the ribbon icon can be
         left out entirely. */
      if (typeof ziel.addSeparator === 'function') ziel.addSeparator();
      ziel.addItem((i) =>
        i
          .setTitle(titel(TEXTE.verwalten))
          .setIcon('settings')
          .onClick(() => this.fensterOeffnen())
      );
    };

    /* Submenus only exist in newer Obsidian versions. Without them the
       categories go flat into the menu rather than disappearing. */
    let untermenueGebaut = false;

    menu.addItem((eintrag) => {
      eintrag
        .setTitle(mehrere ? TEXTE.menueMehrere(pfade.length) : TEXTE.menue)
        .setIcon('palette');
      if (typeof eintrag.setSubmenu !== 'function') return;

      const unter = eintrag.setSubmenu();
      if (!unter || typeof unter.addItem !== 'function') return;

      eintraegeFuellen(unter, false, true);
      untermenueGebaut = true;
    });

    if (!untermenueGebaut) eintraegeFuellen(menu, true, false);
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
  async speichern() {
    if (this.entwurfLaeuft) {
      this.stilSchreiben();
      return;
    }
    await this.saveData(this.daten);
    this.stilSchreiben();
  }

  /* --- Backups ----------------------------------------------------- */

  /* Writes the whole of the data as one readable JSON file.
   *
   * Indented rather than packed: this file exists to be looked at and
   * carried off, and a category list is a few kilobytes either way.
   *
   * The wrapper around the data carries the version that wrote it. A
   * file restored two years from now runs through altbestandUmstellen()
   * like any other old shape, and the number says what to expect.
   *
   * What gets written is what is on screen, unsaved edits and all --
   * this.daten is the draft while the window is open. That is the state
   * somebody pressing "Back up" is looking at, and backing up a
   * different one than the visible one would be a trap. It does mean a
   * backup can outlive a Cancel: the file stays, the edits do not. */
  /* Where backups go. Remembered with the rest of the data, so the
     choice survives a restart, and falling back to the default folder if
     nothing was ever chosen. */
  sicherungOrdner() {
    const gemerkt = this.daten.sicherungOrdner;
    return typeof gemerkt === 'string' ? gemerkt : SICHERUNG_ORDNER;
  }

  async sicherungOrdnerSetzen(ordner) {
    this.daten.sicherungOrdner = ordner;
    await this.speichern();
  }

  async sicherungSchreiben(ordner) {
    const adapter = this.app.vault.adapter;
    const ziel = typeof ordner === 'string' ? ordner : this.sicherungOrdner();

    /* Only for a named folder. The top level is the vault itself and is
       always there; mkdir("") would fail. */
    if (ziel && !(await adapter.exists(ziel))) {
      await adapter.mkdir(ziel);
    }

    const name = `kategorien-${zeitstempel()}.json`;
    const inhalt = JSON.stringify(
      {
        plugin: 'explorer-categories',
        version: this.manifest ? this.manifest.version : '',
        geschrieben: new Date().toISOString(),
        daten: this.daten,
      },
      null,
      2
    );

    await adapter.write(pfadBauen(ziel, name), inhalt);
    return name;
  }

  /* Newest first -- the name sorts by date, so reversing the plain sort
     is enough and no file has to be opened to order the list. */
  async sicherungenFinden(ordner) {
    const adapter = this.app.vault.adapter;
    const quelle = typeof ordner === 'string' ? ordner : this.sicherungOrdner();

    /* An empty string is the vault itself and always exists; a named
       folder may have been renamed or thrown away since it was chosen. */
    if (quelle && !(await adapter.exists(quelle))) return [];

    const inhalt = await adapter.list(quelle);
    return (inhalt.files || [])
      .filter((pfad) => pfad.endsWith('.json'))
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
  async sicherungLesen(pfad) {
    let roh;
    try {
      roh = JSON.parse(await this.app.vault.adapter.read(pfad));
    } catch (e) {
      throw new Error(TEXTE.sicherungUnlesbar);
    }

    const daten = roh && roh.daten ? roh.daten : roh;
    if (!daten || !Array.isArray(daten.kategorien) || !daten.kategorien.length) {
      throw new Error(TEXTE.sicherungOhneKategorien);
    }
    return daten;
  }

  /* Puts a backup in place of what is on screen -- in the draft, so Save
     confirms it and Cancel puts the old one back. Restoring is the one
     action in this window that replaces everything at once, which makes
     the way back matter more here than anywhere else.
   *
     Runs through the same defaults and the same migration as a normal
     start, so a file from an older version arrives in today's shape
     instead of half-filled. */
  sicherungUebernehmen(daten) {
    this.daten = Object.assign(
      JSON.parse(JSON.stringify(STANDARD_DATEN)),
      JSON.parse(JSON.stringify(daten))
    );
    this.altbestandUmstellen();
    this.stilSchreiben();
  }

  /* The safety copy is taken once, when the window opens. Everything
     below works on this.daten as before -- not a single other method
     had to change for this. Cancelling means putting the copy back. */
  entwurfStarten() {
    this.original = JSON.parse(JSON.stringify(this.daten));
    this.entwurfLaeuft = true;
  }

  async entwurfUebernehmen() {
    this.entwurfLaeuft = false;
    this.original = null;
    await this.speichern();
  }

  entwurfVerwerfen() {
    if (!this.entwurfLaeuft) return;
    if (this.original) this.daten = this.original;
    this.original = null;
    this.entwurfLaeuft = false;
    /* Repaints from the restored data, so the tree jumps back to where
       it was before the window opened. */
    this.stilSchreiben();
  }

  /* Compared as text on purpose: the data is a handful of kilobytes of
     plain JSON, and this catches a change anywhere in it -- colour,
     name, switch, a deleted group -- without a list of fields that
     would go stale the next time one is added. */
  entwurfGeaendert() {
    if (!this.entwurfLaeuft || !this.original) return false;
    return JSON.stringify(this.daten) !== JSON.stringify(this.original);
  }

  /* Changes every path and then saves ONCE. With forty selected folders,
     forty separate writes to data.json would be most of the waiting time
     -- and the stylesheet would be rebuilt forty times over. */
  async zuweisenMehrere(pfade, katId) {
    for (const pfad of pfade) {
      if (katId === null) delete this.daten.zuordnung[pfad];
      else this.daten.zuordnung[pfad] = katId;
    }
    await this.speichern();

    /* Feedback only for multiple folders: with a single one you see the
       color appear in the explorer straight away, so a notice would just
       be in the way. With forty, the folders that changed may not even
       be on screen. */
    if (pfade.length > 1) {
      if (katId === null) {
        new Notice(TEXTE.entfernt(pfade.length));
      } else {
        const kat = this.daten.kategorien.find((k) => k.id === katId);
        if (kat) new Notice(TEXTE.zugewiesen(pfade.length, kat.name));
      }
    }
  }

  /* How many folders hang off this category? Needed before deleting, so
     nobody throws something away blind. */
  ordnerAnzahl(katId) {
    return Object.values(this.daten.zuordnung).filter((id) => id === katId).length;
  }

  /* A new category always lands in a group -- the one the window is
     showing. There is no such thing as a category outside every group:
     it would appear nowhere and could never be reached again. */
  async kategorieAnlegen(gruppenId) {
    const id = neueId('kat', this.daten.kategorien.map((k) => k.id));
    this.daten.kategorien.push({
      id,
      name: TEXTE.neueVorgabe,
      farbe: zufallsfarbe(),
      gruppe: gruppenId || this.daten.gruppen[0].id,
      stil: Object.assign({}, STIL_VORGABE),
    });
    await this.speichern();
    return id;
  }

  async kategorieAendern(katId, felder) {
    const kat = this.daten.kategorien.find((k) => k.id === katId);
    if (!kat) return;
    Object.assign(kat, felder);
    await this.speichern();
  }

  async stilAendern(katId, felder) {
    const kat = this.daten.kategorien.find((k) => k.id === katId);
    if (!kat) return;
    kat.stil = Object.assign({}, STIL_VORGABE, kat.stil || {}, felder);
    await this.speichern();
  }

  async kategorieLoeschen(katId) {
    this.daten.kategorien = this.daten.kategorien.filter((k) => k.id !== katId);
    /* Without a category there is nothing left to inherit either. An
       inheritance flag left behind would quietly take effect again the
       next time the same folder is assigned one. */
    this.zuordnungenEntfernen(katId);
    await this.speichern();
  }

  /* Moves a category one place within its own group.
   *
   * All categories of all groups lie in ONE array; kategorienIn() only
   * filters it. So the neighbour to swap with is not the next entry in
   * the array but the next one carrying the same group -- everything in
   * between belongs to other groups and is skipped.
   *
   * Swapping the two absolute positions leaves every skipped entry
   * exactly where it was, so the order inside the other groups cannot be
   * disturbed by moving something here. */
  async kategorieVerschieben(katId, richtung) {
    const alle = this.daten.kategorien;
    const von = alle.findIndex((k) => k.id === katId);
    if (von < 0) return false;

    const gruppe = alle[von].gruppe;
    let nach = von + richtung;
    while (nach >= 0 && nach < alle.length && alle[nach].gruppe !== gruppe) {
      nach += richtung;
    }
    if (nach < 0 || nach >= alle.length) return false;

    const merk = alle[von];
    alle[von] = alle[nach];
    alle[nach] = merk;

    await this.speichern();
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
  async kategorienSortieren(gruppeId, absteigend) {
    const alle = this.daten.kategorien;

    const stellen = [];
    for (let i = 0; i < alle.length; i++) {
      if (alle[i].gruppe === gruppeId) stellen.push(i);
    }
    if (stellen.length < 2) return false;

    const sortiert = stellen
      .map((i) => alle[i])
      .sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
      );
    if (absteigend) sortiert.reverse();

    stellen.forEach((stelle, i) => {
      alle[stelle] = sortiert[i];
    });

    await this.speichern();
    return true;
  }

  /* Renaming or moving a folder changes the paths of everything inside
     it too. So not just the one key, but every key below it. */
  async pfadUmschreiben(alt, neu) {
    /* One table to carry along. Inheritance needs no rewriting since it
       moved to the category -- it knows no paths. */
    if (schluesselUmschreiben(this.daten.zuordnung, alt, neu)) {
      await this.speichern();
    }
  }

  /* ---------------------------------------------------------------- */
  /* Building the stylesheet                                           */
  /* ---------------------------------------------------------------- */

  farbeVon(katId) {
    const kat = this.daten.kategorien.find((k) => k.id === katId);
    return kat ? kat.farbe : null;
  }

  iconVon(katId) {
    const kat = this.daten.kategorien.find((k) => k.id === katId);
    return kat && kat.icon ? kat.icon : null;
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
   * The result is cached because stilSchreiben runs on every change, and
   * the drawing would otherwise start from scratch each time. */
  maskeVon(id) {
    if (!this.maskenSpeicher) this.maskenSpeicher = new Map();
    if (this.maskenSpeicher.has(id)) return this.maskenSpeicher.get(id);

    let maske = null;

    /* If anything fails here -- an older Obsidian, an icon that no
       longer exists -- this stays null and the folder falls back to its
       bar or dot. No reason to let the whole stylesheet fail. */
    try {
      const halter = document.createElement('div');
      setIcon(halter, id);
      const svg = halter.querySelector('svg');

      if (svg) {
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('stroke', '#000');
        if (!svg.getAttribute('stroke-width')) svg.setAttribute('stroke-width', '2');

        /* Take width and height from the viewBox instead of hardcoding
           24: the Lucide icons are all 24 wide, but Obsidian's own icons
           need not be. A wrong aspect ratio would distort the icon. */
        const kasten = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/);
        const breite = kasten.length === 4 ? kasten[2] : '24';
        const hoehe = kasten.length === 4 ? kasten[3] : '24';
        svg.setAttribute('width', breite);
        svg.setAttribute('height', hoehe);
        /* The class pulls in Obsidian's rule, which does not exist
           inside a data: URI -- and an inline style could reference CSS
           variables. Both would be inert here, and misleading. */
        svg.removeAttribute('class');
        svg.removeAttribute('style');
        maske = svgZuMaske(svg.outerHTML);
      }
    } catch (e) {
      maske = null;
    }

    this.maskenSpeicher.set(id, maske);
    return maske;
  }

  stilSchreiben() {
    this.stilEl.textContent = regelnBauen(
      zieleBauen(this.daten, (katId) => ({
        farbe: this.farbeVon(katId),
        stil: this.stilVon(katId),
        icon: this.iconVon(katId),
      })),
      (id) => this.maskeVon(id)
    );
  }
}

/* ------------------------------------------------------------------ */
/* The management window                                               */
/* ------------------------------------------------------------------ */

/* List on the left, settings on the right. This keeps the window the
   same height whether there are three categories or thirty. On narrow
   screens the two stack instead. */
class KategorienFenster extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;

    this.gruppeGewaehlt = plugin.daten.gruppen[0].id;
    const erste = plugin.kategorienIn(this.gruppeGewaehlt)[0];
    this.gewaehlt = erste ? erste.id : null;
  }

  onOpen() {
    this.modalEl.addClass('fc-fenster');
    this.plugin.entwurfStarten();
    this.zeichnen();
  }

  /* The last line of defence. Whoever gets here without going through
     Save has cancelled -- by the X, by Escape, by clicking beside the
     window, or because Obsidian closed it. Discarding is the safe
     direction: the file on disk is still the old one either way, so the
     tree must show the old one too. */
  onClose() {
    this.plugin.entwurfVerwerfen();
    this.contentEl.empty();
  }

  /* Asks before throwing work away. Obsidian routes the X, Escape and
     the click beside the window through close(), so one place is
     enough. On the phone a tap beside the window is easy to trigger by
     accident, and without this everything set would be gone. */
  close() {
    if (!this.plugin.entwurfGeaendert()) {
      super.close();
      return;
    }
    new BestaetigenFenster(
      this.app,
      TEXTE.verwerfenFrage,
      async () => {
        this.plugin.entwurfVerwerfen();
        super.close();
      },
      TEXTE.verwerfen
    ).open();
  }

  /* Builds the frame. Only called when the structure changes -- not
     while typing in the name field, or the caret would jump out. */
  zeichnen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: TEXTE.fensterTitel });

    this.reiterEl = contentEl.createDiv({ cls: 'fc-reiter' });
    this.reiterFuellen();

    const spalten = contentEl.createDiv({ cls: 'fc-spalten' });
    this.listeEl = spalten.createDiv({ cls: 'fc-liste' });
    this.detailEl = spalten.createDiv({ cls: 'fc-detail' });

    this.listeFuellen();
    this.detailFuellen();

    /* Cancel first, Save on the right and highlighted: the same order
       Obsidian uses in its own dialogs, so the finishing button sits
       where the hand already expects it. */
    const fuss = contentEl.createDiv({ cls: 'fc-fuss' });

    /* Backing up and restoring sit apart from Cancel and Save, on the
       left. They are about the file on disk, not about this session's
       edits, and a hand reaching for Save should not find Restore next
       to it. */
    const sicherungen = fuss.createDiv({ cls: 'fc-fussnebenan' });

    const sicherungKnopf = sicherungen.createEl('button', { text: TEXTE.sichern });
    sicherungKnopf.addEventListener('click', () => {
      new SicherungSchreibenFenster(this.app, this.plugin).open();
    });

    const ladenKnopf = sicherungen.createEl('button', { text: TEXTE.laden });
    ladenKnopf.addEventListener('click', () => {
      new SicherungFenster(this.app, this.plugin, () => {
        /* Everything on screen came from the old data -- which group is
           open, which category is selected. Both are re-derived instead
           of kept, or the window would point at entries the restored
           file does not have. */
        this.gruppeGewaehlt = this.plugin.daten.gruppen[0].id;
        const erste = this.plugin.kategorienIn(this.gruppeGewaehlt)[0];
        this.gewaehlt = erste ? erste.id : null;
        this.zeichnen();
        new Notice(TEXTE.sicherungGeladen);
      }).open();
    });

    const abbrechen = fuss.createEl('button', { text: TEXTE.abbrechen });
    abbrechen.addEventListener('click', () => this.close());

    const sichern = fuss.createEl('button', {
      text: TEXTE.speichern,
      cls: 'mod-cta',
    });
    sichern.addEventListener('click', async () => {
      await this.plugin.entwurfUebernehmen();
      super.close();
    });

    this.herkunftZeichnen(contentEl);
  }

  /* A thin line at the very bottom: name, version, author, help.
   *
   * All of it read from the manifest, nothing duplicated here, so the
   * version can never go stale -- it is maintained in exactly one
   * place, manifest.json.
   *
   * Obsidian does show version and author in its settings too, but
   * someone with this window open is not there. */
  herkunftZeichnen(ziel) {
    const m = this.plugin.manifest || {};
    const zeile = ziel.createDiv({ cls: 'fc-herkunft' });

    zeile.createSpan({ text: `${m.name || ''} ${m.version || ''}`.trim() });

    if (m.author) {
      zeile.createSpan({ text: ' · ' });
      /* Only link when an address is actually set -- a link that goes
         nowhere is worse than plain text. */
      if (m.authorUrl) {
        zeile.createEl('a', {
          text: m.author,
          href: m.authorUrl,
          attr: { target: '_blank', rel: 'noopener' },
        });
      } else {
        zeile.createSpan({ text: m.author });
      }
    }

    if (HILFE_ADRESSE) {
      zeile.createSpan({ text: ' · ' });
      zeile.createEl('a', {
        text: TEXTE.hilfe,
        href: HILFE_ADRESSE,
        attr: { target: '_blank', rel: 'noopener' },
      });
    }
  }

  /* ---------------- Liste ----------------------------------------- */

  listeFuellen() {
    this.listeEl.empty();
    /* Handles on the individual rows, so name and colour can be updated
       while typing without rebuilding everything. */
    this.zeilen = new Map();

    /* The rows scroll, the button below stays put -- otherwise it drops
       out of sight once there are many categories. */
    /* Says what the list is. This one can sit above its column: the
       height it costs comes out of the list, not out of the settings
       column that has none to spare. */
    this.listeEl.createDiv({
      cls: 'fc-bereichname fc-bereichzeile',
      text: TEXTE.bereichKategorien,
    });

    const rollen = this.listeEl.createDiv({ cls: 'fc-listenrollen' });

    /* Only the active group. That is the whole point of groups: the same
       colour means different things in different parts of the vault, and
       all of them at once is what made the list unusable. */
    const kategorien = this.plugin.kategorienIn(this.gruppeGewaehlt);

    if (!kategorien.length) {
      rollen.createDiv({ cls: 'fc-leer', text: TEXTE.keineKategorienInGruppe });
    }

    for (const kat of kategorien) {
      const zeile = rollen.createDiv({ cls: 'fc-listenzeile' });
      if (kat.id === this.gewaehlt) zeile.addClass('fc-aktiv');

      /* A holder of fixed width, so the names line up whatever marker
         sits in front of them -- a tab is narrower than a dot, an icon
         wider. Without it the column of names would shift from row to
         row. */
      const marke = zeile.createSpan({ cls: 'fc-listenmarkierung' });
      this.listenMarkeZeichnen(marke, kat.farbe, this.plugin.stilVon(kat.id), kat.icon);

      const name = zeile.createSpan({ cls: 'fc-listenname', text: kat.name });

      const anzahl = zeile.createSpan({
        cls: 'fc-listenanzahl',
        text: String(this.plugin.ordnerAnzahl(kat.id)),
      });
      anzahl.setAttribute('aria-label', TEXTE.ordnerZahl(this.plugin.ordnerAnzahl(kat.id)));

      zeile.addEventListener('click', () => {
        this.gewaehlt = kat.id;
        this.listeFuellen();
        this.detailFuellen();
      });

      this.zeilen.set(kat.id, { marke, name });
    }

    /* Under the rows: move the selected category, and add a new one.
       Both in one line, so the list keeps its height for the rows.

       The arrows sit in a fixed place instead of on every row. Moving
       something several places means tapping several times, and a button
       riding along with the row would walk out from under the finger
       after every tap -- on the iPad, where the finger covers what it is
       aiming at, that is the difference between working and fiddling. */
    const fuss = this.listeEl.createDiv({ cls: 'fc-listenfuss' });
    const paar = fuss.createDiv({ cls: 'fc-schiebepaar' });

    /* Where the selected category stands WITHIN ITS GROUP -- that is the
       order shown, and the only one the arrows may go by. Without a
       selection this is -1, and both arrows are dead, which is right:
       there is nothing to move. */
    const stelle = kategorien.findIndex((k) => k.id === this.gewaehlt);

    this.schiebeKnopf(paar, 'chevron-up', TEXTE.hochSchieben, stelle > 0, () =>
      this.kategorieSchieben(-1)
    );
    this.schiebeKnopf(
      paar,
      'chevron-down',
      TEXTE.runterSchieben,
      stelle >= 0 && stelle < kategorien.length - 1,
      () => this.kategorieSchieben(1)
    );

    /* Sorting sits in its own pair, a gap away from the arrows. Both do
       the same kind of thing to the same list, and the two that move one
       entry a step must not be confused with the two that rearrange
       everything.

       Dead below two entries: with one category there is no order to
       establish, and a button that can never do anything is a thing to
       wonder about. */
    const sortierpaar = fuss.createDiv({ cls: 'fc-schiebepaar fc-sortierpaar' });
    const genug = kategorien.length > 1;

    this.schiebeKnopf(sortierpaar, 'arrow-down-a-z', TEXTE.sortierenAuf, genug, () =>
      this.kategorienSortieren(false)
    );
    this.schiebeKnopf(sortierpaar, 'arrow-up-a-z', TEXTE.sortierenAb, genug, () =>
      this.kategorienSortieren(true)
    );

    const neu = fuss.createEl('button', {
      cls: 'fc-neu',
      text: '+ ' + TEXTE.neue,
    });
    neu.addEventListener('click', async () => {
      this.gewaehlt = await this.plugin.kategorieAnlegen(this.gruppeGewaehlt);
      this.listeFuellen();
      this.detailFuellen();
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
  schiebeKnopf(ziel, symbol, beschriftung, moeglich, tun) {
    const knopf = ziel.createEl('button', { cls: 'clickable-icon fc-schieben' });
    setIcon(knopf, symbol);
    knopf.setAttribute('aria-label', beschriftung);

    if (!moeglich) {
      knopf.disabled = true;
      return knopf;
    }
    knopf.addEventListener('click', tun);
    return knopf;
  }

  /* Only the list is redrawn. The category stays selected, so its
     settings on the right have not changed -- redrawing them would throw
     away the caret in the name field for nothing. */
  async kategorieSchieben(richtung) {
    if (!this.gewaehlt) return;
    const bewegt = await this.plugin.kategorieVerschieben(this.gewaehlt, richtung);
    if (!bewegt) return;
    this.listeFuellen();
  }

  /* Only the list is redrawn, same as for the arrows: sorting changes
     the order, not the settings of the category that stays selected. */
  async kategorienSortieren(absteigend) {
    const geaendert = await this.plugin.kategorienSortieren(
      this.gruppeGewaehlt,
      absteigend
    );
    if (!geaendert) return;
    this.listeFuellen();
  }

  /* Only the tabs. Which categories the group holds does not change by
     moving it, so list and settings stay as they are. */
  async gruppeSchieben(richtung) {
    const bewegt = await this.plugin.gruppeVerschieben(this.gruppeGewaehlt, richtung);
    if (!bewegt) return;
    this.reiterFuellen();
  }

  /* ---------------- Gruppen --------------------------------------- */

  /* One tab per group, plus a button to add one. The tabs scroll
     sideways rather than wrapping: with eight legends a wrapping row
     would change height as you switch, and everything below it would
     jump. */
  reiterFuellen() {
    this.reiterEl.empty();

    /* Says what the tabs are, on the same line as the tabs themselves.
       Above them it would cost a row of height, and the settings column
       below has none to give -- the window is at Obsidian's ceiling. */
    const leiste = this.reiterEl.createDiv({ cls: 'fc-reiterleiste' });
    leiste.createSpan({ cls: 'fc-bereichname', text: TEXTE.bereichGruppen });

    for (const gruppe of this.plugin.daten.gruppen) {
      const knopf = leiste.createEl('button', {
        cls: 'fc-reiterknopf',
        text: gruppe.name,
      });
      if (gruppe.id === this.gruppeGewaehlt) knopf.addClass('fc-reiteraktiv');

      knopf.setAttribute(
        'aria-label',
        TEXTE.gruppeZahl(this.plugin.kategorienIn(gruppe.id).length)
      );

      knopf.addEventListener('click', () => {
        if (gruppe.id === this.gruppeGewaehlt) return;
        this.gruppeGewaehlt = gruppe.id;
        /* The selection cannot survive a group change: the category it
           points at is not in the new group. */
        const erste = this.plugin.kategorienIn(gruppe.id)[0];
        this.gewaehlt = erste ? erste.id : null;
        this.reiterFuellen();
        this.listeFuellen();
        this.detailFuellen();
      });
    }

    const neu = leiste.createEl('button', {
      cls: 'fc-reiterneu',
      text: '+',
    });
    neu.setAttribute('aria-label', TEXTE.gruppeNeu);
    neu.addEventListener('click', async () => {
      this.gruppeGewaehlt = await this.plugin.gruppeAnlegen();
      this.gewaehlt = null;
      this.reiterFuellen();
      this.listeFuellen();
      this.detailFuellen();
    });

    /* Name and delete for the group sit under the tabs, not in them: a
       tab you can type in is hard to hit, and the delete button has to
       be somewhere it cannot be pressed by accident while switching. */
    const zeile = this.reiterEl.createDiv({ cls: 'fc-gruppenzeile' });
    const gruppe = this.plugin.daten.gruppen.find(
      (g) => g.id === this.gruppeGewaehlt
    );
    if (!gruppe) return;

    /* The order of the tabs, at the left end of the row and directly
       under the strip it belongs to. Same mechanic as under the list,
       only lying down, because the tabs lie down.

       Hidden while there is only one group, for the same reason the
       delete button is: nothing to move it past. */
    if (this.plugin.daten.gruppen.length > 1) {
      const paar = zeile.createDiv({ cls: 'fc-schiebepaar' });
      const stelle = this.plugin.daten.gruppen.findIndex(
        (g) => g.id === gruppe.id
      );

      this.schiebeKnopf(paar, 'chevron-left', TEXTE.gruppeLinks, stelle > 0, () =>
        this.gruppeSchieben(-1)
      );
      this.schiebeKnopf(
        paar,
        'chevron-right',
        TEXTE.gruppeRechts,
        stelle < this.plugin.daten.gruppen.length - 1,
        () => this.gruppeSchieben(1)
      );
    }

    const name = zeile.createEl('input', {
      type: 'text',
      cls: 'fc-gruppenname',
      placeholder: TEXTE.gruppeName,
    });
    name.value = gruppe.name;

    /* Deliberately no full redraw while typing, or the field would lose
       the caret after every character -- only the tab's label follows. */
    name.addEventListener('input', () => {
      this.plugin.gruppeUmbenennen(gruppe.id, name.value);
      const knopf = leiste.querySelector('.fc-reiteraktiv');
      if (knopf) knopf.setText(name.value);
    });

    /* Copies the whole legend. Stands before Delete, so the harmless
       button is the one closer to the middle of the row. */
    const doppeln = zeile.createEl('button', {
      cls: 'fc-gruppedoppeln',
      text: TEXTE.gruppeDuplizieren,
    });
    doppeln.addEventListener('click', async () => {
      const id = await this.plugin.gruppeDuplizieren(gruppe.id);
      if (!id) return;

      this.gruppeGewaehlt = id;
      const erste = this.plugin.kategorienIn(id)[0];
      this.gewaehlt = erste ? erste.id : null;
      this.reiterFuellen();
      this.listeFuellen();
      this.detailFuellen();
    });

    /* Hidden rather than disabled while there is only one group: a
       button that can never be pressed is just a thing to wonder
       about. */
    if (this.plugin.daten.gruppen.length < 2) return;

    const weg = zeile.createEl('button', {
      cls: 'fc-gruppeweg',
      text: TEXTE.gruppeLoeschen,
    });
    weg.addEventListener('click', () => {
      const anzahl = this.plugin.kategorienIn(gruppe.id).length;
      const alterName = gruppe.name;

      new BestaetigenFenster(
        this.app,
        TEXTE.gruppeLoeschFrage(alterName, anzahl),
        async () => {
          await this.plugin.gruppeLoeschen(gruppe.id);
          new Notice(TEXTE.gruppeGeloescht(alterName));
          this.gruppeGewaehlt = this.plugin.daten.gruppen[0].id;
          const erste = this.plugin.kategorienIn(this.gruppeGewaehlt)[0];
          this.gewaehlt = erste ? erste.id : null;
          this.reiterFuellen();
          this.listeFuellen();
          this.detailFuellen();
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

     Deliberately not shared with vorschauZeichnen -- the preview builds
     a whole example row, this is a marker in a fixed-width holder. */
  listenMarkeZeichnen(ziel, farbe, stil, icon) {
    ziel.empty();

    if (stil.markierung === 'keine') return;

    if (icon) {
      const symbol = ziel.createSpan({ cls: 'fc-listensymbol' });
      setIcon(symbol, icon);
      symbol.style.color = farbe;
      return;
    }

    const marke = ziel.createSpan({ cls: 'fc-listenmarke' });
    marke.addClass(stil.markierung === 'lasche' ? 'fc-lasche' : 'fc-punkt');
    marke.style.backgroundColor = farbe;
  }

  /* ---------------- Detail ---------------------------------------- */

  /* Every valid icon id, fetched once per open window. The typing
     handler asks after every keystroke, and getIconIds() builds the
     whole list of over a thousand each time it is called.

     If it fails, the list stays empty -- then no typed name is
     recognised, and the grid button is still there. Better than a
     window that will not open. */
  symbolListe() {
    if (!this.symbole) {
      try {
        this.symbole = getIconIds() || [];
      } catch (e) {
        this.symbole = [];
      }
    }
    return this.symbole;
  }

  /* One section: its heading on the left, everything it controls on the
     right. Returns the right-hand box, so the caller fills that instead
     of the column itself.
   *
   * Six headings used to sit on six rows of their own. Measured at the
   * real column width of 430px, that layout came to 405px where this one
   * comes to 297 -- the heading rows were 168 of them. A scrollbar in a
   * window that is already at Obsidian's maximum height is what that
   * cost.
   *
   * The 7em for the heading column is measured, not picked: wider and
   * the switches under "Zusaetzlich" and "Vererbung" start wrapping,
   * which gives back more than the heading row saved. */
  abschnitt(text) {
    const zeile = this.detailEl.createDiv({ cls: 'fc-abschnitt' });
    zeile.createDiv({ cls: 'fc-untertitel', text });
    return zeile.createDiv({ cls: 'fc-abschnittinhalt' });
  }

  detailFuellen() {
    this.detailEl.empty();

    const kat = this.plugin.daten.kategorien.find((k) => k.id === this.gewaehlt);
    if (!kat) {
      this.detailEl.createDiv({ cls: 'fc-leer', text: TEXTE.nichtsGewaehlt });
      return;
    }

    const stil = this.plugin.stilVon(kat.id);

    /* --- Colour and name ------------------------------------------ */
    const kopf = this.detailEl.createDiv({ cls: 'fc-zeile' });

    /* A coloured square is a coloured square -- nothing about it says it
       can be pressed. Reported on 2026-08-29: the colour was there to be
       seen, not to be found.

       So a pipette lies on top of it. The field keeps showing the
       colour, the icon says what pressing it does. The icon itself
       cannot be pressed -- pointer-events are off, every click goes
       through to the field underneath, which is still the real colour
       input. Replacing that input was never on the table: the picker
       behind it belongs to the system, and no plugin builds a better
       one. */
    const farbfeld = kopf.createDiv({ cls: 'fc-farbfeld' });

    const farbe = farbfeld.createEl('input', { type: 'color', cls: 'fc-farbe' });
    farbe.value = kat.farbe;
    farbe.setAttribute('aria-label', TEXTE.farbeWaehlen);
    farbe.setAttribute('title', TEXTE.farbeWaehlen);

    const pipette = farbfeld.createSpan({ cls: 'fc-farbpipette' });
    setIcon(pipette, 'pipette');

    /* Black or white, whichever reads on the colour underneath -- the
       same sum the tree uses for its text. One fixed colour would
       disappear on half the palette. */
    const pipetteFaerben = () => {
      pipette.style.color = lesbareSchrift(farbe.value);
    };
    pipetteFaerben();

    const name = kopf.createEl('input', {
      type: 'text',
      cls: 'fc-name',
      placeholder: TEXTE.namePlatzhalter,
    });
    name.value = kat.name;

    /* --- Markierung ------------------------------------------------ */
    const markierungFeld = this.abschnitt(TEXTE.markierung);

    const gruppe = markierungFeld.createDiv({ cls: 'fc-gruppe' });

    /* Collected because the icon field strikes them through as you type
       -- see symbolStandZeigen below. "None" is not in here: it keeps
       working with an icon set, it is what leaves the folder unmarked. */
    const markenKnoepfe = [];

    for (const m of MARKIERUNGEN) {
      const knopf = gruppe.createEl('button', { text: m.name });
      if (stil.markierung === m.id) knopf.addClass('mod-cta');
      if (m.id !== 'keine') markenKnoepfe.push(knopf);
      knopf.addEventListener('click', async () => {
        await this.plugin.stilAendern(kat.id, { markierung: m.id });
        /* The list carries the marker too, so it has to follow. */
        this.listeFuellen();
        this.detailFuellen();
      });
    }

    /* --- Icon ------------------------------------------------------ */
    /* Sits directly under the marker because it takes the marker's
       place: choose one here and the tree shows no bar and no dot any
       more, but the icon in the category colour. */
    const symbolAbschnitt = this.abschnitt(TEXTE.symbol);

    /* The name of the icon stands in a field you can type and paste
       into. Through the grid alone, setting one category after another
       meant opening a window, searching and closing it again for every
       single one.

       The grid did not go away, it moved into the small button beside
       the field. Browsing is still how you find an icon you cannot
       name. */
    const symbolZeile = symbolAbschnitt.createDiv({ cls: 'fc-symbolzeile' });

    /* Keeps its width whether or not there is an icon, so the field
       does not shift sideways the moment one is set. */
    const symbolBild = symbolZeile.createSpan({ cls: 'fc-symbolbild' });

    const symbolFeld = symbolZeile.createEl('input', {
      type: 'text',
      cls: 'fc-symboltext',
      placeholder: TEXTE.symbolName,
    });
    symbolFeld.value = symbolKurz(kat.icon);

    const blaettern = symbolZeile.createEl('button', {
      cls: 'clickable-icon fc-symbolblaettern',
    });
    setIcon(blaettern, 'layout-grid');
    blaettern.setAttribute('aria-label', TEXTE.symbolWaehlen);
    blaettern.addEventListener('click', () => {
      new SymbolFenster(this.app, kat.icon || null, async (gewaehlt) => {
        await this.plugin.kategorieAendern(kat.id, { icon: gewaehlt });
        this.listeFuellen();
        this.detailFuellen();
      }).open();
    });

    /* The button is always there, only invisible without an icon. Left
       out entirely, everything below it moved up by a row as soon as you
       clicked a category without an icon -- including "Delete", which
       then slid under the pointer. Reported 2026-08-28. */
    const symbolWeg = symbolZeile.createEl('button', { text: TEXTE.symbolEntfernen });
    if (!kat.icon) symbolWeg.addClass('fc-platzhalter');
    symbolWeg.addEventListener('click', async () => {
      if (!kat.icon) return;
      await this.plugin.kategorieAendern(kat.id, { icon: null });
      this.listeFuellen();
      this.detailFuellen();
    });

    /* Same reason as the button above: the line keeps its space even
       when it has nothing to say. .fc-hinweis reserves one row. */
    const symbolHinweisEl = symbolAbschnitt.createDiv({ cls: 'fc-hinweis' });

    /* The one place that decides what the icon line says and looks like.
       Called on drawing and again after every keystroke, so the two can
       never drift apart.

       With "None" the folder stays unmarked -- the explicit choice beats
       the icon. The line is only dimmed, not disabled, so a chosen icon
       survives and takes effect again as soon as a marker comes back.
       Same pattern as "coloured text" underneath a background. */
    const symbolStandZeigen = (unbekannt) => {
      const wirkungslos = Boolean(kat.icon) && stil.markierung === 'keine';
      symbolZeile.classList.toggle('fc-wirkungslos', wirkungslos);
      symbolFeld.classList.toggle('fc-unbekannt', Boolean(unbekannt));

      /* The other direction of the same dependency: with an icon set,
         the bar and the dot both draw the icon, so the choice between
         them changes nothing and is struck through. Reported 2026-08-29
         -- "Lasche" looked selected and active while an icon was named
         right below it. Done here rather than where the buttons are
         built, because typing a name must not redraw the panel (the
         caret would jump out of the field), and this line runs on every
         keystroke. */
      for (const knopf of markenKnoepfe) {
        knopf.classList.toggle('fc-wirkungslos', Boolean(kat.icon));
      }

      if (unbekannt) symbolHinweisEl.setText(TEXTE.symbolUnbekannt);
      else if (wirkungslos) symbolHinweisEl.setText(TEXTE.symbolOhneWirkung);
      else symbolHinweisEl.setText(kat.icon ? TEXTE.symbolErsetzt : '');
    };

    /* Draws the icon in front of the field, in the category colour --
       the same picture the tree will show. */
    const symbolBildZeigen = () => {
      symbolBild.empty();
      if (!kat.icon) return;
      setIcon(symbolBild, kat.icon);
      symbolBild.style.color = kat.farbe;
    };

    symbolBildZeigen();
    symbolStandZeigen(false);

    /* --- the four independent switches ------------------------------ */
    const zusaetzlichFeld = this.abschnitt(TEXTE.zusaetzlich);

    const schalter = zusaetzlichFeld.createDiv({ cls: 'fc-schalter' });
    const umschalter = [
      ['hintergrund', TEXTE.hintergrund],
      ['schriftFarbig', TEXTE.schriftFarbig],
      ['fett', TEXTE.fett],
      /* Last on purpose: it is the only one that turns the row down
         rather than up, and it works on top of whatever the three
         before it did. */
      ['gedimmt', TEXTE.gedimmt],
    ];

    for (const [feld, beschriftung] of umschalter) {
      const knopf = schalter.createEl('button', { text: beschriftung });
      if (stil[feld]) knopf.addClass('mod-cta');
      /* Coloured text has no effect while a background is on -- there
         the plugin works out the text colour itself. The switch stays
         usable but is visibly dimmed, so the setting takes effect again
         once the background is turned off. */
      if (feld === 'schriftFarbig' && stil.hintergrund) knopf.addClass('fc-wirkungslos');

      knopf.addEventListener('click', async () => {
        await this.plugin.stilAendern(kat.id, { [feld]: !stil[feld] });
        this.detailFuellen();
      });
    }

    /* Two rows reserved, not one: this sentence wraps at the window's
       720 pixels. Measured 2026-08-28 -- with a single row everything
       below it still moved by half a line.

       Two switches can have something to say here, but only one line is
       shown: the background hint wins because it explains something you
       cannot see (the plugin picking the text colour), while dimming
       shows itself in the preview right below. Reserving a third row for
       the rare case where both are on would move everything down for
       everyone else -- the very shifting that 0.9.16 fixed. */
    let schalterHinweis = '';
    if (stil.hintergrund) schalterHinweis = TEXTE.schriftAutomatisch;
    else if (stil.gedimmt) schalterHinweis = TEXTE.gedimmtHinweis;

    zusaetzlichFeld.createDiv({
      cls: 'fc-hinweis fc-hinweis-zwei',
      text: schalterHinweis,
    });

    /* --- Vorschau -------------------------------------------------- */
    const vorschau = this.abschnitt(TEXTE.vorschau).createDiv({
      cls: 'fc-vorschau',
    });
    this.vorschauZeichnen(vorschau, kat.farbe, stil, kat.icon);

    /* --- Vererbung ------------------------------------------------- */
    /* Below the preview, because this is not about looks but about
       reach: how far the colour carries. Used to be two entries in the
       context menu, set per folder -- hard to find, and the only thing
       about a category that was not set in this window. */
    const vererbungFeld = this.abschnitt(TEXTE.vererbung);

    const reichweite = vererbungFeld.createDiv({ cls: 'fc-schalter' });
    const erbschalter = [
      ['vererbt', TEXTE.aufUnterordner],
      ['vererbtDateien', TEXTE.aufDateien],
    ];

    for (const [feld, beschriftung] of erbschalter) {
      const knopf = reichweite.createEl('button', { text: beschriftung });
      if (stil[feld]) knopf.addClass('mod-cta');
      knopf.addEventListener('click', async () => {
        await this.plugin.stilAendern(kat.id, { [feld]: !stil[feld] });
        this.detailFuellen();
      });
    }

    /* --- telling the parent apart ---------------------------------- */
    /* Only there while something actually inherits. Without children
       there is nobody for the parent to stand out from, and the row
       would be three lines of window explaining that it does nothing.
       The window is at Obsidian's maximum height already -- what does
       not earn its place costs a scrollbar.

       Moving it in and out shifts what is below it, which is exactly
       what 0.9.16 fixed elsewhere. The difference: this only moves on a
       deliberate press of the switch right above it, and it moves the
       footer down, away from the hand -- not up under it.

       One choice out of six, not six switches: two of them at once
       would be fighting over the same row. Built like the switches
       above rather than as one joined block -- six do not fit on a
       line, and a joined block cannot wrap without the rounded ends
       landing in the middle. */
    const vaterArt = stil.vaterHervor || 'keine';
    let vaterHinweis = '';

    if (stil.vererbt || stil.vererbtDateien) {
      const vaterFeld = this.abschnitt(TEXTE.vaterHervorheben);
      const vaterWahl = vaterFeld.createDiv({ cls: 'fc-schalter' });

      let gewaehlterKnopf = null;
      for (const art of VATER_ARTEN) {
        const knopf = vaterWahl.createEl('button', { text: art.name });
        if (art.id === vaterArt) {
          knopf.addClass('mod-cta');
          gewaehlterKnopf = knopf;
        }
        knopf.addEventListener('click', async () => {
          await this.plugin.stilAendern(kat.id, { vaterHervor: art.id });
          this.detailFuellen();
        });
      }

      /* Every way this setting can end up doing nothing gets said out
         loud. Without that it looks broken: the choice is made, the tree
         does not change, and there is nothing to go by. */
      if (vaterArt === 'fett' && stil.fett) vaterHinweis = TEXTE.vaterSchonFett;
      else if (vaterArt === 'hintergrund' && stil.hintergrund) {
        vaterHinweis = TEXTE.vaterSchonHintergrund;
      } else if (vaterArt === 'schrift' && stil.hintergrund) {
        /* Checked before the "already coloured" case: under a background
           the plugin works out the text colour itself, so colouring the
           parent's text does nothing whether or not the category itself
           has coloured text switched on. The background is the reason,
           and the reason is what has to be said. */
        vaterHinweis = TEXTE.vaterSchriftUnterHintergrund;
      } else if (vaterArt === 'schrift' && stil.schriftFarbig) {
        vaterHinweis = TEXTE.vaterSchonSchrift;
      } else if (vaterArt === 'blass' && stil.gedimmt) {
        vaterHinweis = TEXTE.vaterSchonBlass;
      } else if (vaterArt === 'symbol' && !kat.icon) {
        vaterHinweis = TEXTE.vaterOhneSymbol;
      } else if (vaterArt === 'markierung' && kat.icon) {
        vaterHinweis = TEXTE.vaterSymbolSchlaegt;
      }

      /* Only the chosen button is struck through, never the whole row.
         The other five still work, and striking all six out reads as if
         the setting were dead altogether -- exactly the wrong message,
         because switching to one of them is the way out. */
      if (vaterHinweis && gewaehlterKnopf) {
        gewaehlterKnopf.addClass('fc-wirkungslos');
      }

      /* The row appears only when a choice really has no effect. There
         used to be a standing sentence about what inheriting reaches,
         and a reserved row so nothing jumped when the hint replaced it.
         Both went in 0.9.32: sitting under "Set the parent apart", that
         sentence read as a statement about that setting and made no
         sense there. Nothing below this but the footer, so the row
         coming and going moves only the footer -- downwards, away from
         the hand. */
      if (vaterHinweis) {
        vaterFeld.createDiv({ cls: 'fc-hinweis', text: vaterHinweis });
      }
    }

    /* --- Loeschen -------------------------------------------------- */
    const fuss = this.detailEl.createDiv({ cls: 'fc-detailfuss' });

    /* Duplicating sits next to deleting because both act on the category
       shown above, and nowhere else does. Delete stays on the far right,
       away from the hand. */
    const doppeln = fuss.createEl('button', { text: TEXTE.duplizieren });
    doppeln.addEventListener('click', async () => {
      const id = await this.plugin.kategorieDuplizieren(kat.id);
      if (!id) return;
      /* The copy is selected straight away: it is called "... (copy)"
         and the first thing anyone does is rename it. */
      this.gewaehlt = id;
      this.listeFuellen();
      this.detailFuellen();
    });

    /* Moving to another group, in the row that is already there rather
       than in a line of its own: the settings column has no height to
       give away.

       Only with somewhere to move to. With one group the field would
       have exactly one entry -- a control that can only say what is
       already true. */
    if (this.plugin.daten.gruppen.length > 1) {
      fuss.createSpan({ cls: 'fc-fussname', text: TEXTE.gruppeFeld });

      const wahl = fuss.createEl('select', { cls: 'dropdown fc-gruppenwahl' });
      wahl.setAttribute('aria-label', TEXTE.gruppeWechseln);
      wahl.setAttribute('title', TEXTE.gruppeWechseln);

      for (const g of this.plugin.daten.gruppen) {
        const eintrag = wahl.createEl('option', { text: g.name });
        eintrag.value = g.id;
        if (g.id === kat.gruppe) eintrag.selected = true;
      }

      wahl.addEventListener('change', async () => {
        const ziel = wahl.value;
        if (!(await this.plugin.kategorieUmhaengen(kat.id, ziel))) return;

        /* The window follows it. Staying put would make the category
           vanish from the list with nothing to show where it went. */
        this.gruppeGewaehlt = ziel;
        this.gewaehlt = kat.id;
        this.reiterFuellen();
        this.listeFuellen();
        this.detailFuellen();
      });
    }

    const weg = fuss.createEl('button', { cls: 'fc-weg', text: TEXTE.loeschen });

    /* --- Ereignisse ------------------------------------------------ */

    /* The colour takes effect immediately, so you can see the tree
       change while still dragging in the picker. Only the marker in the
       list and the preview are redrawn. */
    farbe.addEventListener('input', () => {
      this.plugin.kategorieAendern(kat.id, { farbe: farbe.value });
      pipetteFaerben();
      const zeile = this.zeilen.get(kat.id);
      if (zeile) this.listenMarkeZeichnen(zeile.marke, farbe.value, stil, kat.icon);
      vorschau.empty();
      this.vorschauZeichnen(vorschau, farbe.value, stil, kat.icon);
    });

    /* Same as the name field: no redraw while typing, only the pieces
       that show the icon. A name that matches nothing changes nothing --
       it says so and leaves the saved icon alone, so a half-typed word
       does not wipe out what was there. */
    symbolFeld.addEventListener('input', () => {
      const id = symbolAufloesen(symbolFeld.value, this.symbolListe());
      if (id === null) {
        symbolStandZeigen(true);
        return;
      }

      this.plugin.kategorieAendern(kat.id, { icon: id || null });
      symbolBildZeigen();
      symbolStandZeigen(false);

      const zeile = this.zeilen.get(kat.id);
      if (zeile) this.listenMarkeZeichnen(zeile.marke, kat.farbe, stil, kat.icon);
      vorschau.empty();
      this.vorschauZeichnen(vorschau, kat.farbe, stil, kat.icon);
    });

    /* Deliberately no redraw while typing, or the field would lose the
       caret after every character. */
    name.addEventListener('input', () => {
      this.plugin.kategorieAendern(kat.id, { name: name.value });
      const zeile = this.zeilen.get(kat.id);
      if (zeile) zeile.name.setText(name.value);
    });

    weg.addEventListener('click', async () => {
      const anzahlOrdner = this.plugin.ordnerAnzahl(kat.id);
      const alterName = kat.name;

      const loeschen = async () => {
        await this.plugin.kategorieLoeschen(kat.id);
        new Notice(TEXTE.geloescht(alterName));
        /* The next one from THIS group. Falling back to the first
           category overall would jump into another legend while the tab
           above still says this one. */
        const erste = this.plugin.kategorienIn(this.gruppeGewaehlt)[0];
        this.gewaehlt = erste ? erste.id : null;
        /* The tab carries the category count, so it follows too. */
        this.reiterFuellen();
        this.listeFuellen();
        this.detailFuellen();
      };

      /* Always ask, even when no folder hangs off the category.
         Deleting without a prompt is one click too few, however little
         is at stake. */
      new BestaetigenFenster(
        this.app,
        TEXTE.loeschFrage(alterName, anzahlOrdner),
        loeschen
      ).open();
    });
  }

  /* Shows an example folder exactly as it will look in the file
     explorer, so nobody has to experiment on the real tree. */
  vorschauZeichnen(ziel, farbe, stil, icon) {
    const zeile = ziel.createDiv({ cls: 'fc-vorschau-zeile' });

    /* Same rule as in the stylesheet: on a coloured background the
       marker takes the readable colour, or it would be standing on
       itself. The preview is only worth having if it shows what the
       tree will do. */
    const markenFarbe = stil.hintergrund ? lesbareSchrift(farbe) : farbe;

    if (stil.markierung !== 'keine') {
      if (icon) {
        /* In the tree this is a tinted mask; here it is a real icon
           with its colour set. The result looks the same, and the
           preview avoids the detour through a data: URI. */
        const marke = zeile.createSpan({ cls: 'fc-vorschau-symbol' });
        setIcon(marke, icon);
        marke.style.color = markenFarbe;
      } else {
        const marke = zeile.createSpan({ cls: 'fc-vorschau-marke' });
        marke.addClass(stil.markierung === 'punkt' ? 'fc-punkt' : 'fc-lasche');
        marke.style.backgroundColor = markenFarbe;
      }
    }

    const text = zeile.createSpan({ text: TEXTE.beispielOrdner });

    if (stil.hintergrund) {
      zeile.style.backgroundColor = farbe;
      zeile.style.color = lesbareSchrift(farbe);
      zeile.style.borderRadius = '4px';
    } else if (stil.schriftFarbig) {
      text.style.color = farbe;
    }

    if (stil.fett) text.style.fontWeight = '700';

    /* Same value as the stylesheet uses, and on the row for the same
       reason -- the preview is only worth having if it shows what the
       tree will do. The hover exception is left out here: nobody points
       at the preview to read it. */
    if (stil.gedimmt) zeile.style.opacity = '0.45';
  }
}

/* Picks a folder out of the vault.
 *
 * With a search field, not a bare list: a vault has as many folders as
 * it has, and scrolling past two hundred of them to find one is not
 * choosing, it is hunting. Same reason the icon picker has one.
 *
 * The top level is an entry like any other, at the top, because it is
 * a legitimate answer and otherwise unreachable -- it has no name to
 * search for. */
class OrdnerFenster extends Modal {
  constructor(app, aktuell, beiWahl) {
    super(app);
    this.aktuell = aktuell;
    this.beiWahl = beiWahl;
  }

  onOpen() {
    const { contentEl, titleEl } = this;
    if (titleEl) titleEl.setText(TEXTE.ordnerWaehlenTitel);

    this.alle = this.app.vault
      .getAllLoadedFiles()
      .filter((d) => d instanceof TFolder)
      .map((d) => d.path)
      /* The root arrives as "/" from the vault and has to be the empty
         string everywhere else -- see pfadBauen. */
      .filter((pfad) => pfad && pfad !== '/')
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    const suche = contentEl.createEl('input', {
      type: 'text',
      cls: 'fc-ordnersuche',
      placeholder: TEXTE.ordnerSuchen,
    });

    this.listeEl = contentEl.createDiv({ cls: 'fc-sicherungliste' });
    this.fuellen('');

    suche.addEventListener('input', () => this.fuellen(suche.value));
    suche.focus();
  }

  fuellen(text) {
    this.listeEl.empty();

    const suchtext = (text || '').toLowerCase();
    const treffer = this.alle.filter((pfad) => pfad.toLowerCase().includes(suchtext));

    /* The root is offered whenever the search is empty. Filtering it by
       a typed word would mean matching its label, and the label is not
       its name. */
    if (!suchtext) this.zeileBauen('', TEXTE.ordnerWurzel);

    for (const pfad of treffer) this.zeileBauen(pfad, pfad);

    if (!treffer.length && suchtext) {
      this.listeEl.createDiv({ cls: 'fc-leer', text: TEXTE.ordnerKeiner });
    }
  }

  zeileBauen(pfad, beschriftung) {
    const zeile = this.listeEl.createEl('button', {
      cls: 'fc-sicherungzeile',
      text: beschriftung,
    });
    if (pfad === this.aktuell) zeile.addClass('mod-cta');
    zeile.addEventListener('click', () => {
      this.close();
      this.beiWahl(pfad);
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

/* Writing a backup: says where it goes before it goes there.
 *
 * A single button that wrote somewhere without saying where was the
 * first version of this. Reported the same day: the folder is a choice,
 * and a choice needs somewhere to be made. */
class SicherungSchreibenFenster extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.ordner = plugin.sicherungOrdner();
  }

  onOpen() {
    const { titleEl } = this;
    if (titleEl) titleEl.setText(TEXTE.sicherungSchreibenTitel);
    this.zeichnen();
  }

  zeichnen() {
    const { contentEl } = this;
    contentEl.empty();

    ordnerZeileBauen(contentEl, this.app, TEXTE.sicherungZiel, this.ordner, (gewaehlt) => {
      this.ordner = gewaehlt;
      this.zeichnen();
    });

    const fuss = contentEl.createDiv({ cls: 'fc-fuss' });

    const abbrechen = fuss.createEl('button', { text: TEXTE.abbrechen });
    abbrechen.addEventListener('click', () => this.close());

    const los = fuss.createEl('button', {
      text: TEXTE.sicherungJetzt,
      cls: 'mod-cta',
    });
    los.addEventListener('click', async () => {
      try {
        const name = await this.plugin.sicherungSchreiben(this.ordner);
        /* Remembered only after it worked. A folder that could not be
           written to is not a folder to come back to. */
        await this.plugin.sicherungOrdnerSetzen(this.ordner);
        this.close();
        new Notice(TEXTE.gesichert(name));
      } catch (e) {
        new Notice(TEXTE.sicherungFehlgeschlagen);
      }
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

/* The folder line both windows carry: what is set, and a way to change
   it. Written once because the two must not drift apart -- the folder
   you back up into is the folder you restore from. */
const ordnerZeileBauen = (ziel, app, beschriftung, ordner, beiWahl) => {
  const zeile = ziel.createDiv({ cls: 'fc-ordnerzeile' });

  zeile.createSpan({ cls: 'fc-bereichname', text: beschriftung });
  zeile.createSpan({
    cls: 'fc-ordnerpfad',
    text: ordner || TEXTE.ordnerWurzel,
  });

  const knopf = zeile.createEl('button', {
    cls: 'fc-ordnerknopf',
    text: TEXTE.ordnerWaehlen,
  });
  knopf.addEventListener('click', () => {
    new OrdnerFenster(app, ordner, beiWahl).open();
  });

  return zeile;
};

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
class SicherungFenster extends Modal {
  constructor(app, plugin, beiErfolg) {
    super(app);
    this.plugin = plugin;
    this.beiErfolg = beiErfolg;
  }

  onOpen() {
    const { titleEl } = this;
    if (titleEl) titleEl.setText(TEXTE.sicherungTitel);
    this.ordner = this.plugin.sicherungOrdner();
    this.zeichnen();
  }

  /* Redrawn whenever the folder changes, because the list of files is
     the answer to which folder is set -- the two cannot be updated
     separately without one of them lying. */
  async zeichnen() {
    const { contentEl } = this;
    contentEl.empty();

    ordnerZeileBauen(contentEl, this.app, TEXTE.sicherungQuelle, this.ordner, (gewaehlt) => {
      this.ordner = gewaehlt;
      this.zeichnen();
    });

    const dateien = await this.plugin.sicherungenFinden(this.ordner);

    if (!dateien.length) {
      contentEl.createDiv({ cls: 'fc-leer', text: TEXTE.sicherungLeer });
      return;
    }

    const liste = contentEl.createDiv({ cls: 'fc-sicherungliste' });

    for (const pfad of dateien) {
      const name = pfad.split('/').pop();
      const zeile = liste.createEl('button', {
        cls: 'fc-sicherungzeile',
        text: name,
      });
      zeile.addEventListener('click', () => {
        new BestaetigenFenster(
          this.app,
          TEXTE.sicherungFrage(name),
          async () => {
            try {
              const daten = await this.plugin.sicherungLesen(pfad);
              this.plugin.sicherungUebernehmen(daten);
              /* Restoring replaces the data, and with it the remembered
                 folder from the file. Set again afterwards, or the next
                 backup would silently go somewhere else. */
              this.plugin.daten.sicherungOrdner = this.ordner;
              this.close();
              this.beiErfolg();
            } catch (e) {
              /* The message comes from sicherungLesen and already says
                 which of the two things went wrong. */
              new Notice(e.message || TEXTE.sicherungUnlesbar);
            }
          },
          TEXTE.laden
        ).open();
      });
    }

  }

  onClose() {
    this.contentEl.empty();
  }
}

/* Own confirmation dialog instead of confirm(). The built-in one is not
   dependable inside Obsidian -- it looks foreign on mobile, and Electron
   can have it disabled. */
class BestaetigenFenster extends Modal {
  constructor(app, frage, beiJa, jaText) {
    super(app);
    this.frage = frage;
    this.beiJa = beiJa;
    /* No label given means this is a deletion -- then the button is
       red. */
    this.jaText = jaText || null;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('p', { text: this.frage });

    const fuss = contentEl.createDiv({ cls: 'fc-fuss' });

    const nein = fuss.createEl('button', { text: TEXTE.abbrechen });
    nein.addEventListener('click', () => this.close());

    const ja = fuss.createEl('button', {
      text: this.jaText || TEXTE.loeschen,
      cls: this.jaText ? 'mod-cta' : 'mod-warning',
    });
    ja.addEventListener('click', async () => {
      this.close();
      await this.beiJa();
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
const SYMBOL_HOECHSTENS = 120;

class SymbolFenster extends Modal {
  constructor(app, aktuell, beiWahl) {
    super(app);
    this.aktuell = aktuell;
    this.beiWahl = beiWahl;
    this.alle = [];
  }

  onOpen() {
    const { contentEl, titleEl } = this;
    if (titleEl) titleEl.setText(TEXTE.symbolFensterTitel);
    contentEl.addClass('fc-symbolfenster');

    /* If getIconIds fails, the list stays empty and the window says so
       -- better than crashing on open. */
    try {
      this.alle = (getIconIds() || []).slice().sort();
    } catch (e) {
      this.alle = [];
    }

    const suche = contentEl.createEl('input', {
      type: 'text',
      cls: 'fc-symbolsuche',
      placeholder: TEXTE.symbolSuche,
    });

    this.rasterEl = contentEl.createDiv({ cls: 'fc-symbolraster' });
    this.hinweisEl = contentEl.createDiv({ cls: 'fc-hinweis' });

    suche.addEventListener('input', () => this.rasterFuellen(suche.value));
    this.rasterFuellen('');

    /* Without the detour through setTimeout the field never gets the
       caret -- Obsidian sets it again itself while opening. */
    window.setTimeout(() => suche.focus(), 0);
  }

  rasterFuellen(suchtext) {
    this.rasterEl.empty();
    this.hinweisEl.empty();

    const text = suchtext.trim().toLowerCase();
    const passend = text
      ? this.alle.filter((id) => id.toLowerCase().includes(text))
      : this.alle;

    if (!passend.length) {
      this.hinweisEl.setText(TEXTE.symbolNichtsGefunden);
      return;
    }

    for (const id of passend.slice(0, SYMBOL_HOECHSTENS)) {
      const knopf = this.rasterEl.createEl('button', { cls: 'fc-symbolfeld' });
      knopf.setAttribute('aria-label', symbolKurz(id));
      knopf.setAttribute('title', symbolKurz(id));
      if (id === this.aktuell) knopf.addClass('mod-cta');

      setIcon(knopf, id);

      knopf.addEventListener('click', async () => {
        this.close();
        await this.beiWahl(id);
      });
    }

    if (passend.length > SYMBOL_HOECHSTENS) {
      this.hinweisEl.setText(TEXTE.symbolMehr(SYMBOL_HOECHSTENS, passend.length));
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
function stilAusAlterForm(alt) {
  const stil = Object.assign({}, STIL_VORGABE);

  switch (alt) {
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
function gruppenNachziehen(daten, vorgabeName) {
  if (!Array.isArray(daten.gruppen) || !daten.gruppen.length) {
    daten.gruppen = [{ id: 'grp-1', name: vorgabeName }];
  }

  const bekannt = new Set(daten.gruppen.map((g) => g.id));
  const erste = daten.gruppen[0].id;

  for (const kat of daten.kategorien || []) {
    if (!kat.gruppe || !bekannt.has(kat.gruppe)) kat.gruppe = erste;
  }

  return daten;
}

/* A fresh id that is really free.
 *
 * Date.now() on its own is not enough any more. Duplicating a group
 * makes a copy of every category in it within the same millisecond --
 * they would all come out with the same id, and a category is looked up
 * by id everywhere: in the folder assignments, in the stylesheet, in the
 * window. The second one would quietly stand in for the first.
 *
 * The ids already taken are handed in, so this can be tested without
 * Obsidian. */
function neueId(praefix, vergeben) {
  const genommen = new Set(vergeben || []);
  const jetzt = Date.now();

  let kandidat = `${praefix}-${jetzt}`;
  let n = 2;
  while (genommen.has(kandidat)) {
    kandidat = `${praefix}-${jetzt}-${n}`;
    n++;
  }
  return kandidat;
}

/* The id without the prefix. Almost all of them read "lucide-folder";
 * what a person types, pastes or looks up is "folder". */
function symbolKurz(id) {
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
function symbolAufloesen(text, alle) {
  const roh = (text || '').trim().toLowerCase().replace(/\s+/g, '-');
  if (!roh) return '';

  const liste = alle || [];
  if (liste.includes(roh)) return roh;

  const mitVorsatz = 'lucide-' + roh;
  if (liste.includes(mitVorsatz)) return mitVorsatz;

  return null;
}

/* Sorts index entries by plain code-point order. Never localeCompare
 * here: the prefix search below only works if "a/b" and "a/c" really do
 * end up next to each other, and locale rules do not guarantee that. */
function nachPfad(a, b) {
  return a.pfad < b.pfad ? -1 : a.pfad > b.pfad ? 1 : 0;
}

/* Turns a list of paths into a searchable index: every entry keeps the
 * position it had in the original list, so results can be handed back
 * in that order later. */
function indexBauen(pfade) {
  return pfade.map((pfad, idx) => ({ pfad, idx })).sort(nachPfad);
}

/* First position in the index whose path is not less than the prefix.
 * Everything starting with that prefix sits in one unbroken block from
 * there on, which is what makes the scan cheap. */
function erstePosition(index, praefix) {
  let lo = 0;
  let hi = index.length;
  while (lo < hi) {
    const mitte = (lo + hi) >> 1;
    if (index[mitte].pfad < praefix) lo = mitte + 1;
    else hi = mitte;
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
function praefixTreffer(index, praefix) {
  const treffer = [];
  for (let i = erstePosition(index, praefix); i < index.length; i++) {
    if (!index[i].pfad.startsWith(praefix)) break;
    treffer.push(index[i]);
  }
  treffer.sort((a, b) => a.idx - b.idx);
  return treffer;
}

/* Turns the stored data into a list of targets: a CSS selector with a
 * colour and a style each.
 *
 * Two kinds of target:
 *   1. Inheritance -- one folder colours everything beneath it, because
 *      its category says so. A single selector using ^= ("starts with")
 *      covers any number of folders, including ones that do not exist
 *      yet.
 *   2. The folder itself -- an exact selector.
 *
 * Order decides who wins, because both kinds of selector carry the same
 * specificity. So: inheritance first, shallow to deep (the nearer parent
 * wins), then the exact assignments (which beat any inheritance).
 *
 * On top of that, every inheritance rule excludes anything below it that
 * has an assignment or an inheritance of its own. Without that, a mix of
 * styles would leave the inherited bar sitting next to the folder's own
 * background. */
function zieleBauen(daten, nachschlagen) {
  const zuordnung = daten.zuordnung || {};
  const ziele = [];

  const tiefe = (pfad) => pfad.split('/').length;

  /* --- telling the parent apart ----------------------------------- */

  /* Does this category set the folder carrying the assignment apart
     from the ones inheriting from it? Only where something inherits at
     all -- with nothing below, there is nobody to stand out from, and
     every coloured folder would silently turn bold. */
  const hebtAb = (stil) =>
    Boolean(
      (stil.vererbt || stil.vererbtDateien) &&
        stil.vaterHervor &&
        stil.vaterHervor !== 'keine'
    );

  /* The other one of the two markers. Used when the parent should carry
     a different mark from its children: whichever the category shows,
     the parent shows the other. With no marker at all the parent gets
     the dot -- it has to show something, that is the whole point. */
  const andereMarke = (art) => (art === 'punkt' ? 'lasche' : 'punkt');

  /* The style the parent itself is drawn with. */
  const vaterStil = (stil) => {
    if (!hebtAb(stil)) return stil;
    if (stil.vaterHervor === 'fett') {
      return Object.assign({}, stil, { fett: true });
    }
    if (stil.vaterHervor === 'hintergrund') {
      return Object.assign({}, stil, { hintergrund: true });
    }
    if (stil.vaterHervor === 'schrift') {
      return Object.assign({}, stil, { schriftFarbig: true });
    }
    if (stil.vaterHervor === 'markierung') {
      return Object.assign({}, stil, { markierung: andereMarke(stil.markierung) });
    }
    return stil;
  };

  /* The style the inherited rows are drawn with. Only "blass" changes
     anything here -- it is the one setting that works on the children
     instead of the parent. */
  const erbStil = (stil) => {
    if (!hebtAb(stil) || stil.vaterHervor !== 'blass') return stil;
    return Object.assign({}, stil, { gedimmt: true });
  };

  /* The icon the inherited rows are drawn with. With "icon" chosen for
     the parent they give it up and fall back to bar or dot -- that is
     exactly what leaves the parent as the only row carrying it. */
  const erbSymbol = (stil, icon) =>
    hebtAb(stil) && stil.vaterHervor === 'symbol' ? null : icon || null;

  /* Which folders pass their colour down? Every folder whose category
     says so. There is no table of its own for this any more -- the
     switch sits on the category, so this is a lookup. */
  const quellenMit = (feld) =>
    Object.keys(zuordnung)
      .filter((pfad) => {
        const eintrag = nachschlagen(zuordnung[pfad]);
        return !!(eintrag && eintrag.stil && eintrag.stil[feld]);
      })
      .sort((a, b) => tiefe(a) - tiefe(b) || a.localeCompare(b));

  /* --- 1. inheritance, shallow to deep ---------------------------- */
  const quellen = quellenMit('vererbt');

  /* Both indexes are built once and then searched per source, instead of
     walking the full lists again for every single one. */
  const zuordnungIndex = indexBauen(Object.keys(zuordnung));
  const quellenIndex = indexBauen(quellen);

  for (const quelle of quellen) {
    const { farbe, stil, icon } = nachschlagen(zuordnung[quelle]);
    if (!farbe || !stil) continue;

    const praefix = quelle + '/';

    /* Anything below this source with an assignment of its own is an
       exception -- as is a deeper inheritance source together with
       everything beneath it. */
    const ausnahmen = [];

    for (const { pfad } of praefixTreffer(zuordnungIndex, praefix)) {
      ausnahmen.push(`[data-path="${maskieren(pfad)}"]`);
    }

    /* A source can never start with its own prefix -- the prefix is one
       separator longer -- so nothing has to be filtered out here. */
    for (const { pfad } of praefixTreffer(quellenIndex, praefix)) {
      ausnahmen.push(`[data-path^="${maskieren(pfad + '/')}"]`);
    }

    ziele.push({
      selektor: `.nav-folder-title[data-path^="${maskieren(praefix)}"]${ausnahmen
        .map((a) => `:not(${a})`)
        .join('')}`,
      farbe,
      stil: erbStil(stil),
      icon: erbSymbol(stil, icon),
    });
  }

  /* --- 2. the folders themselves ---------------------------------- */
  for (const [pfad, katId] of Object.entries(zuordnung)) {
    const { farbe, stil, icon } = nachschlagen(katId);
    if (!farbe || !stil) continue;
    ziele.push({
      selektor: `.nav-folder-title[data-path="${maskieren(pfad)}"]`,
      farbe,
      stil: vaterStil(stil),
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
  const dateiQuellen = quellenMit('vererbtDateien');

  const dateiIndex = indexBauen(dateiQuellen);

  for (const quelle of dateiQuellen) {
    const { farbe, stil, icon } = nachschlagen(zuordnung[quelle]);
    if (!farbe || !stil) continue;

    const praefix = quelle + '/';

    /* A deeper folder that colours its own notes wins over this one --
       otherwise the outer colour would reach past it. */
    const ausnahmen = [];
    for (const { pfad } of praefixTreffer(dateiIndex, praefix)) {
      ausnahmen.push(`[data-path^="${maskieren(pfad + '/')}"]`);
    }

    ziele.push({
      selektor: `.nav-file-title[data-path^="${maskieren(praefix)}"]${ausnahmen
        .map((a) => `:not(${a})`)
        .join('')}`,
      inhalt: 'nav-file-title-content',
      farbe,
      stil: erbStil(stil),
      icon: erbSymbol(stil, icon),
    });
  }

  return ziele;
}

/* Builds the whole stylesheet. Rules of the same kind are merged so the
 * result stays short even with several hundred folders. Bar, dot and
 * icon hang off the text content rather than the row box, which leaves
 * the explorer's indentation untouched.
 *
 * "maskeVon" turns an icon id into a finished CSS value for mask-image.
 * The icon itself is fetched from Obsidian by the plugin; keeping that
 * out of here is what makes this function testable without Obsidian.
 * If the function is missing or does not know an icon, the entry falls
 * back to its bar or dot -- a folder with no marker at all would be the
 * worse surprise. */
function regelnBauen(eintraege, maskeVon) {
  if (!eintraege.length) return '';

  const titel = (e) => e.selektor;
  /* Folders and notes carry their text in differently named elements.
     Defaults to the folder, so an entry without the field behaves the
     way every entry did before notes could be coloured. */
  const inhalt = (e) =>
    `${e.selektor} .${e.inhalt || 'nav-folder-title-content'}`;
  const bloecke = [];

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
  const markenFarbe = (e) =>
    e.stil.hintergrund ? lesbareSchrift(e.farbe) : e.farbe;

  /* Which entries actually show an icon? Only those that have one, that
     show a marker at all, and whose icon can be resolved. Worked out
     once so the blocks below agree with each other. */
  const masken = new Map();
  const zeigtSymbol = (e) => {
    if (!e.icon || e.stil.markierung === 'keine') return false;
    if (!masken.has(e.icon)) {
      masken.set(e.icon, (maskeVon && maskeVon(e.icon)) || null);
    }
    return masken.get(e.icon) !== null;
  };

  /* --- marker: icon ----------------------------------------------- */
  /* Grouped by icon, not by entry: that way the image data appears once
     per icon in the stylesheet rather than once per folder. With a few
     hundred folders sharing a category, that is the difference between
     a few hundred bytes and a few hundred kilobytes. */
  const nachSymbol = new Map();
  for (const e of eintraege.filter(zeigtSymbol)) {
    if (!nachSymbol.has(e.icon)) nachSymbol.set(e.icon, []);
    nachSymbol.get(e.icon).push(e);
  }

  for (const [id, passend] of nachSymbol) {
    const form = passend.map((e) => `${inhalt(e)}::before`).join(',\n');
    const farben = passend
      .map((e) => `${inhalt(e)}::before { background-color: ${markenFarbe(e)}; }`)
      .join('\n');

    /* The colour comes from the background, the icon only supplies the
       shape -- hence a mask rather than an image. That is what lets
       every folder carry the icon in its own category colour.
       The "-webkit-" prefix is there because Obsidian runs inside a
       WebKit view on iOS, where the property still needs it. */
    bloecke.push(`${form} {
  content: '';
  display: inline-block;
  width: 15px;
  height: 15px;
  margin-right: 6px;
  vertical-align: -0.19em;
  flex: 0 0 auto;
  -webkit-mask-image: ${masken.get(id)};
  mask-image: ${masken.get(id)};
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
}
${farben}`);
  }

  /* --- marker: bar and dot ---------------------------------------- */
  for (const art of ['lasche', 'punkt']) {
    const passend = eintraege.filter(
      (e) => e.stil.markierung === art && !zeigtSymbol(e)
    );
    if (!passend.length) continue;

    const rund = art === 'punkt';
    const form = passend.map((e) => `${inhalt(e)}::before`).join(',\n');
    const farben = passend
      .map((e) => `${inhalt(e)}::before { background-color: ${markenFarbe(e)}; }`)
      .join('\n');

    bloecke.push(`${form} {
  content: '';
  display: inline-block;
  width: ${rund ? '9px' : '5px'};
  height: ${rund ? '9px' : '0.95em'};
  border-radius: ${rund ? '50%' : '3px'};
  margin-right: 7px;
  vertical-align: ${rund ? '0.02em' : '-0.12em'};
  flex: 0 0 auto;
}
${farben}`);
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
    bloecke.push(`${titel(e)},
${titel(e)}:hover,
${titel(e)}.is-active,
${titel(e)}.has-focus {
  background-color: ${e.farbe} !important;
  color: ${lesbareSchrift(e.farbe)};
  border-radius: 4px;
}
${titel(e)}:hover {
  box-shadow: inset 0 0 0 999px rgba(0, 0, 0, 0.13);
}
${titel(e)}.is-active {
  box-shadow: inset 0 0 0 999px rgba(0, 0, 0, 0.22);
}`);
  }

  /* --- coloured text ----------------------------------------------- */
  /* Only where no background is set: there the block above already
     works out a readable text colour, and a second colour would
     override it and make the text unreadable. */
  const farbigeSchrift = eintraege.filter(
    (e) => e.stil.schriftFarbig && !e.stil.hintergrund
  );
  for (const e of farbigeSchrift) {
    bloecke.push(`${inhalt(e)} { color: ${e.farbe}; }`);
  }

  /* --- bold --------------------------------------------------------- */
  const fett = eintraege.filter((e) => e.stil.fett);
  if (fett.length) {
    const auswahl = fett.map((e) => inhalt(e)).join(',\n');
    bloecke.push(`${auswahl} {
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
    const auswahl = gedimmt.map((e) => titel(e)).join(',\n');
    const beiZeiger = gedimmt.map((e) => `${titel(e)}:hover`).join(',\n');
    bloecke.push(`${auswahl} {
  opacity: 0.45;
}
${beiZeiger} {
  opacity: 1;
}`);
  }

  return bloecke.join('\n\n');
}

/* Text on a coloured box has to stay readable. The formula is the usual
   luminance weighting -- the eye perceives red, green and blue as
   differently bright. Above the threshold black text, below it white. */
function lesbareSchrift(hex) {
  const rgb = hexZuRgb(hex);
  if (!rgb) return 'inherit';
  const helligkeit = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return helligkeit > 0.6 ? '#1c1c1c' : '#ffffff';
}

function hexZuRgb(hex) {
  const t = String(hex).trim().replace(/^#/, '');
  const voll = t.length === 3 ? t.split('').map((c) => c + c).join('') : t;
  if (!/^[0-9a-fA-F]{6}$/.test(voll)) return null;
  return [
    parseInt(voll.slice(0, 2), 16),
    parseInt(voll.slice(2, 4), 16),
    parseInt(voll.slice(4, 6), 16),
  ];
}

function zufallsfarbe() {
  /* Fixed saturation and lightness, only the hue is rolled -- so a new
     category never comes out washed out or garish. */
  const ton = Math.floor(Math.random() * 360);
  return hslZuHex(ton, 65, 55);
}

function hslZuHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const zu = (x) =>
    Math.round(255 * x)
      .toString(16)
      .padStart(2, '0');
  return `#${zu(f(0))}${zu(f(8))}${zu(f(4))}`;
}

/* Rewrites one path in a map (path -> value), together with everything
   below it. Renaming a parent folder changes its children's paths too.
   Returns whether anything changed. */
function schluesselUmschreiben(verzeichnis, alt, neu) {
  let geaendert = false;

  for (const pfad of Object.keys(verzeichnis)) {
    if (pfad === alt) {
      verzeichnis[neu] = verzeichnis[pfad];
      delete verzeichnis[pfad];
      geaendert = true;
    } else if (pfad.startsWith(alt + '/')) {
      verzeichnis[neu + pfad.slice(alt.length)] = verzeichnis[pfad];
      delete verzeichnis[pfad];
      geaendert = true;
    }
  }

  return geaendert;
}

/* Which category do ALL of these folders share? If there is none, the
   result is null -- then no checkmark appears anywhere in the menu, and
   one click recolours the whole selection. Note that "none of them has
   one" counts as shared too, giving null just like "mixed does". For the
   menu that makes no difference: in both cases no checkmark is the
   right answer. */
function gemeinsameKategorie(zuordnung, pfade) {
  if (!pfade.length) return null;
  const erste = zuordnung[pfade[0]] || null;
  if (erste === null) return null;
  for (const pfad of pfade) {
    if ((zuordnung[pfad] || null) !== erste) return null;
  }
  return erste;
}

/* Quotes and backslashes in a path have to be escaped inside a CSS
   selector, or the rule breaks. Folder names may contain both. */
function maskieren(text) {
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
function svgZuMaske(svgText) {
  const text = String(svgText || '').trim();
  if (!text.startsWith('<svg')) return null;
  return `url("data:image/svg+xml,${encodeURIComponent(text)}")`;
}

module.exports = ExplorerCategoriesPlugin;
