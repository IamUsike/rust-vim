# 🦀 rustvim

A minimal browser-based Rust editor with **real vim keybindings**.  
Compiles and runs code via the public [Rust Playground API](https://play.rust-lang.org) — no backend required.

## Features

- **Full vim emulation** — normal, insert, visual, replace modes, registers, ex commands (`@replit/codemirror-vim`)
- **CodeMirror 6** editor with Rust syntax highlighting and One Dark theme
- **Run code** — `Ctrl+Enter`, `:w`, `:run`, or the Run button
- **Toolbar controls** — channel (stable/beta/nightly), mode (debug/release), edition (2015–2024)
- **Output pane** — colored stdout/stderr, loading spinner, collapsible
- **Session restore** — code auto-saved to localStorage
- **Vim mode indicator** — status bar badge showing NORMAL / INSERT / VISUAL / REPLACE

## Run locally

```sh
npm install
npm run dev
```

## Build

```sh
npm run build   # outputs to dist/
```

## Deploy

Push to `main` — the included GitHub Actions workflow builds and deploys to GitHub Pages automatically.

> **Setup**: repo Settings → Pages → Source → "GitHub Actions"

## Stack

Vanilla JS · Vite · CodeMirror 6 · `@replit/codemirror-vim`

## License

MIT
