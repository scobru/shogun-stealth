Ruolo: Agisci come un Esperto di UI/UX Design e Sviluppatore Frontend avanzato, specializzato in Tailwind CSS e DaisyUI.

Obiettivo: Voglio configurare e personalizzare DaisyUI affinché il suo aspetto (look and feel) replichi fedelmente il "Material Expressive" di Google (lo stile delle app Google nel 2026, evoluzione di Material 3/Material You).

Contesto di Design (Google 2026 - Material Expressive):
Il design deve comunicare un senso di modernità, accessibilità, forme morbide, colori dinamici basati su tonalità e una chiara gerarchia visiva senza dipendere pesantemente dalle ombre (elevation).

Genera il file tailwind.config.js, le eventuali regole CSS di base in style.css e un esempio di HTML con alcune classi chiave, seguendo rigorosamente queste linee guida:

1. Sistema di Colori (Tonal Palettes):

Mappa i temi di DaisyUI (primary, secondary, accent, base-100, base-200, base-300) per simulare i Surface Colors e i Primary/Secondary Tones del Material Expressive.

base-100 deve essere il colore di sfondo principale. base-200 e base-300 devono fungere da Surface Container (per card e modali) con leggere variazioni di luminosità/tinta, non solo grigi.

Usa colori pastello o saturi ma morbidi.

2. Forme e Raggi di Curvatura (Shapes):

Sovrascrivi le variabili CSS di DaisyUI per i border-radius.

I bottoni standard (btn) devono essere a forma di pillola (completamente arrotondati, es. rounded-full).

Le card (card) e i contenitori modali devono avere bordi molto arrotondati (es. rounded-[28px] o rounded-3xl), tipici delle app Google recenti.

3. Tipografia (Google Sans style):

Imposta un font sans-serif pulito e geometrico come font principale (es. Outfit, Plus Jakarta Sans o Inter se Google Sans non è disponibile).

I titoli (h1, h2) devono essere "Expressive": grandi, con pesi variabili (es. medium o semi-bold) e tracking (letter-spacing) leggermente ridotto.

4. Elevation e Bordi (Shadows & Outlines):

Riduci drasticamente l'uso delle ombre nette (drop shadows classiche).

Per l'elevation (distinguere le card dallo sfondo), usa variazioni di colore di sfondo (Surface 1, Surface 2) o un leggerissimo e impercettibile bordo in tinta (outline design).

Se usi le ombre, usa ombre colorate e molto diffuse.

5. Componenti Specifici:

Floating Action Button (FAB): Grande, smussato (rounded-2xl o 3xl), colorato e in basso a destra.

Bottom Navigation: Alta, spaziosa, con icone all'interno di "pillole" attive che indicano lo stato selezionato.

Input Text: Stile "Filled" o "Outlined" del Material 3 (sfondo leggermente scuro o bordo arrotondato con etichetta interna).