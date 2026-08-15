# Substancia

A field guide to how psychoactive substances feel — a free, open-source desktop
reference app covering 288 specimens, each annotated with dosing, pharmacology,
interactions, and the subjective effects people report.

Reference material, not advice.

## Features

- **The Firmament** — specimens placed by how similar their subjective effects
  are, not by chemistry or class.
- **Specimen plates** — dose ranges, duration arcs, tolerance, addiction
  potential, neurochemistry, interactions, and cited prose for history,
  pharmacology, chemistry, forms, toxicity, and legal status.
- **Kinship and divergence** — nearest specimens by shared effects and by
  shared receptor targets, and where the two disagree.
- **Compare (Diptych)** — side-by-side comparison of any two specimens.
- **Taxonomy** — browse every drug class.

Substancia is entirely free — there is no paywalled tier.

## Data

Substancia's dataset is built from [PsychonautWiki](https://psychonautwiki.org/)
and compiled by a separate (private) scraping/cleaning pipeline. This repo
ships the compiled data (`src-tauri/data/`, `public/data/`) needed to run the
app; it does not include the raw scraper or source corpus.

## Development

```bash
pnpm install
pnpm tauri dev
```

## Building

```bash
pnpm tauri build
```

Produces an NSIS installer, an MSI installer, and a standalone `.exe` under
`src-tauri/target/release/`.

## License

GPL-3.0 — see [LICENSE](LICENSE). Contributions and forks are welcome, and
must stay open source.
