ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
CREATE POLICY "Users can view their own preferences"
ON "public"."user_preferences" FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
CREATE POLICY "Users can update their own preferences"
ON "public"."user_preferences" FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
