-- KI-Radar Row Level Security Policies
-- SECURITY: User A NEVER sees User B's data
-- Generated: 2026-02-27

-- ── Feed Items: Public read, system write ─────────────────────────────
-- Feed items are not user-specific — all authenticated users see the same feed
ALTER TABLE feed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE capability_taxonomy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feed_items_read_authenticated"
  ON feed_items FOR SELECT
  TO authenticated
  USING (true);

-- Write only via service role (server-side aggregation)
CREATE POLICY "feed_items_write_service_role"
  ON feed_items FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "feed_item_tags_read_authenticated"
  ON feed_item_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "feed_item_tags_write_service_role"
  ON feed_item_tags FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "capability_taxonomy_read_authenticated"
  ON capability_taxonomy FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "capability_taxonomy_write_service_role"
  ON capability_taxonomy FOR ALL
  TO service_role
  USING (true);

-- ── Problem Fields: Strict user isolation ─────────────────────────────
ALTER TABLE problem_fields ENABLE ROW LEVEL SECURITY;

-- User sees only their own problem fields
CREATE POLICY "problem_fields_select_own"
  ON problem_fields FOR SELECT
  TO authenticated
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "problem_fields_insert_own"
  ON problem_fields FOR INSERT
  TO authenticated
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "problem_fields_update_own"
  ON problem_fields FOR UPDATE
  TO authenticated
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "problem_fields_delete_own"
  ON problem_fields FOR DELETE
  TO authenticated
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Service role can manage all (for background matching jobs)
CREATE POLICY "problem_fields_service_role"
  ON problem_fields FOR ALL
  TO service_role
  USING (true);

-- ── Problem Matches: Via problem field ownership ───────────────────────
ALTER TABLE problem_matches ENABLE ROW LEVEL SECURITY;

-- User sees matches only for their own problem fields
CREATE POLICY "problem_matches_select_own"
  ON problem_matches FOR SELECT
  TO authenticated
  USING (
    problem_field_id IN (
      SELECT id FROM problem_fields
      WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "problem_matches_update_feedback_own"
  ON problem_matches FOR UPDATE
  TO authenticated
  USING (
    problem_field_id IN (
      SELECT id FROM problem_fields
      WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- Service role manages all matches (background job inserts)
CREATE POLICY "problem_matches_service_role"
  ON problem_matches FOR ALL
  TO service_role
  USING (true);
