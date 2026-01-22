-- Fix the user creation trigger by setting proper search path and ensuring it runs with elevated privileges

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Recreate function with proper security settings
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  INSERT INTO public.playback_state (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, just return
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also add policy to allow service role to insert profiles
CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can insert playback state" ON playback_state
  FOR INSERT TO service_role
  WITH CHECK (true);
