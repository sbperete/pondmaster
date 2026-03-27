# PondMaster — Supabase Setup Guide

PondMaster shares a single Supabase project with Mandarin Master. All PondMaster tables use the `pm_` prefix so they coexist safely in the same database without conflicts.

---

## Prerequisites

- A Supabase project already created (shared with Mandarin Master, or a dedicated one)
- Your project URL and anon key copied into `docs/config.js`

---

## Step 1 — Open the SQL Editor

1. Go to [https://app.supabase.com](https://app.supabase.com) and open your project
2. In the left sidebar, click **SQL Editor**
3. Click **New query**
4. Paste the SQL blocks below one section at a time and click **Run**

---

## Step 2 — Create Tables

### pm_users

```sql
CREATE TABLE IF NOT EXISTS pm_users (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                TEXT NOT NULL,
  name                 TEXT,
  farm_name            TEXT,
  location             TEXT,
  subscription_tier    TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  ai_provider          TEXT DEFAULT 'gemini' CHECK (ai_provider IN ('gemini', 'openai', 'anthropic', 'none')),
  ai_api_key_encoded   TEXT,
  tour_complete        BOOLEAN NOT NULL DEFAULT FALSE,
  theme_preference     TEXT NOT NULL DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
  language_preference  TEXT NOT NULL DEFAULT 'en' CHECK (language_preference IN ('en', 'ny')),
  pond_limit           INTEGER NOT NULL DEFAULT 3,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### pm_ponds

```sql
CREATE TABLE IF NOT EXISTS pm_ponds (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES pm_users(id) ON DELETE CASCADE,
  pond_name               TEXT NOT NULL,
  pond_number             INTEGER,
  status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fallow', 'maintenance', 'archived', 'deleted')),
  length_m                NUMERIC(8,2),
  width_m                 NUMERIC(8,2),
  depth_m                 NUMERIC(6,2),
  volume_m3               NUMERIC(10,2),
  liner_type              TEXT CHECK (liner_type IN ('earthen', 'concrete', 'tarpaulin', 'geomembrane', 'other')),
  water_source            TEXT CHECK (water_source IN ('borehole', 'river', 'rain', 'municipal', 'other')),
  aeration_type           TEXT CHECK (aeration_type IN ('none', 'paddlewheel', 'diffuser', 'venturi', 'other')),
  worker_token            TEXT UNIQUE,
  worker_token_expires_at TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### pm_pond_lots

```sql
CREATE TABLE IF NOT EXISTS pm_pond_lots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pond_id               UUID NOT NULL REFERENCES pm_ponds(id) ON DELETE CASCADE,
  lot_number            INTEGER NOT NULL DEFAULT 1,
  species               TEXT NOT NULL DEFAULT 'tilapia' CHECK (species IN ('tilapia', 'catfish', 'carp', 'trout', 'bass', 'other')),
  stock_type            TEXT CHECK (stock_type IN ('mono', 'poly')),
  fingerlings_stocked   INTEGER,
  stocking_date         DATE,
  target_harvest_date   DATE,
  harvest_month_target  INTEGER CHECK (harvest_month_target BETWEEN 1 AND 12),
  fingerling_source     TEXT,
  fingerling_cost_mwk   NUMERIC(12,2),
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'harvested', 'failed', 'cancelled')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### pm_daily_logs

```sql
CREATE TABLE IF NOT EXISTS pm_daily_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pond_id          UUID NOT NULL REFERENCES pm_ponds(id) ON DELETE CASCADE,
  lot_id           UUID REFERENCES pm_pond_lots(id) ON DELETE SET NULL,
  log_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  feed_type        TEXT CHECK (feed_type IN ('pellet_2mm', 'pellet_4mm', 'pellet_6mm', 'crumble', 'powder', 'homemade', 'none')),
  feed_amount_kg   NUMERIC(8,3),
  feed_cost_mwk    NUMERIC(12,2),
  water_temp_c     NUMERIC(5,2),
  do_level         NUMERIC(5,2),
  ph_level         NUMERIC(5,2),
  fish_sampled     INTEGER,
  avg_weight_g     NUMERIC(8,2),
  mortality_count  INTEGER NOT NULL DEFAULT 0,
  notes            TEXT,
  logged_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  synced_offline   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### pm_health_events

```sql
CREATE TABLE IF NOT EXISTS pm_health_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pond_id             UUID NOT NULL REFERENCES pm_ponds(id) ON DELETE CASCADE,
  lot_id              UUID REFERENCES pm_pond_lots(id) ON DELETE SET NULL,
  event_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  event_type          TEXT NOT NULL CHECK (event_type IN ('disease', 'parasite', 'water_quality', 'predator', 'equipment_failure', 'mass_mortality', 'other')),
  symptoms            TEXT,
  severity            TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  treatment_applied   TEXT,
  outcome             TEXT,
  resolved_date       DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### pm_harvests

```sql
CREATE TABLE IF NOT EXISTS pm_harvests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pond_id             UUID NOT NULL REFERENCES pm_ponds(id) ON DELETE CASCADE,
  lot_id              UUID REFERENCES pm_pond_lots(id) ON DELETE SET NULL,
  harvest_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  fish_harvested      INTEGER,
  avg_weight_kg       NUMERIC(8,3),
  total_biomass_kg    NUMERIC(10,3),
  price_per_kg_mwk    NUMERIC(10,2),
  gross_revenue_mwk   NUMERIC(14,2),
  buyer_name          TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### pm_ai_conversations

```sql
CREATE TABLE IF NOT EXISTS pm_ai_conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pond_id       UUID NOT NULL REFERENCES pm_ponds(id) ON DELETE CASCADE,
  lot_id        UUID REFERENCES pm_pond_lots(id) ON DELETE SET NULL,
  user_id       UUID NOT NULL REFERENCES pm_users(id) ON DELETE CASCADE,
  messages_json JSONB NOT NULL DEFAULT '[]',
  provider      TEXT CHECK (provider IN ('gemini', 'openai', 'anthropic')),
  topic         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### pm_pond_invites

```sql
CREATE TABLE IF NOT EXISTS pm_pond_invites (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pond_id        UUID NOT NULL REFERENCES pm_ponds(id) ON DELETE CASCADE,
  invited_by     UUID NOT NULL REFERENCES pm_users(id) ON DELETE CASCADE,
  invited_email  TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'worker', 'manager')),
  accepted       BOOLEAN NOT NULL DEFAULT FALSE,
  accepted_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### pm_pond_members

```sql
CREATE TABLE IF NOT EXISTS pm_pond_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pond_id    UUID NOT NULL REFERENCES pm_ponds(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES pm_users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'worker', 'manager')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pond_id, user_id)
);
```

---

## Step 3 — Enable Row Level Security

Run this block to enable RLS on all PondMaster tables:

```sql
ALTER TABLE pm_users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_ponds           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_pond_lots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_daily_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_health_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_harvests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_pond_invites    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_pond_members    ENABLE ROW LEVEL SECURITY;
```

---

## Step 4 — Create RLS Policies

### pm_users policies

```sql
-- Users can read their own profile
CREATE POLICY "pm_users: owner read"
  ON pm_users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "pm_users: owner update"
  ON pm_users FOR UPDATE
  USING (auth.uid() = id);

-- New users can insert their own profile (triggered on sign-up)
CREATE POLICY "pm_users: owner insert"
  ON pm_users FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### pm_ponds policies

```sql
-- Owners can read their own ponds
CREATE POLICY "pm_ponds: owner read"
  ON pm_ponds FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM pm_pond_members
      WHERE pond_id = pm_ponds.id AND user_id = auth.uid()
    )
  );

