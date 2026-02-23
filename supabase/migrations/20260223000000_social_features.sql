-- =============================================================================
-- Social Features: Follow Requests, Notifications, Suggested Users
-- =============================================================================

-- ─── 1. FOLLOW REQUESTS TABLE ─────────────────────────────────────────────────

CREATE TABLE public.follow_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone,
  UNIQUE (requester_id, target_id),
  CHECK (requester_id != target_id)
);

CREATE INDEX follow_requests_requester_id_idx ON public.follow_requests (requester_id);
CREATE INDEX follow_requests_target_id_idx ON public.follow_requests (target_id);
CREATE INDEX follow_requests_pending_idx ON public.follow_requests (target_id, status)
  WHERE status = 'pending';

ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own follow requests"
  ON public.follow_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = target_id);

CREATE POLICY "Users can create follow requests"
  ON public.follow_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can respond to or cancel follow requests"
  ON public.follow_requests FOR UPDATE
  USING (auth.uid() = target_id OR auth.uid() = requester_id);

CREATE POLICY "Users can delete their outgoing requests"
  ON public.follow_requests FOR DELETE
  USING (auth.uid() = requester_id);

-- ─── 2. NOTIFICATIONS TABLE ──────────────────────────────────────────────────

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL
    CHECK (type IN ('new_follower', 'follow_request', 'follow_accepted', 'drink_logged')),
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_unread_idx ON public.notifications (user_id) WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- System inserts via SECURITY DEFINER triggers; direct insert allowed for actor
CREATE POLICY "Actors can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = actor_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ─── 3. TRIGGERS ──────────────────────────────────────────────────────────────

-- 3a. When a follow request is accepted, create the follow and notification
CREATE OR REPLACE FUNCTION public.handle_follow_request_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when status changes to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    NEW.responded_at = now();

    -- Create the actual follow relationship
    INSERT INTO public.follows (follower_id, following_id, status)
    VALUES (NEW.requester_id, NEW.target_id, 'accepted')
    ON CONFLICT (follower_id, following_id) DO NOTHING;

    -- Notify the requester that their request was accepted
    INSERT INTO public.notifications (user_id, type, actor_id, reference_id)
    VALUES (NEW.requester_id, 'follow_accepted', NEW.target_id, NEW.id);
  END IF;

  IF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    NEW.responded_at = now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_follow_request_response
  BEFORE UPDATE ON public.follow_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_follow_request_response();

-- 3b. Notify target when a new follow request is created
CREATE OR REPLACE FUNCTION public.handle_new_follow_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, actor_id, reference_id)
  VALUES (NEW.target_id, 'follow_request', NEW.requester_id, NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_follow_request
  AFTER INSERT ON public.follow_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_follow_request();

-- 3c. Notify followed user when a new follow is created (direct follows only)
CREATE OR REPLACE FUNCTION public.handle_new_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' THEN
    -- Only notify if this wasn't from a follow request acceptance
    -- (follow_request trigger already sends follow_accepted notification)
    IF NOT EXISTS (
      SELECT 1 FROM public.follow_requests
      WHERE requester_id = NEW.follower_id
        AND target_id = NEW.following_id
        AND status = 'accepted'
    ) THEN
      INSERT INTO public.notifications (user_id, type, actor_id, reference_id)
      VALUES (NEW.following_id, 'new_follower', NEW.follower_id, NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_follow();

-- 3d. Notify followers when a drink is logged
CREATE OR REPLACE FUNCTION public.notify_followers_of_drink()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _visibility text;
BEGIN
  SELECT COALESCE(activity_visibility, 'private')
  INTO _visibility
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  -- Only notify if activity is visible to followers or public
  IF _visibility IN ('followers', 'public') THEN
    INSERT INTO public.notifications (user_id, type, actor_id, reference_id, metadata)
    SELECT
      f.follower_id,
      'drink_logged',
      NEW.user_id,
      NEW.id,
      jsonb_build_object('drink_name', NEW.name, 'drink_type', NEW.type)
    FROM public.follows f
    WHERE f.following_id = NEW.user_id
      AND f.status = 'accepted';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_drink_notify_followers
  AFTER INSERT ON public.drinks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_of_drink();

-- ─── 4. RPC: SUGGESTED USERS ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_suggested_users(_user_id uuid, _limit int DEFAULT 5)
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  is_public boolean,
  activity_visibility text,
  created_at timestamp with time zone,
  recent_drink_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.is_public,
    p.activity_visibility,
    p.created_at,
    COUNT(d.id) AS recent_drink_count
  FROM public.profiles p
  LEFT JOIN public.drinks d
    ON d.user_id = p.user_id
    AND d.created_at > now() - interval '30 days'
  WHERE p.is_public = true
    AND p.username IS NOT NULL
    AND p.user_id != _user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.follows
      WHERE follower_id = _user_id AND following_id = p.user_id
    )
  GROUP BY p.user_id, p.username, p.display_name, p.avatar_url,
           p.bio, p.is_public, p.activity_visibility, p.created_at
  HAVING COUNT(d.id) > 0
  ORDER BY COUNT(d.id) DESC
  LIMIT _limit;
$$;
