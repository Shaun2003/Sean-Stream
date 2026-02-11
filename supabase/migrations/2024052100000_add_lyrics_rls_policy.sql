ALTER TABLE track_lyrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON "public"."track_lyrics" FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON "public"."track_lyrics" FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON "public"."track_lyrics" FOR UPDATE WITH CHECK (auth.role() = 'authenticated');