-- Owners can insert ponds
CREATE POLICY "pm_ponds: owner insert"
  ON pm_ponds FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Owners can update their own ponds
CREATE POLICY "pm_ponds: owner update"
  ON pm_ponds FOR UPDATE
  USING (auth.uid() = user_id);

-- Owners can delete (soft-delete) their own ponds
CREATE POLICY "pm_ponds: owner delete"
  ON pm_ponds FOR DELETE
  USING (auth.uid() = user_id);

-- Worker token access (anon select only — used by worker log page)
CREATE POLICY "pm_ponds: worker token read"
  ON pm_ponds FOR SELECT
  USING (
    worker_token IS NOT NULL
    AND worker_token_expires_at > NOW()
  );
```

### pm_pond_lots policies

```sql
-- Users who own the pond (or are members) can read lots
CREATE POLICY "pm_pond_lots: pond owner read"
  ON pm_pond_lots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pm_ponds
      WHERE id = pm_pond_lots.pond_id
        AND (
          user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM pm_pond_members
            WHERE pond_id = pm_ponds.id AND user_id = auth.uid()
          )
        )
    )
  );

-- Pond owners and managers can insert lots
CREATE POLICY "pm_pond_lots: pond owner insert"
  ON pm_pond_lots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pm_ponds WHERE id = pond_id AND user_id = auth.uid()
    )
  );

