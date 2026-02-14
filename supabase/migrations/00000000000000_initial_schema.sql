-- =============================================================================
-- Barkeeply: Initial Schema (consolidated from 40 migrations)
-- =============================================================================

-- ─── ENUMS ──────────────────────────────────────────────────────────────────────

CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- ─── GENERIC HELPER FUNCTIONS ───────────────────────────────────────────────────

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ─── TABLES (no cross-table function dependencies) ──────────────────────────────

-- 1. Drinks
CREATE TABLE public.drinks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  brand TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  location TEXT,
  price TEXT,
  image_url TEXT,
  date_added TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.drinks ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_drinks_updated_at
  BEFORE UPDATE ON public.drinks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Basic drink policies (visibility policies added after helper functions)
CREATE POLICY "Users can view their own drinks"
  ON public.drinks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own drinks"
  ON public.drinks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drinks"
  ON public.drinks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drinks"
  ON public.drinks FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  default_drink_type TEXT,
  default_sort_order TEXT DEFAULT 'date_desc',
  theme_preference TEXT DEFAULT 'system',
  username TEXT UNIQUE,
  bio TEXT,
  is_public BOOLEAN DEFAULT false,
  activity_visibility TEXT DEFAULT 'private' CHECK (activity_visibility IN ('private', 'followers', 'public')),
  analytics_enabled BOOLEAN DEFAULT true,
  has_seen_welcome BOOLEAN DEFAULT false,
  onboarding_step TEXT DEFAULT 'welcome',
  dismissed_onboarding_steps TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX profiles_username_lower_idx ON public.profiles (LOWER(username));
CREATE INDEX profiles_username_idx ON public.profiles (username) WHERE username IS NOT NULL;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. User Roles (needed before has_role function)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Follows (needed before is_following function)
CREATE TABLE public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX follows_follower_id_idx ON public.follows (follower_id);
CREATE INDEX follows_following_id_idx ON public.follows (following_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

CREATE POLICY "Users can see their own follows"
  ON public.follows FOR SELECT
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- 5. Activity Feed
CREATE TABLE public.activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('drink_added', 'drink_rated')),
  drink_id uuid REFERENCES public.drinks(id) ON DELETE CASCADE,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX activity_feed_user_id_idx ON public.activity_feed (user_id);
CREATE INDEX activity_feed_created_at_idx ON public.activity_feed (created_at DESC);

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own activity"
  ON public.activity_feed FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity"
  ON public.activity_feed FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for activity feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_feed;

-- 6. Bug Reports
CREATE TABLE public.bug_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own bug reports"
  ON public.bug_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own bug reports"
  ON public.bug_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE TRIGGER update_bug_reports_updated_at
  BEFORE UPDATE ON public.bug_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Custom Drink Types
CREATE TABLE public.custom_drink_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🍹',
  color TEXT NOT NULL DEFAULT '#8B5CF6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_custom_drink_types_user_id ON public.custom_drink_types(user_id);

ALTER TABLE public.custom_drink_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own custom drink types"
  ON public.custom_drink_types FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom drink types"
  ON public.custom_drink_types FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom drink types"
  ON public.custom_drink_types FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom drink types"
  ON public.custom_drink_types FOR DELETE
  USING (auth.uid() = user_id);

-- 8. Analytics Events
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id UUID NOT NULL,
  event_name TEXT NOT NULL,
  event_category TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  device_info JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_analytics_user_id ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_event_name ON public.analytics_events(event_name);
CREATE INDEX idx_analytics_created_at ON public.analytics_events(created_at);
CREATE INDEX idx_analytics_session ON public.analytics_events(session_id);
CREATE INDEX idx_analytics_category ON public.analytics_events(event_category);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- 9. Collections
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📚',
  cover_color TEXT DEFAULT '#8B5CF6',
  share_id UUID UNIQUE DEFAULT gen_random_uuid(),
  is_public BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own collections"
  ON public.collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own collections"
  ON public.collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
  ON public.collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
  ON public.collections FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Collection Drinks (junction table)
CREATE TABLE public.collection_drinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE NOT NULL,
  drink_id UUID REFERENCES public.drinks(id) ON DELETE CASCADE NOT NULL,
  position INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(collection_id, drink_id)
);

ALTER TABLE public.collection_drinks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view drinks in their collections"
  ON public.collection_drinks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE id = collection_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add drinks to their collections"
  ON public.collection_drinks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE id = collection_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update drink positions in their collections"
  ON public.collection_drinks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE id = collection_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove drinks from their collections"
  ON public.collection_drinks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE id = collection_id AND user_id = auth.uid()
    )
  );

-- ─── CROSS-TABLE FUNCTIONS (tables must exist first) ────────────────────────────

