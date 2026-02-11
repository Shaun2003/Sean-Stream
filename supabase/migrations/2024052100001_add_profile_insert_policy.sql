CREATE POLICY "Users can create own profile" ON "public"."users_profile" FOR INSERT WITH CHECK (auth.uid() = id);
