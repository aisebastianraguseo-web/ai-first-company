-- KI-Radar Database Schema
-- Supabase (PostgreSQL) — Frankfurt (EU)
-- Generated: 2026-02-27

-- ── Capability Taxonomy ────────────────────────────────────────────────
CREATE TABLE capability_taxonomy (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL,
  description_technical TEXT NOT NULL,
  description_plain     TEXT NOT NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed: 8 standard capability tags
INSERT INTO capability_taxonomy (slug, name, icon, description_technical, description_plain) VALUES
  ('reasoning-planning',  'Reasoning & Planning',     '🧠',
   'Chain-of-thought, multi-step reasoning, planning and decomposition capabilities.',
   'KI denkt Schritt für Schritt durch komplexe Probleme und plant Lösungswege.'),
  ('language-dialogue',   'Language & Dialogue',      '💬',
   'Natural language understanding, generation, multilingual capabilities, conversation quality.',
   'KI versteht und produziert natürliche Sprache — Texte, Übersetzungen, Gespräche.'),
  ('vision-multimodal',   'Vision & Multimodal',      '👁️',
   'Image understanding, video analysis, audio processing, cross-modal reasoning.',
   'KI verarbeitet Bilder, Videos und Audio — nicht nur Text.'),
  ('tool-use-agents',     'Tool Use & Agents',        '🔧',
   'Function calling, tool orchestration, autonomous agent loops, code execution.',
   'KI kann selbstständig handeln: Programme ausführen, APIs aufrufen, Aufgaben erledigen.'),
  ('memory-context',      'Memory & Context',         '🗄️',
   'Long context windows, persistent memory, retrieval-augmented generation (RAG).',
   'KI erinnert sich an längere Gespräche und greift auf externes Wissen zu.'),
  ('api-integration',     'API & Integration',        '🔌',
   'API releases, SDK updates, new integrations, deprecations, breaking changes.',
   'Neue Schnittstellen: Wie KI in bestehende Software integriert werden kann.'),
  ('performance-speed',   'Performance & Speed',      '⚡',
   'Inference speed, cost reduction, model compression, efficiency benchmarks.',
   'KI wird schneller und günstiger — wichtig für den produktiven Einsatz.'),
  ('safety-alignment',    'Safety & Alignment',       '🔒',
   'Red-teaming results, safety evaluations, Constitutional AI, guardrail updates.',
   'Wie sicher und zuverlässig sich KI verhält — wichtig für regulierte Branchen.');

-- ── Feed Items ─────────────────────────────────────────────────────────
CREATE TABLE feed_items (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type     TEXT NOT NULL CHECK (source_type IN (
                    'release_notes', 'github', 'arxiv', 'vc_news', 'industry_blog', 'hackernews'
                  )),
  source_name     TEXT NOT NULL,
  source_url      TEXT NOT NULL,
  title           TEXT NOT NULL,
  summary_short   TEXT,                        -- max 280 chars, auto-generated
  summary_plain   TEXT,                        -- simple-language explanation
  published_at    TIMESTAMPTZ NOT NULL,
  fetched_at      TIMESTAMPTZ DEFAULT NOW(),
  relevance_score FLOAT DEFAULT 0.5 CHECK (relevance_score BETWEEN 0 AND 1),
  language        TEXT DEFAULT 'en' CHECK (language IN ('en', 'de')),
  is_archived     BOOLEAN DEFAULT FALSE,
  -- Deduplication: same URL = same item
  CONSTRAINT feed_items_url_unique UNIQUE (source_url)
);

CREATE INDEX idx_feed_items_published  ON feed_items (published_at DESC);
CREATE INDEX idx_feed_items_source     ON feed_items (source_type);
CREATE INDEX idx_feed_items_archived   ON feed_items (is_archived);

-- ── Feed Item Tags ─────────────────────────────────────────────────────
CREATE TABLE feed_item_tags (
  feed_item_id  UUID REFERENCES feed_items(id) ON DELETE CASCADE,
  capability_id UUID REFERENCES capability_taxonomy(id) ON DELETE CASCADE,
  confidence    FLOAT NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  assigned_at   TIMESTAMPTZ DEFAULT NOW(),
  assigned_by   TEXT DEFAULT 'system' CHECK (assigned_by IN ('system', 'human')),
  PRIMARY KEY (feed_item_id, capability_id)
);

-- ── Problem Fields ─────────────────────────────────────────────────────
-- User-defined company problem areas for matching
-- SECURITY: RLS ensures user_id isolation (no IDOR)
CREATE TABLE problem_fields (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,  -- UUID, never sequential
  user_id     TEXT NOT NULL,                               -- Clerk user ID
  title       TEXT NOT NULL CHECK (char_length(title) <= 100),
  description TEXT CHECK (char_length(description) <= 500),
  industry    TEXT NOT NULL CHECK (industry IN (
                'automotive', 'pharma', 'finance',
                'mechanical_engineering', 'it_saas', 'other'
              )),
  priority    TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_problem_fields_user    ON problem_fields (user_id);
CREATE INDEX idx_problem_fields_active  ON problem_fields (user_id, is_active);

-- ── Problem Matches ────────────────────────────────────────────────────
CREATE TABLE problem_matches (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  problem_field_id UUID REFERENCES problem_fields(id) ON DELETE CASCADE,
  feed_item_id     UUID REFERENCES feed_items(id) ON DELETE CASCADE,
  confidence       FLOAT NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  match_method     TEXT DEFAULT 'keyword' CHECK (match_method IN ('keyword', 'semantic')),
  match_reason     TEXT CHECK (char_length(match_reason) <= 300),
  user_feedback    TEXT CHECK (user_feedback IN ('relevant', 'not_relevant')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT problem_matches_unique UNIQUE (problem_field_id, feed_item_id)
);

CREATE INDEX idx_problem_matches_field     ON problem_matches (problem_field_id);
CREATE INDEX idx_problem_matches_confidence ON problem_matches (confidence DESC);
CREATE INDEX idx_problem_matches_created   ON problem_matches (created_at DESC);