-- Check if a user has a specific role (SECURITY DEFINER avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Check if one user follows another
CREATE OR REPLACE FUNCTION public.is_following(_follower_id uuid, _following_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.follows
    WHERE follower_id = _follower_id
      AND following_id = _following_id
      AND status = 'accepted'
  )
$$;

-- Get a user's activity visibility setting
CREATE OR REPLACE FUNCTION public.get_activity_visibility(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(activity_visibility, 'private')
  FROM public.profiles
  WHERE user_id = _user_id
$$;

-- ─── POLICIES THAT DEPEND ON CROSS-TABLE FUNCTIONS ──────────────────────────────

-- Admin policies (depend on has_role)
CREATE POLICY "Only admins can insert user roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all bug reports"
  ON public.bug_reports FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all bug reports"
  ON public.bug_reports FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bug reports"
  ON public.bug_reports FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all analytics events"
  ON public.analytics_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Visibility-based drink access (depends on get_activity_visibility, is_following)
CREATE POLICY "Users can view drinks based on activity visibility"
  ON public.drinks FOR SELECT
  USING (
    auth.uid() = user_id
    OR get_activity_visibility(user_id) = 'public'
    OR (get_activity_visibility(user_id) = 'followers' AND is_following(auth.uid(), user_id))
  );

-- Activity feed visibility (depends on is_following, get_activity_visibility)
CREATE POLICY "Users can see followed users activity"
  ON public.activity_feed FOR SELECT
  USING (
    public.is_following(auth.uid(), user_id)
    AND public.get_activity_visibility(user_id) IN ('public', 'followers')
  );

-- ─── ACTIVITY TRIGGER ───────────────────────────────────────────────────────────

-- Auto-populate activity feed when drinks are added/rated
CREATE OR REPLACE FUNCTION public.create_drink_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_feed (user_id, activity_type, drink_id, metadata)
    VALUES (NEW.user_id, 'drink_added', NEW.id, jsonb_build_object(
      'name', NEW.name,
      'type', NEW.type,
      'rating', NEW.rating,
      'image_url', NEW.image_url,
      'notes', NEW.notes,
      'location', NEW.location
    ));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.rating IS DISTINCT FROM NEW.rating AND NEW.rating IS NOT NULL THEN
      INSERT INTO public.activity_feed (user_id, activity_type, drink_id, metadata)
      VALUES (NEW.user_id, 'drink_rated', NEW.id, jsonb_build_object(
        'name', NEW.name,
        'type', NEW.type,
        'rating', NEW.rating,
        'old_rating', OLD.rating,
        'image_url', NEW.image_url,
        'notes', NEW.notes
      ));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_drink_activity
  AFTER INSERT OR UPDATE ON public.drinks
  FOR EACH ROW
  EXECUTE FUNCTION public.create_drink_activity();

-- ─── VIEWS ──────────────────────────────────────────────────────────────────────

-- Public profiles view (bypasses RLS; view definition is the security boundary)
CREATE VIEW public.profiles_public AS
SELECT
  user_id,
  username,
  display_name,
  avatar_url,
  bio,
  is_public,
  activity_visibility,
  created_at
FROM public.profiles
WHERE username IS NOT NULL;

GRANT SELECT ON public.profiles_public TO authenticated;

-- Public drinks view (bypasses RLS; visibility logic in view definition)
CREATE VIEW public.drinks_public AS
SELECT
  d.id,
  d.user_id,
  d.name,
  d.type,
  d.rating,
  d.image_url,
  d.date_added,
  d.brand,
  d.created_at
FROM public.drinks d
JOIN public.profiles p ON p.user_id = d.user_id
WHERE
  d.user_id = auth.uid()
  OR p.activity_visibility = 'public'
  OR (
    p.activity_visibility = 'followers'
    AND public.is_following(auth.uid(), d.user_id)
  );

GRANT SELECT ON public.drinks_public TO authenticated;
GRANT SELECT ON public.drinks_public TO anon;

-- Public collections view (bypasses RLS; filters to public only)
CREATE VIEW public.collections_public AS
SELECT
  id,
  share_id,
  is_public,
  created_at,
  updated_at,
  name,
  description,
  icon,
  cover_color
FROM public.collections
WHERE is_public = true;

GRANT SELECT ON public.collections_public TO anon;
GRANT SELECT ON public.collections_public TO authenticated;

-- Public collection drinks view (bypasses RLS; only public collection drinks)
CREATE VIEW public.collection_drinks_public AS
SELECT
  cd.collection_id,
  cd.drink_id,
  cd.position,
  cd.added_at
FROM public.collection_drinks cd
INNER JOIN public.collections c ON c.id = cd.collection_id
WHERE c.is_public = true;

GRANT SELECT ON public.collection_drinks_public TO anon;
GRANT SELECT ON public.collection_drinks_public TO authenticated;

-- ─── RPC FUNCTIONS ──────────────────────────────────────────────────────────────

-- Trending drinks across the platform
CREATE OR REPLACE FUNCTION public.get_trending_drinks(days int DEFAULT 7, lim int DEFAULT 10)
RETURNS TABLE (
  drink_name text,
  drink_type text,
  log_count bigint,
  avg_rating numeric,
  sample_image text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    metadata->>'name',
    metadata->>'type',
    count(*),
    avg((metadata->>'rating')::numeric),
    (array_agg(metadata->>'image_url' ORDER BY created_at DESC))[1]
  FROM activity_feed
  WHERE activity_type = 'drink_added'
    AND created_at > now() - make_interval(days => days)
  GROUP BY metadata->>'name', metadata->>'type'
  ORDER BY count(*) DESC
  LIMIT lim;
$$;

-- ─── STORAGE BUCKETS ────────────────────────────────────────────────────────────

-- Avatars (public read, authenticated upload to own folder)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Drink images (public read, authenticated upload to own folder)
INSERT INTO storage.buckets (id, name, public)
VALUES ('drink-images', 'drink-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own drink images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'drink-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own drink images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'drink-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own drink images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'drink-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Bug attachments (private bucket, restricted read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('bug-attachments', 'bug-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload bug attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'bug-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can view bug attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'bug-attachments'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view their own bug attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'bug-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
