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
  erbtVon: (ordner, kategorie) => `Erbt „${kategorie}" von „${ordner}"`,
  fensterTitel: 'Farbkategorien',
  fensterOeffnen: 'Farbkategorien verwalten',
  neue: 'Neue Kategorie',
  neueVorgabe: 'Neue Kategorie',
  loeschen: 'Löschen',
  namePlatzhalter: 'Name',
  keineKategorien: 'Noch keine Kategorie angelegt.',
  nichtsGewaehlt: 'Links eine Kategorie auswählen.',
  markierung: 'Markierung',
  zusaetzlich: 'Zusätzlich',
  vorschau: 'Vorschau',
  symbol: 'Symbol',
  symbolWaehlen: 'Symbol wählen …',
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
  fertig: 'Fertig',
  abbrechen: 'Abbrechen',
  markierungKeine: 'Ohne',
  markierungLasche: 'Lasche',
  markierungPunkt: 'Punkt',
  hintergrund: 'Hintergrund',
  schriftFarbig: 'Schrift farbig',
  fett: 'Fett',
  schriftAutomatisch: 'Bei Hintergrund wählt das Plugin die Schriftfarbe selbst, damit sie lesbar bleibt.',
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
  /* Orphans: entries pointing at folders that are no longer there.
     Happens when a folder is renamed outside Obsidian -- in Finder, on
     another device, through a sync. Obsidian never reports those, so the
     entry silently keeps pointing nowhere. */
  waisenTitel: 'Zeigt ins Leere',
  waisenHinweis: (n) =>
    n === 1
      ? 'Eine Zuordnung zeigt auf einen Ordner, den es nicht mehr gibt.'
      : `${n} Zuordnungen zeigen auf Ordner, die es nicht mehr gibt.`,
  waisenErklaerung:
    'Meist wurde der Ordner außerhalb von Obsidian umbenannt oder verschoben. ' +
    'Die Einträge bleiben erhalten, bis du sie wegwirfst — falls der Ordner zurückkommt, gilt die Farbe wieder.',
  waisenWegwerfen: 'Wegwerfen',
  waisenAlleWegwerfen: 'Alle wegwerfen',
  waisenWeggeworfen: (n) =>
    n === 1 ? '1 Eintrag weggeworfen.' : `${n} Einträge weggeworfen.`,
  waisenFrage: (n) =>
    n === 1
      ? 'Einen Eintrag wegwerfen?'
      : `${n} Einträge wegwerfen? Die Farben kommen damit nicht zurück.`,
  /* The notice stays put until it is clicked, so it has to say what a
     click does. */
  waisenStart: (n) =>
    n === 1
      ? 'Farbkategorien: eine Zuordnung zeigt ins Leere. Zum Ansehen klicken.'
      : `Farbkategorien: ${n} Zuordnungen zeigen ins Leere. Zum Ansehen klicken.`,
  /* How many further entries a repair takes along. */
  waisenDarunter: (n) => (n === 1 ? '+1 darunter' : `+${n} darunter`),
};

