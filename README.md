# PondMaster — Tilapia Pond Management PWA

Complete pond management for tilapia farmers in Malawi, Zambia, and Zimbabwe.
Works offline on 2G. Built as a Progressive Web App.

## Features
- Multi-pond management with cooperative member access
- Daily feed logging with growth tracking (monosex Nile tilapia curve)
- AI advisor — bring your own OpenAI, Claude, DeepSeek, or Gemini key
- Worker card — shareable daily schedule, no login needed, works on 2G
- Harvest revenue projection at month 5, 6, and 7
- Disease reference library with treatment steps
- Offline-first with background sync
- English and Chichewa (Nyanja) bilingual support
- Dark/light mode

## Quick Start

```bash
npm install
npm run dev          # http://localhost:8080
```

## Setup

1. Copy config: `cp config.example.js config.js`
2. Add your Supabase URL and anon key to `config.js`
3. Run the SQL in `SUPABASE_SETUP.md` in your Supabase dashboard
4. Open `http://localhost:8080` and create an account

## Deployment

**GitHub Pages (primary):**
Push to `main` — deploys automatically via `.github/workflows/deploy-github-pages.yml`
Live at: `https://sbperete.github.io/pondmaster/`

**Cloudflare Pages (secondary):**
```bash
npm run deploy:cf
```
Live at: `https://pondmaster.pages.dev`

## Store Distribution

Run `npm run package:stores` after first GitHub Pages deployment to generate:
- Android APK/AAB (Google Play, Amazon, Huawei)
- Windows MSIX (Microsoft Store)

See `DISTRIBUTION_GUIDE.md` for store submission steps.

## Infrastructure (Zero Additional Monthly Cost)
- **Database**: Shared Supabase project with `pm_` prefixed tables
- **Hosting**: GitHub Pages (free) + Cloudflare Pages (free)
- **CI/CD**: GitHub Actions (free)

## Author
Steven Mwenye

## License
MIT
