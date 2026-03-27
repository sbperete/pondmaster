# PondMaster — Complete Tilapia Farm Management Software

**Track every fish, every feed, every kwacha. Built for Africa.**

**Category:** Agriculture / Productivity

---

## THE PROBLEM

Tilapia and catfish farmers across sub-Saharan Africa are running profitable ponds on guesswork. Without a system to track feed schedules, stocking densities, growth rates, and harvest yields, most farmers have no clear picture of which ponds are making money and which are quietly bleeding it. Industry surveys consistently show that smallholder aquaculture operations lose between 20 and 40 percent of potential profit to preventable problems: overfeeding that fouls water and inflates costs, underfeeding that stunts fish growth, harvests timed by instinct rather than data, and worker hours that go unrecorded and unaccounted.

The tools that exist were built for salmon farms in Norway or shrimp operations in Thailand. They require constant internet connectivity, charge in US dollars per month, and assume the farmer has a laptop, an accountant, and a stable power supply. African fish farmers — running two ponds in Zambia, five in Ghana, or a small cooperative in Malawi — have none of those things. They have a smartphone, a 2G connection that cuts out when it rains, and a business that deserves real software.

---

## THE SOLUTION

PondMaster is a Progressive Web App built from the ground up for African aquaculture. It runs entirely in the browser, installs on any Android phone like a native app, stores all data locally so it works completely offline, and syncs to the cloud the moment a connection is available. Every screen, every label, and every calculation is designed around the realities of tilapia and catfish farming in Zambia, Malawi, Ghana, and beyond.

From the moment you add your first pond, PondMaster tracks stocking dates, fish counts, feed types, feeding amounts, water quality readings, worker activity, and projected harvest dates — all in one place. When you are ready to harvest, the app shows you your total cost of production, estimated revenue at current market prices, and net profit per pond. It prints worker ID cards, generates cooperative member reports, and lets you ask an AI assistant farming questions in plain language — all without needing a monthly subscription or a reliable internet connection.

---

## KEY FEATURES

- **Pond & Lot Management** — Create ponds, add stocking lots with species, count, and source, and track each lot through its full grow-out cycle to harvest.
- **Feed Tracking** — Log every feeding session with feed type, amount in kg, and cost per kg. See cumulative feed costs and FCR (feed conversion ratio) per lot.
- **Water Quality Log** — Record pH, dissolved oxygen, temperature, and ammonia readings with timestamps. Flag readings outside safe ranges instantly.
- **Harvest Calculator** — Enter your expected market price per kg and PondMaster calculates estimated revenue, total production cost, and projected net profit before you lift a net.
- **Worker Management & ID Cards** — Add farm workers, assign them to ponds, log their daily activity, and print laminated-ready worker ID cards directly from the app.
- **Cooperative Invites** — Invite cooperative members to view shared pond data. Members see what you share; they cannot edit your records.
- **AI Farming Assistant (BYOK)** — Ask questions like "Why is my FCR above 2.0?" or "What is the ideal stocking density for tilapia at 28°C?" using your own OpenAI, Anthropic, DeepSeek, or Gemini API key. No key is stored on our servers.
- **Offline-First** — All data lives on your device. The app works with zero connectivity. Sync happens automatically when you go online.
- **2G-Friendly** — The entire app loads in under 200 KB on first install. Subsequent loads are instant from the device cache.
- **CSV & PDF Export** — Export pond summaries, lot histories, and harvest reports as CSV for Excel or PDF for sharing with extension officers or cooperative boards.
- **Pond Cloning** — Clone an existing pond's configuration to quickly set up a new pond with the same feed schedule and stocking parameters.
- **Multi-Farm Dashboard** — Cooperative administrators see an aggregated view across all member farms: total fish count, total feed cost, upcoming harvests.
- **White-Label Worker Cards** — Print worker ID cards with your farm or cooperative name, logo, and branding.

---

## WHO IS IT FOR

PondMaster is built for:

- **Smallholder fish farmers** running one to ten ponds of tilapia, catfish, or carp anywhere in sub-Saharan Africa.
- **Fish farming cooperatives** that want a shared record-keeping system their members can all access from their phones.
- **Agricultural extension officers** who visit multiple farms and want to help farmers move from paper records to digital tracking.
- **Aquaculture investors and outgrower scheme operators** who need standardized data from the farmers they finance.
- **NGOs and development programs** running fish farming training programs who want participants to have a real tool, not a printed worksheet.

If you have a pond, a phone, and fish to sell, PondMaster is for you.

---

## TECH SPECS

| Spec | Detail |
|------|--------|
| Type | Progressive Web App (PWA) |
| Install | Add to Home Screen on Android — no app store required |
| Offline | Full offline support via Service Worker + IndexedDB |
| Network requirement | Works on 2G and above; first load under 200 KB |
| Devices | Android 8+, iOS 14+, any modern desktop browser |
| Backend | Supabase (Postgres + Auth) for cloud sync |
| AI | BYOK — OpenAI, Anthropic, DeepSeek, Google Gemini |
| Data ownership | All farm data belongs to the farmer |
| Updates | Automatic background updates via Service Worker |
| Languages | English (Chichewa, Nyanja, Twi expansions planned) |
| Store availability | Google Play, Microsoft Store, Amazon Appstore, Samsung Galaxy Store, Huawei AppGallery |
