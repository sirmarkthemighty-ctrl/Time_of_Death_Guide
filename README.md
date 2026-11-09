# Time of Death Guide
### Post-mortem signs, the time since death each one allows, and where they overlap

A bedside and teaching tool by Warodom Phaenthong, M.D. It is one self-contained HTML page
(`time-of-death-guide.html`, opened by `index.html`) that runs in the browser with no installation and
sends no data anywhere.

It is a teaching estimate, not a forensic opinion. Temperature, body size, clothing and setting shift every
range, and no single sign dates death reliably.

## What it does

- **Describe the findings box:** type what you see (English or Thai) and it ticks the matching signs and fills the calculators, using plain keyword rules on the page.
- **Checklist of 36 early and late signs** (rigor, livor, cooling, muscle and eye reactions, decomposition,
  insects, long-term remains). Tick what you find.
- **Window and chart.** The ticked signs are overlapped on one log time scale. A floating bar follows you down
  the list; open it for the full chart.
- **Three kinds of range, never mixed up.** A full range where a book gives one; a baseline (solid bar, then a
  faded end) where a book gives only a typical figure, used only as a soft lower bound; and N/A where
  neither book has a figure.
- **Rectal temperature calculator** (Henssge nomogram, Madea 2023 Chapter 6.1) with the book's 95% variation.
  It reproduces the book's own worked example (14.9 h, 12.1-17.7 h).
- **Setting note** for heat, cold, water and burial.
- **Table** of every sign on one scale, **Cases** drop-down of four teaching examples, an A4 case sheet,
  a Key, references. English and Thai, light and dark.

## Sources and what is not verified

Time ranges come from two textbooks: Madea (ed.), *Estimation of the Time Since Death*, 4th ed., CRC Press 2023,
and Pollak, Saukko and Knight, *Knight's Forensic Pathology*, 5th ed., CRC Press 2026. Each sign's (i) button
shows which book gives its figure, with table and page numbers on separate rows. Page numbers for the Knight
book were read from the PDF running heads and may be off by one. Signs a book does not cover say so; none is
filled in from memory.

No source PDFs or book text are included in this repository. Journal articles were found through PubMed.

## Test

`node test.js` runs its checks with no browser (401 at present): every sign has a range or N/A and English and Thai source rows, the four teaching examples give the expected windows, and the calculator reproduces both worked examples in the book, its weight adjustment matches the book's Table 6.20, and the vitreous potassium calculator follows the book's equation.

## Run it

Open `time-of-death-guide.html` in a browser. Fonts load from Google Fonts when online; the app works offline.

Tap the version badge for the changelog.