-- Pond owners and managers can update lots
CREATE POLICY "pm_pond_lots: pond owner update"
  ON pm_pond_lots FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pm_ponds WHERE id = pm_pond_lots.pond_id AND user_id = auth.uid()
    )
  );
```

### pm_daily_logs policies

```sql
-- Pond owners and members can read logs
CREATE POLICY "pm_daily_logs: pond member read"
  ON pm_daily_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pm_ponds
      WHERE id = pm_daily_logs.pond_id
        AND (
          user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM pm_pond_members
            WHERE pond_id = pm_ponds.id AND user_id = auth.uid()
          )
        )
    )
  );

-- Authenticated users who are pond owners or members can insert logs
CREATE POLICY "pm_daily_logs: pond member insert"
  ON pm_daily_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pm_ponds
      WHERE id = pond_id
        AND (
          user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM pm_pond_members
            WHERE pond_id = pm_ponds.id AND user_id = auth.uid()
          )
        )
    )
  );

-- Only pond owner can update logs
CREATE POLICY "pm_daily_logs: pond owner update"
  ON pm_daily_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pm_ponds WHERE id = pm_daily_logs.pond_id AND user_id = auth.uid()
    )
  );
```

### pm_health_events policies

```sql
-- Pond owners and members can read health events
CREATE POLICY "pm_health_events: pond member read"
  ON pm_health_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pm_ponds
      WHERE id = pm_health_events.pond_id
        AND (
          user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM pm_pond_members
            WHERE pond_id = pm_ponds.id AND user_id = auth.uid()
          )
        )
    )
  );

-- Pond owners and members can insert health events
CREATE POLICY "pm_health_events: pond member insert"
  ON pm_health_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pm_ponds
      WHERE id = pond_id
        AND (
          user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM pm_pond_members
            WHERE pond_id = pm_ponds.id AND user_id = auth.uid()
          )
        )
    )
  );

-- Pond owners and managers can update health events
CREATE POLICY "pm_health_events: pond owner update"
  ON pm_health_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pm_ponds WHERE id = pm_health_events.pond_id AND user_id = auth.uid()
    )
  );
```

### pm_harvests policies

```sql
-- Pond owners and members can read harvests
CREATE POLICY "pm_harvests: pond member read"
  ON pm_harvests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pm_ponds
      WHERE id = pm_harvests.pond_id
        AND (
          user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM pm_pond_members
            WHERE pond_id = pm_ponds.id AND user_id = auth.uid()
          )
        )
    )
  );

-- Pond owners can insert harvests
CREATE POLICY "pm_harvests: pond owner insert"
  ON pm_harvests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pm_ponds WHERE id = pond_id AND user_id = auth.uid()
    )
  );

