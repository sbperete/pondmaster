# PondMaster — Distribution Guide

Step-by-step instructions for all 9 distribution platforms.

---

## Prerequisites

1. **GitHub repo**: `sbperete/pondmaster` on branch `main`
2. **Supabase project**: shared with Mandarin Master at `dpvfmurocginoxatxlut.supabase.co`
3. **Cloudflare account**: existing account from Mandarin Master
4. **Google Play account**: $25 one-time fee (already paid)
5. **Microsoft Store account**: $19 one-time fee (already paid)
6. **Screenshots**: 1280×720 (landscape) and 750×1334 (portrait) ready

---

## 1. GitHub Pages (Primary)

**Auto-deploys on every push to `main`.**

Initial setup (one-time):
```bash
# After creating the repo
gh api repos/sbperete/pondmaster/pages \
  --method POST \
  -f source.branch=main \
  -f source.path=/docs

# Verify
gh api repos/sbperete/pondmaster/pages
```

URL: `https://sbperete.github.io/pondmaster/`

---

## 2. Cloudflare Pages (Secondary)

Initial setup (one-time):
```bash
# Authenticate with existing account
npx wrangler login

# Verify account ID
npx wrangler whoami

# Create new project (reuses existing account)
npx wrangler pages project create pondmaster

# Initial manual deploy
npx wrangler pages deploy docs --project-name=pondmaster

# Set GitHub secrets for auto-deploy
gh secret set CLOUDFLARE_API_TOKEN   # from dash.cloudflare.com → My Profile → API Tokens
gh secret set CLOUDFLARE_ACCOUNT_ID  # from npx wrangler whoami output
```

After secrets are set, `deploy-cloudflare.yml` auto-deploys on push to `main`.

URL: `https://pondmaster.pages.dev`

---

## 3. Google Play Store

**Build**: Trigger `Build Android TWA` workflow manually (or on tag push).

Before first build, set GitHub secret:
```bash
gh secret set KEYSTORE_PASSWORD  # any strong password, e.g. "PondMaster2024!Key"
```

**Submission steps:**
1. Download `pondmaster-aab` artifact from the workflow run
2. Go to [play.google.com/console](https://play.google.com/console)
3. Create new app → `com.pondmaster.app`
4. App name: **PondMaster — Tilapia Pond Manager**
5. Upload AAB to Internal Testing first, then promote to Production
6. Set up store listing using `store-listings.md`
7. For Digital Asset Links: get SHA-256 from workflow logs, add to `docs/.well-known/assetlinks.json`

**`assetlinks.json` format:**
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.pondmaster.app",
    "sha256_cert_fingerprints": ["AA:BB:CC:...paste SHA256 from build log here..."]
  }
}]
```

---

## 4. Amazon Appstore

**Build**: Same APK from `Build Android TWA` workflow.

1. Download `pondmaster-apk` artifact
2. Go to [developer.amazon.com](https://developer.amazon.com/apps-and-games/console)
3. Add new app → Android
4. Upload the APK (same file as Google Play, Amazon accepts unsigned APKs too)
5. App title: **PondMaster**
6. Category: **Business → Productivity**
7. Fill store listing from `store-listings.md`
8. Enable "In-App Purchasing" = No
9. Submit for review (~1-3 business days)

---

## 5. Huawei AppGallery

1. Download `pondmaster-apk` artifact
2. Go to [developer.huawei.com/consumer/en/appgallery](https://developer.huawei.com/consumer/en/appgallery)
3. Register developer account (free) → Console → My Apps
4. Create new app → APK upload
5. Package name: `com.pondmaster.app`
6. Category: **Tools**
7. Fill listing from `store-listings.md`
8. Submit for review (~3-5 business days)

---

## 6. Samsung Galaxy Store

Samsung accepts PWAs directly via email — no APK needed.

Send email to **pwasupport@samsung.com** with subject: **PWA Submission: PondMaster**

Email body:
```
App Name: PondMaster — Tilapia Pond Manager
PWA URL: https://sbperete.github.io/pondmaster/
Manifest URL: https://sbperete.github.io/pondmaster/manifest.json
Category: Business / Productivity
Description: (paste short description from store-listings.md)
Contact: (your email)
```

Attach: 3-5 screenshots (750×1334 PNG)

---

## 7. Microsoft Store (MSIX)

**Build**: Set secret then trigger `Build Windows MSIX` workflow.

```bash
# Get Publisher CN from your Microsoft Partner Center account
# Dashboard → Account settings → Legal info → Publisher display name
gh secret set MS_PUBLISHER_CN  # e.g. "CN=Your Name, O=Your Org, ..."
```

1. Download `pondmaster-msix` artifact
2. Go to [partner.microsoft.com/dashboard](https://partner.microsoft.com/dashboard)
3. Create new app → **PondMaster**
4. Packages → Upload MSIX file
5. Store listing → fill from `store-listings.md`
6. Pricing: Free
7. Submit for certification (~1-3 business days)

---

## 8. AppSumo

AppSumo is a marketplace for lifetime deals on SaaS tools.

1. Go to [sell.appsumo.com](https://sell.appsumo.com)
2. Apply as a partner → fill company/product info
3. Use `platforms/appsumo/listing/description.md` for product description
4. Use `platforms/appsumo/pricing-tiers.md` for pricing tiers
5. Once approved, set deal pricing (suggested: $29 one-time for lifetime personal, $79 for team)
6. AppSumo handles payment + customer emails

---

## 9. Product Hunt

Best launched Tuesday or Wednesday at **12:01 AM PT**.

1. Create account at [producthunt.com](https://producthunt.com)
2. Submit product at producthunt.com/posts/new
3. **Tagline**: "Track your tilapia ponds, boost your harvest"
4. **URL**: https://sbperete.github.io/pondmaster/
5. **Topics**: Productivity, Agriculture, Mobile, Africa
6. **Media**: upload 2-3 screenshots + a 30-second demo GIF
7. Join the discussion on launch day — reply to every comment

---

## Secrets Summary

| Secret | Used By | How to Get |
|--------|---------|------------|
| `CLOUDFLARE_API_TOKEN` | deploy-cloudflare.yml | Cloudflare Dashboard → API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | deploy-cloudflare.yml | `npx wrangler whoami` |
| `KEYSTORE_PASSWORD` | build-twa.yml | Set any strong password (save it!) |
| `MS_PUBLISHER_CN` | build-msix.yml | Microsoft Partner Center → Account settings |

Set all secrets:
```bash
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
gh secret set KEYSTORE_PASSWORD
gh secret set MS_PUBLISHER_CN
```

---

## Post-Deployment Checklist

- [ ] GitHub Pages URL loads and SW installs
- [ ] Cloudflare Pages mirrors GitHub Pages
- [ ] `validate.yml` passes on push
- [ ] Register account → complete tour → dashboard loads
- [ ] Add pond → log feed → growth chart renders
- [ ] Offline: disconnect → view data → reconnect → verify sync
- [ ] Demo mode: all features work, zero network calls
- [ ] Worker card: loads in incognito < 3s, print works
- [ ] Dark mode: toggle → charts re-render → persists reload
- [ ] AI chat: add key in settings → get response
- [ ] TWA build: download APK → install on Android → TWA verified
- [ ] assetlinks.json updated with SHA-256 from build log
- [ ] MSIX artifact downloads and installs on Windows 10/11