/* American spelling ("color"), matching Obsidian itself. */
const TEXTE_EN = {
  menue: 'Color category',
  keine: 'Remove color',
  verwalten: 'Manage categories …',
  aufUnterordner: 'Also applies to subfolders',
  erbtVon: (ordner, kategorie) => `Inherits "${kategorie}" from "${ordner}"`,
  fensterTitel: 'Color categories',
  fensterOeffnen: 'Manage color categories',
  neue: 'New category',
  neueVorgabe: 'New category',
  loeschen: 'Delete',
  namePlatzhalter: 'Name',
  keineKategorien: 'No categories yet.',
  nichtsGewaehlt: 'Select a category on the left.',
  markierung: 'Marker',
  zusaetzlich: 'Additional',
  vorschau: 'Preview',
  symbol: 'Icon',
  symbolWaehlen: 'Choose icon …',
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
  fertig: 'Done',
  abbrechen: 'Cancel',
  markierungKeine: 'None',
  markierungLasche: 'Bar',
  markierungPunkt: 'Dot',
  hintergrund: 'Background',
  schriftFarbig: 'Colored text',
  fett: 'Bold',
  schriftAutomatisch: 'With a background, the plugin picks the text color itself so it stays readable.',
  menueMehrere: (n) => `Color category (${n} folders)`,
  zugewiesen: (n, name) =>
    n === 1 ? `1 folder → "${name}"` : `${n} folders → "${name}"`,
  entfernt: (n) =>
    n === 1 ? 'Color removed from 1 folder.' : `Color removed from ${n} folders.`,
  beispielName: (n) => `Category ${n}`,
  hilfe: 'Help',
  waisenTitel: 'Pointing nowhere',
  waisenHinweis: (n) =>
    n === 1
      ? 'One assignment points at a folder that is no longer there.'
      : `${n} assignments point at folders that are no longer there.`,
  waisenErklaerung:
    'Usually the folder was renamed or moved outside Obsidian. ' +
    'The entries stay until you discard them — if the folder comes back, so does its color.',
  waisenWegwerfen: 'Discard',
  waisenAlleWegwerfen: 'Discard all',
  waisenWeggeworfen: (n) =>
    n === 1 ? '1 entry discarded.' : `${n} entries discarded.`,
  waisenFrage: (n) =>
    n === 1
      ? 'Discard one entry?'
      : `Discard ${n} entries? This will not bring the colors back.`,
  waisenStart: (n) =>
    n === 1
      ? 'Color categories: one assignment points nowhere. Click to see it.'
      : `Color categories: ${n} assignments point nowhere. Click to see them.`,
  waisenDarunter: (n) => (n === 1 ? '+1 below' : `+${n} below`),
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

/* What a freshly created category starts out with. */
const STIL_VORGABE = {
  markierung: 'lasche',
  hintergrund: false,
  schriftFarbig: false,
  fett: false,
};

/* Neutral examples, deliberately meaningless -- users rename them. The
   names come from the language list: they are the first thing anyone
   sees after installing, and an untranslated name would be a poor first
   impression. */
const BEISPIEL_KATEGORIEN = [
  { id: 'kat-1', name: TEXTE.beispielName(1), farbe: '#4a90d9' },
  { id: 'kat-2', name: TEXTE.beispielName(2), farbe: '#e05252' },
  { id: 'kat-3', name: TEXTE.beispielName(3), farbe: '#3fb950' },
];

const STANDARD_DATEN = {
  kategorien: BEISPIEL_KATEGORIEN,
  /* folder path -> category id */
  zuordnung: {},
  /* folder path -> true when the category also applies to everything
     below it. Deliberately one entry rather than one per subfolder:
     otherwise the file grows with the vault, and the stylesheet with
     it. */
  vererbung: {},
};

const STIL_ID = 'explorer-categories-stil';

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

    /* Check for orphaned entries -- but only once the vault is actually
       loaded. Doing this in onload() would report every single entry as
       an orphan, because at that point Obsidian has not filled its file
       list yet. onLayoutReady exists for exactly this (checked in
       obsidian.asar, 1.12.7) and fires immediately when the layout is
       already up, so a plugin enabled by hand is covered too. */
    this.app.workspace.onLayoutReady(() => this.waisenMelden());
  }

  onunload() {
    if (this.stilEl) this.stilEl.remove();
  }

  fensterOeffnen() {
    new KategorienFenster(this.app, this).open();
  }

  /* Two older data shapes have to be carried over so nobody loses their
     settings:
       1. A single appearance for everything (top-level "darstellung").
       2. One appearance per category, but only one of four at a time
          (a "darstellung" field inside the category).
     Both are translated into the current form with four independent
     switches. */
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
      if (this.daten.vererbung[eltern] && katId) {
        const kat = this.daten.kategorien.find((k) => k.id === katId);
        if (kat) return { ordner: eltern, kategorie: kat.name };
      }
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
       fuer die Haelfte der Auswahl falsch ist. */
    const aktuell = gemeinsameKategorie(this.daten.zuordnung, pfade);
    /* Fuer "entfernen" und "vererben" reicht ein einziger gefaerbter
       folder in the selection -- otherwise the entry would be missing
       exactly when it is needed. */
    const irgendeine = pfade.some((p) => this.daten.zuordnung[p]);

    /* The entries are identical either way; only the place differs:
       inside a submenu, or flat in the main menu. */
    const eintraegeFuellen = (ziel, mitPraefix) => {
      const kopf = mehrere ? TEXTE.menueMehrere(pfade.length) : TEXTE.menue;
      const titel = (t) => (mitPraefix ? `${kopf}: ${t}` : t);

      for (const kat of this.daten.kategorien) {
        ziel.addItem((i) =>
          i
            .setTitle(titel(kat.name))
            .setChecked(aktuell === kat.id)
            .onClick(() => this.zuweisenMehrere(pfade, kat.id))
        );
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

      /* Removing and inheriting sit at the bottom, and only when there
         is something to remove or inherit. Up among the categories,
         removal read as just another category rather than an action. */
      if (irgendeine) {
        if (typeof ziel.addSeparator === 'function') ziel.addSeparator();

        /* A state, not a one-off copy: nothing is written into the
           subfolders, the rule simply covers everything below. That
           keeps the settings file small even with tens of thousands of
           folders underneath -- and new subfolders are included by
           themselves. */
        const alleErben = pfade.every((p) => this.daten.vererbung[p] === true);
        ziel.addItem((i) =>
          i
            .setTitle(titel(TEXTE.aufUnterordner))
            .setIcon('git-branch')
            .setChecked(alleErben)
            /* Mixed selection: turn all of them on first. Only once
               every folder inherits does the same click turn them off
               again. The checkmark always shows the state you will
               get. */
            .onClick(() => this.vererbungMehrere(pfade, !alleErben))
        );

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

      eintraegeFuellen(unter, false);
      untermenueGebaut = true;
    });

    if (!untermenueGebaut) eintraegeFuellen(menu, true);
  }

  /* ---------------------------------------------------------------- */
  /* Data                                                              */
  /* ---------------------------------------------------------------- */

  async speichern() {
    await this.saveData(this.daten);
    this.stilSchreiben();
  }

  async zuweisen(pfad, katId) {
    await this.zuweisenMehrere([pfad], katId);
  }

  /* Changes every path and then saves ONCE. With forty selected folders,
     forty separate writes to data.json would be most of the waiting time
     -- and the stylesheet would be rebuilt forty times over. */
  async zuweisenMehrere(pfade, katId) {
    for (const pfad of pfade) {
      if (katId === null) {
        delete this.daten.zuordnung[pfad];
        /* No category means there is nothing to inherit. */
        delete this.daten.vererbung[pfad];
      } else {
        this.daten.zuordnung[pfad] = katId;
      }
    }
    await this.speichern();

    /* Feedback only for multiple folders: with a single one you see the
       color appear in the explorer straight away, so a notice would just
       be in the way. With
       vierzig ist der getroffene Ordner womoeglich gar nicht sichtbar. */
    if (pfade.length > 1) {
      if (katId === null) {
        new Notice(TEXTE.entfernt(pfade.length));
      } else {
        const kat = this.daten.kategorien.find((k) => k.id === katId);
        if (kat) new Notice(TEXTE.zugewiesen(pfade.length, kat.name));
      }
    }
  }

  async vererbungUmschalten(pfad) {
    await this.vererbungMehrere([pfad], this.daten.vererbung[pfad] !== true);
  }

  async vererbungMehrere(pfade, anschalten) {
    for (const pfad of pfade) {
      /* Only folders with a category can pass one down. An entry on an
         uncategorised folder would do nothing now and surprise you the
         next time you assign one. */
      if (anschalten && this.daten.zuordnung[pfad]) this.daten.vererbung[pfad] = true;
      else delete this.daten.vererbung[pfad];
    }
    await this.speichern();
  }

  /* Stored paths whose folder is gone. Asked fresh every time rather
     than cached: a folder can come back from a sync at any moment, and a
     stale list would keep claiming it is missing. */
  waisen() {
    return waisenFinden(this.daten, (pfad) => {
      const treffer = this.app.vault.getAbstractFileByPath(pfad);
      return treffer instanceof TFolder;
    });
  }

  /* Says at startup that something points nowhere.
   *
   * The notice does NOT fade out, and clicking it opens the window where
   * the entries can be dealt with. Both were added on 2026-08-27, after
   * it turned out you had to open that window to find out there was
   * anything to do -- a message that disappears after a few seconds is
   * easy to miss, and then the whole check is worthless.
   *
   * Still no dialog in the way: the vault may still be syncing, and a
   * window in the face over something that fixes itself would be worse
   * than the problem. A notice can be ignored, a dialog cannot. */
  waisenMelden() {
    const anzahl = this.waisen().length;
    if (!anzahl) return;

    /* 0 means no auto-hide (checked in obsidian.asar, 1.12.7:
       setAutoHide only starts a timer when it gets a duration). */
    const hinweis = new Notice(TEXTE.waisenStart(anzahl), 0);

    if (hinweis.noticeEl) {
      hinweis.noticeEl.addClass('fc-waisenhinweis');
      hinweis.noticeEl.addEventListener('click', () => this.fensterOeffnen());
    }
  }

  /* Only ever called from the button in the window, never automatically.
     Both tables have to be cleaned: an inheritance flag left behind
     would come back to life the moment a folder of that name reappears. */
  async waisenWegwerfen(pfade) {
    for (const pfad of pfade) {
      delete this.daten.zuordnung[pfad];
      delete this.daten.vererbung[pfad];
    }
    await this.speichern();
  }

  /* How many folders hang off this category? Needed before deleting, so
     nobody throws something away blind. */
  ordnerAnzahl(katId) {
    return Object.values(this.daten.zuordnung).filter((id) => id === katId).length;
  }

  async kategorieAnlegen() {
    const id = `kat-${Date.now()}`;
    this.daten.kategorien.push({
      id,
      name: TEXTE.neueVorgabe,
      farbe: zufallsfarbe(),
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
    for (const [pfad, id] of Object.entries(this.daten.zuordnung)) {
      if (id === katId) {
        delete this.daten.zuordnung[pfad];
        /* Without a category there is nothing left to inherit. If the
           entry stayed, it would quietly take effect again the next time
           the same folder is assigned one. */
        delete this.daten.vererbung[pfad];
      }
    }
    await this.speichern();
  }

  /* Renaming or moving a folder changes the paths of everything inside
     it too. So not just the one key, but every key below it. */
  async pfadUmschreiben(alt, neu) {
    /* Both maps have to come along: assignments and inheritance. Left at
       the old path, inheritance would colour nothing after a rename. */
    const geaendert = [this.daten.zuordnung, this.daten.vererbung]
      .map((verzeichnis) => schluesselUmschreiben(verzeichnis, alt, neu))
      .some(Boolean);

    if (geaendert) await this.speichern();
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
    const erste = plugin.daten.kategorien[0];
    this.gewaehlt = erste ? erste.id : null;
  }

  onOpen() {
    this.modalEl.addClass('fc-fenster');
    this.zeichnen();
  }

  onClose() {
    this.contentEl.empty();
  }

  /* Builds the frame. Only called when the structure changes -- not
     while typing in the name field, or the caret would jump out. */
  zeichnen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: TEXTE.fensterTitel });

    /* Sits above the columns, and only when there is something to say.
       An empty box explaining that nothing is wrong would be noise in a
       window people open to change colors. */
    this.waisenEl = contentEl.createDiv();
    this.waisenFuellen();

    const spalten = contentEl.createDiv({ cls: 'fc-spalten' });
    this.listeEl = spalten.createDiv({ cls: 'fc-liste' });
    this.detailEl = spalten.createDiv({ cls: 'fc-detail' });

    this.listeFuellen();
    this.detailFuellen();

    const fuss = contentEl.createDiv({ cls: 'fc-fuss' });
    const fertig = fuss.createEl('button', { text: TEXTE.fertig, cls: 'mod-cta' });
    fertig.addEventListener('click', () => this.close());

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

  /* ---------------- Waisen ---------------------------------------- */

  /* Entries whose folder is gone. Rebuilt rather than patched, so the
     block disappears on its own once the last one is dealt with. */
  waisenFuellen() {
    this.waisenEl.empty();

    const waisen = this.plugin.waisen();
    if (!waisen.length) return;

    const kasten = this.waisenEl.createDiv({ cls: 'fc-waisen' });

    const kopf = kasten.createDiv({ cls: 'fc-waisenkopf' });
    kopf.createSpan({ cls: 'fc-waisentitel', text: TEXTE.waisenTitel });
    kopf.createSpan({ cls: 'fc-waisenzahl', text: TEXTE.waisenHinweis(waisen.length) });

    kasten.createDiv({ cls: 'fc-waisenerklaerung', text: TEXTE.waisenErklaerung });

    /* The list scrolls: after a botched sync there can be hundreds, and
       they must not push the categories off the screen. */
    const rollen = kasten.createDiv({ cls: 'fc-waisenrollen' });

    for (const gruppe of waisenGruppieren(waisen)) {
      const pfad = gruppe.pfad;
      const zeile = rollen.createDiv({ cls: 'fc-waisenzeile' });

      /* Folder name first, the way there behind it in a fainter colour.
         Only the way gets shortened when the row runs out of room -- the
         name is what identifies the entry and must never end up hidden
         behind an ellipsis. The full path stays available as a tooltip. */
      const trenner = pfad.lastIndexOf('/');
      const name = trenner === -1 ? pfad : pfad.slice(trenner + 1);
      const weg = trenner === -1 ? '' : pfad.slice(0, trenner);

      const text = zeile.createDiv({ cls: 'fc-waisenpfad' });
      text.setAttribute('aria-label', pfad);
      text.setAttribute('title', pfad);
      text.createSpan({ cls: 'fc-waisenname', text: name });
      if (weg) text.createSpan({ cls: 'fc-waisenweg-pfad', text: weg });

      /* Says how many further entries died with this one, and therefore
         go with it when it is discarded. */
      if (gruppe.darunter) {
        text.createSpan({
          cls: 'fc-waisendarunter',
          text: TEXTE.waisenDarunter(gruppe.darunter),
        });
      }

      const knopf = zeile.createEl('button', {
        cls: 'fc-waisenknopf',
        text: TEXTE.waisenWegwerfen,
      });
      knopf.addEventListener('click', () => this.waisenFrage(gruppe.alle));
    }

    if (waisen.length > 1) {
      const alle = kasten.createEl('button', {
        cls: 'fc-waisenalle',
        text: TEXTE.waisenAlleWegwerfen,
      });
      alle.addEventListener('click', () => this.waisenFrage(waisen));
    }
  }

  /* Always asks, even for a single entry -- same rule as deleting a
     category. Throwing one away cannot be undone from inside the
     plugin. */
  waisenFrage(pfade) {
    new BestaetigenFenster(this.app, TEXTE.waisenFrage(pfade.length), async () => {
      await this.plugin.waisenWegwerfen(pfade);
      new Notice(TEXTE.waisenWeggeworfen(pfade.length));
      this.waisenFuellen();
      /* The counts next to the categories change with it. */
      this.listeFuellen();
      this.detailFuellen();
    }).open();
  }

  /* ---------------- Liste ----------------------------------------- */

  listeFuellen() {
    this.listeEl.empty();
    /* Handles on the individual rows, so name and colour can be updated
       while typing without rebuilding everything. */
    this.zeilen = new Map();

    /* The rows scroll, the button below stays put -- otherwise it drops
       out of sight once there are many categories. */
    const rollen = this.listeEl.createDiv({ cls: 'fc-listenrollen' });

    const kategorien = this.plugin.daten.kategorien;

    if (!kategorien.length) {
      rollen.createDiv({ cls: 'fc-leer', text: TEXTE.keineKategorien });
    }

    for (const kat of kategorien) {
      const zeile = rollen.createDiv({ cls: 'fc-listenzeile' });
      if (kat.id === this.gewaehlt) zeile.addClass('fc-aktiv');

      const punkt = zeile.createSpan({ cls: 'fc-listenpunkt' });
      punkt.style.backgroundColor = kat.farbe;

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

      this.zeilen.set(kat.id, { punkt, name });
    }

    const neu = this.listeEl.createEl('button', {
      cls: 'fc-neu',
      text: '+ ' + TEXTE.neue,
    });
    neu.addEventListener('click', async () => {
      this.gewaehlt = await this.plugin.kategorieAnlegen();
      this.listeFuellen();
      this.detailFuellen();
    });
  }

  /* ---------------- Detail ---------------------------------------- */

  detailFuellen() {
    this.detailEl.empty();

    const kat = this.plugin.daten.kategorien.find((k) => k.id === this.gewaehlt);
    if (!kat) {
      this.detailEl.createDiv({ cls: 'fc-leer', text: TEXTE.nichtsGewaehlt });
      return;
    }

    const stil = this.plugin.stilVon(kat.id);

    /* --- Farbe und Name ------------------------------------------- */
    const kopf = this.detailEl.createDiv({ cls: 'fc-zeile' });

    const farbe = kopf.createEl('input', { type: 'color', cls: 'fc-farbe' });
    farbe.value = kat.farbe;

    const name = kopf.createEl('input', {
      type: 'text',
      cls: 'fc-name',
      placeholder: TEXTE.namePlatzhalter,
    });
    name.value = kat.name;

    /* --- Markierung ------------------------------------------------ */
    this.detailEl.createDiv({ cls: 'fc-untertitel', text: TEXTE.markierung });

    const gruppe = this.detailEl.createDiv({ cls: 'fc-gruppe' });
    for (const m of MARKIERUNGEN) {
      const knopf = gruppe.createEl('button', { text: m.name });
      if (stil.markierung === m.id) knopf.addClass('mod-cta');
      knopf.addEventListener('click', async () => {
        await this.plugin.stilAendern(kat.id, { markierung: m.id });
        this.detailFuellen();
      });
    }

    /* --- Icon ------------------------------------------------------ */
    /* Sits directly under the marker because it takes the marker's
       place: choose one here and the tree shows no bar and no dot any
       more, but the icon in the category colour. */
    this.detailEl.createDiv({ cls: 'fc-untertitel', text: TEXTE.symbol });

    const symbolZeile = this.detailEl.createDiv({ cls: 'fc-symbolzeile' });
    const waehlen = symbolZeile.createEl('button', { cls: 'fc-symbolknopf' });

    if (kat.icon) {
      const bild = waehlen.createSpan({ cls: 'fc-symbolbild' });
      setIcon(bild, kat.icon);
      bild.style.color = kat.farbe;
      waehlen.createSpan({ text: kat.icon });
    } else {
      waehlen.setText(TEXTE.symbolWaehlen);
      waehlen.addClass('fc-symbolleer');
    }

    waehlen.addEventListener('click', () => {
      new SymbolFenster(this.app, kat.icon || null, async (gewaehlt) => {
        await this.plugin.kategorieAendern(kat.id, { icon: gewaehlt });
        this.detailFuellen();
      }).open();
    });

    if (kat.icon) {
      const weg = symbolZeile.createEl('button', { text: TEXTE.symbolEntfernen });
      weg.addEventListener('click', async () => {
        await this.plugin.kategorieAendern(kat.id, { icon: null });
        this.detailFuellen();
      });
    }

    /* With "None" the folder stays unmarked -- the explicit choice
       beats the icon. Rather than disabling the picker it is only
       visibly dimmed, so a chosen icon survives and takes effect again
       as soon as a marker comes back. Same pattern as "coloured text"
       underneath a background. */
    if (kat.icon && stil.markierung === 'keine') {
      waehlen.addClass('fc-wirkungslos');
      this.detailEl.createDiv({ cls: 'fc-hinweis', text: TEXTE.symbolOhneWirkung });
    } else if (kat.icon) {
      this.detailEl.createDiv({ cls: 'fc-hinweis', text: TEXTE.symbolErsetzt });
    }

    /* --- the three independent switches ---------------------------- */
    this.detailEl.createDiv({ cls: 'fc-untertitel', text: TEXTE.zusaetzlich });

    const schalter = this.detailEl.createDiv({ cls: 'fc-schalter' });
    const umschalter = [
      ['hintergrund', TEXTE.hintergrund],
      ['schriftFarbig', TEXTE.schriftFarbig],
      ['fett', TEXTE.fett],
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

    if (stil.hintergrund) {
      this.detailEl.createDiv({ cls: 'fc-hinweis', text: TEXTE.schriftAutomatisch });
    }

    /* --- Vorschau -------------------------------------------------- */
    this.detailEl.createDiv({ cls: 'fc-untertitel', text: TEXTE.vorschau });
    const vorschau = this.detailEl.createDiv({ cls: 'fc-vorschau' });
    this.vorschauZeichnen(vorschau, kat.farbe, stil, kat.icon);

    /* --- Loeschen -------------------------------------------------- */
    const fuss = this.detailEl.createDiv({ cls: 'fc-detailfuss' });
    const weg = fuss.createEl('button', { cls: 'fc-weg', text: TEXTE.loeschen });

    /* --- Ereignisse ------------------------------------------------ */

    /* The colour takes effect immediately, so you can see the tree
       change while still dragging in the picker. Only the dot in the
       list and the preview are redrawn. */
    farbe.addEventListener('input', () => {
      this.plugin.kategorieAendern(kat.id, { farbe: farbe.value });
      const zeile = this.zeilen.get(kat.id);
      if (zeile) zeile.punkt.style.backgroundColor = farbe.value;
      vorschau.empty();
      this.vorschauZeichnen(vorschau, farbe.value, stil, kat.icon);
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
        const erste = this.plugin.daten.kategorien[0];
        this.gewaehlt = erste ? erste.id : null;
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

    if (stil.markierung !== 'keine') {
      if (icon) {
        /* In the tree this is a tinted mask; here it is a real icon
           with its colour set. The result looks the same, and the
           preview avoids the detour through a data: URI. */
        const marke = zeile.createSpan({ cls: 'fc-vorschau-symbol' });
        setIcon(marke, icon);
        marke.style.color = farbe;
      } else {
        const marke = zeile.createSpan({ cls: 'fc-vorschau-marke' });
        marke.addClass(stil.markierung === 'punkt' ? 'fc-punkt' : 'fc-lasche');
        marke.style.backgroundColor = farbe;
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

  kurz(id) {
    return id.replace(/^lucide-/, '');
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
      knopf.setAttribute('aria-label', this.kurz(id));
      knopf.setAttribute('title', this.kurz(id));
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

/* Finds stored paths whose folder is gone.
 *
 * Obsidian reports renaming and moving, and the assignment follows along
 * -- but only for things that happen inside Obsidian. Rename a folder in
 * Finder, on a phone, or through a sync, and nothing is reported: the
 * entry keeps pointing at a path that no longer exists, the folder shows
 * up uncolored, and the old entry sits in data.json forever.
 *
 * So the check is a deliberate part of startup rather than a repair
 * routine. It reports, it never deletes -- a folder that vanished may
 * well come back from a sync a minute later, and quietly throwing away
 * its color would be the worse surprise.
 *
 * "istOrdner" is handed in rather than called on the vault directly,
 * which is what makes this testable without Obsidian. It has to answer
 * for folders only: should a note ever occupy a former folder's path,
 * the entry is just as dead.
 *
 * Cost is one lookup per stored path -- never a walk over the vault.
 * Obsidian's getAbstractFileByPath is a plain hasOwnProperty on its
 * fileMap (checked in obsidian.asar, 1.12.7), so the size of the vault
 * does not matter, only the number of assignments. Measured 2026-08-27:
 * 0.0 ms at 200 assignments, 57 ms at 300,000. */
function waisenFinden(daten, istOrdner) {
  const zuordnung = daten.zuordnung || {};
  const vererbung = daten.vererbung || {};

  /* One entry per path, even when a path carries both an assignment and
     an inheritance flag -- reporting the same folder twice would only
     make the list look worse than it is. Assignments come first because
     they are what the user actually set. */
  const pfade = Object.keys(zuordnung);
  for (const pfad of Object.keys(vererbung)) {
    if (!Object.prototype.hasOwnProperty.call(zuordnung, pfad)) pfade.push(pfad);
  }

  return pfade.filter((pfad) => !istOrdner(pfad));
}

/* Groups orphans by the topmost one.
 *
 * Renaming one folder outside Obsidian usually kills several entries at
 * once: the folder itself and everything stored below it. Listing them
 * all makes one mistake look like five, when in truth a single rename
 * caused the lot.
 *
 * Each group is one root plus every path that hangs off it. The full
 * list is what gets discarded: throwing away the root alone would leave
 * its children behind as fresh orphans, and the box would grow straight
 * back the moment it was redrawn. */
function waisenGruppieren(waisen) {
  /* Shallow before deep, so a parent is always seen before its
     children. */
  const sortiert = waisen.slice().sort((a, b) => a.length - b.length || (a < b ? -1 : 1));
  const gruppen = [];

  for (const pfad of sortiert) {
    const eltern = gruppen.find((g) => pfad.startsWith(g.pfad + '/'));
    if (eltern) eltern.alle.push(pfad);
    else gruppen.push({ pfad, alle: [pfad] });
  }

  for (const g of gruppen) g.darunter = g.alle.length - 1;

  /* Back into the order they came in, so the list does not reshuffle
     itself between openings of the window. */
  const rang = new Map(waisen.map((p, i) => [p, i]));
  return gruppen.sort((a, b) => rang.get(a.pfad) - rang.get(b.pfad));
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
 *   1. Inheritance -- one folder colours everything beneath it. A single
 *      selector using ^= ("starts with") covers any number of folders,
 *      including ones that do not exist yet.
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
  const vererbung = daten.vererbung || {};
  const ziele = [];

  const tiefe = (pfad) => pfad.split('/').length;

  /* --- 1. inheritance, shallow to deep ---------------------------- */
  const quellen = Object.keys(vererbung)
    .filter((pfad) => vererbung[pfad] && zuordnung[pfad])
    .sort((a, b) => tiefe(a) - tiefe(b) || a.localeCompare(b));

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
      stil,
      icon: icon || null,
    });
  }

  /* --- 2. the folders themselves ---------------------------------- */
  for (const [pfad, katId] of Object.entries(zuordnung)) {
    const { farbe, stil, icon } = nachschlagen(katId);
    if (!farbe || !stil) continue;
    ziele.push({
      selektor: `.nav-folder-title[data-path="${maskieren(pfad)}"]`,
      farbe,
      stil,
      icon: icon || null,
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
  const inhalt = (e) => `${e.selektor} .nav-folder-title-content`;
  const bloecke = [];

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
      .map((e) => `${inhalt(e)}::before { background-color: ${e.farbe}; }`)
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
      .map((e) => `${inhalt(e)}::before { background-color: ${e.farbe}; }`)
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