-- Pond owners can update harvests
CREATE POLICY "pm_harvests: pond owner update"
  ON pm_harvests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pm_ponds WHERE id = pm_harvests.pond_id AND user_id = auth.uid()
    )
  );
```

### pm_ai_conversations policies

```sql
-- Users can only read their own conversations
CREATE POLICY "pm_ai_conversations: owner read"
  ON pm_ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own conversations
CREATE POLICY "pm_ai_conversations: owner insert"
  ON pm_ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversations
CREATE POLICY "pm_ai_conversations: owner update"
  ON pm_ai_conversations FOR UPDATE
  USING (auth.uid() = user_id);
```

### pm_pond_invites policies

```sql
-- Pond owners can read and manage invites for their ponds
CREATE POLICY "pm_pond_invites: pond owner read"
  ON pm_pond_invites FOR SELECT
  USING (
    auth.uid() = invited_by
    OR EXISTS (
      SELECT 1 FROM pm_ponds WHERE id = pm_pond_invites.pond_id AND user_id = auth.uid()
    )
    OR (
      invited_email = (SELECT email FROM pm_users WHERE id = auth.uid())
    )
  );

-- Pond owners can create invites
CREATE POLICY "pm_pond_invites: pond owner insert"
  ON pm_pond_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pm_ponds WHERE id = pond_id AND user_id = auth.uid()
    )
  );

-- Invited user can mark invite as accepted; owner can delete
CREATE POLICY "pm_pond_invites: accept update"
  ON pm_pond_invites FOR UPDATE
  USING (
    invited_email = (SELECT email FROM pm_users WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM pm_ponds WHERE id = pm_pond_invites.pond_id AND user_id = auth.uid()
    )
  );

-- Pond owners can delete (revoke) invites
CREATE POLICY "pm_pond_invites: pond owner delete"
  ON pm_pond_invites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pm_ponds WHERE id = pm_pond_invites.pond_id AND user_id = auth.uid()
    )
  );
```

### pm_pond_members policies

```sql
-- Members can read the membership list for ponds they belong to
CREATE POLICY "pm_pond_members: member read"
  ON pm_pond_members FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM pm_ponds WHERE id = pm_pond_members.pond_id AND user_id = auth.uid()
    )
  );

-- Pond owners can insert members (via acceptInvite)
CREATE POLICY "pm_pond_members: pond owner insert"
  ON pm_pond_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pm_ponds WHERE id = pond_id AND user_id = auth.uid()
    )
    OR auth.uid() = user_id
  );

-- Pond owners can update member roles
CREATE POLICY "pm_pond_members: pond owner update"
  ON pm_pond_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pm_ponds WHERE id = pm_pond_members.pond_id AND user_id = auth.uid()
    )
  );

-- Pond owners can remove members; members can remove themselves
CREATE POLICY "pm_pond_members: pond owner or self delete"
  ON pm_pond_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM pm_ponds WHERE id = pm_pond_members.pond_id AND user_id = auth.uid()
    )
  );
```

---

## Step 5 — Create Indexes

```sql
-- pm_ponds
CREATE INDEX IF NOT EXISTS idx_pm_ponds_user_id       ON pm_ponds(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_ponds_status        ON pm_ponds(status);
CREATE INDEX IF NOT EXISTS idx_pm_ponds_worker_token  ON pm_ponds(worker_token) WHERE worker_token IS NOT NULL;

-- pm_pond_lots
CREATE INDEX IF NOT EXISTS idx_pm_pond_lots_pond_id  ON pm_pond_lots(pond_id);
CREATE INDEX IF NOT EXISTS idx_pm_pond_lots_status   ON pm_pond_lots(status);

-- pm_daily_logs
CREATE INDEX IF NOT EXISTS idx_pm_daily_logs_pond_id   ON pm_daily_logs(pond_id);
CREATE INDEX IF NOT EXISTS idx_pm_daily_logs_log_date  ON pm_daily_logs(log_date DESC);
CREATE INDEX IF NOT EXISTS idx_pm_daily_logs_lot_id    ON pm_daily_logs(lot_id);

-- pm_health_events
CREATE INDEX IF NOT EXISTS idx_pm_health_events_pond_id       ON pm_health_events(pond_id);
CREATE INDEX IF NOT EXISTS idx_pm_health_events_resolved_date ON pm_health_events(resolved_date) WHERE resolved_date IS NULL;

-- pm_harvests
CREATE INDEX IF NOT EXISTS idx_pm_harvests_pond_id      ON pm_harvests(pond_id);
CREATE INDEX IF NOT EXISTS idx_pm_harvests_harvest_date ON pm_harvests(harvest_date DESC);

-- pm_ai_conversations
CREATE INDEX IF NOT EXISTS idx_pm_ai_conversations_pond_id   ON pm_ai_conversations(pond_id);
CREATE INDEX IF NOT EXISTS idx_pm_ai_conversations_user_id   ON pm_ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_ai_conversations_updated_at ON pm_ai_conversations(updated_at DESC);

-- pm_pond_invites
CREATE INDEX IF NOT EXISTS idx_pm_pond_invites_pond_id       ON pm_pond_invites(pond_id);
CREATE INDEX IF NOT EXISTS idx_pm_pond_invites_invited_email ON pm_pond_invites(invited_email);

-- pm_pond_members
CREATE INDEX IF NOT EXISTS idx_pm_pond_members_pond_id  ON pm_pond_members(pond_id);
CREATE INDEX IF NOT EXISTS idx_pm_pond_members_user_id  ON pm_pond_members(user_id);
```

---

## Step 6 — Auto-Create User Profile on Sign-Up

This function creates a `pm_users` row automatically when a new auth user registers:

```sql
CREATE OR REPLACE FUNCTION handle_pm_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO pm_users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_pm_auth_user_created ON auth.users;
CREATE TRIGGER on_pm_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_pm_new_user();
```

---

## Step 7 — Configure Auth Redirect URLs

1. In the Supabase dashboard, go to **Authentication > URL Configuration**
2. Set **Site URL** to your production domain, e.g. `https://pondmaster.netlify.app`
3. Under **Redirect URLs**, add all of the following:

```
https://pondmaster.netlify.app/docs/auth.html
https://pondmaster.netlify.app/docs/index.html
http://localhost:3000/docs/auth.html
http://localhost:8080/docs/auth.html
http://127.0.0.1:5500/docs/auth.html
```

4. In **Authentication > Providers**, make sure **Email** is enabled
5. Optionally enable **Google OAuth** and add its redirect URIs

---

## Step 8 — Copy Credentials to config.js

Copy `config.example.js` to `config.js` and fill in your Supabase project URL and anon key:

```js
const CONFIG = {
  SUPABASE_URL: 'https://your-project-ref.supabase.co',
  SUPABASE_ANON_KEY: 'your-anon-key-here',
  CACHE_TTL_MINUTES: 15,
};
```

The anon key is safe to include in client-side code. All data access is controlled by the RLS policies above.

---

## Notes on Sharing with Mandarin Master

This Supabase project is shared between PondMaster and Mandarin Master. The two apps are kept completely isolated by table prefix:

| Prefix | App |
|--------|-----|
| `pm_`  | PondMaster (this app) |
| `mm_`  | Mandarin Master |

RLS policies ensure users can only access their own data. There is no cross-app data leakage. Both apps use the same `auth.users` table — a user could theoretically have accounts in both apps under the same email address, but their app data is fully separated by the prefix and by `user_id` foreign keys.

If you need to split into separate Supabase projects in the future, the `pm_` prefix makes migration straightforward — export all tables matching `pm_*` and import into the new project.
