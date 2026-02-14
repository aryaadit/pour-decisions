# Barkeeply Database Schema

## Tables

### drinks
Core table for logged drinks.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | UUID | gen_random_uuid() | PK |
| user_id | UUID | | FK → auth.users, CASCADE |
| name | TEXT | | NOT NULL |
| type | TEXT | | NOT NULL, no CHECK (supports custom types) |
| brand | TEXT | | |
| rating | INTEGER | | CHECK 1-5 |
| notes | TEXT | | |
| location | TEXT | | |
| price | TEXT | | Free-form (e.g. "$30-50") |
| image_url | TEXT | | Supabase storage URL |
| date_added | TIMESTAMPTZ | now() | |
| created_at | TIMESTAMPTZ | now() | |
| updated_at | TIMESTAMPTZ | now() | Auto-updated by trigger |

**RLS:** Own CRUD + visibility-based SELECT (public/followers).
**Triggers:** `update_drinks_updated_at`, `on_drink_activity` (creates activity feed entries).

### profiles
User profiles, auto-created on signup via `handle_new_user` trigger.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | UUID | gen_random_uuid() | PK |
| user_id | UUID | | UNIQUE, FK → auth.users, CASCADE |
| display_name | TEXT | | |
| avatar_url | TEXT | | |
| default_drink_type | TEXT | | |
| default_sort_order | TEXT | 'date_desc' | |
| theme_preference | TEXT | 'system' | |
| username | TEXT | | UNIQUE, case-insensitive index |
| bio | TEXT | | |
| is_public | BOOLEAN | false | Profile discoverable |
| activity_visibility | TEXT | 'private' | CHECK: private/followers/public |
| analytics_enabled | BOOLEAN | true | Opt-out analytics |
| has_seen_welcome | BOOLEAN | false | Onboarding |
| onboarding_step | TEXT | 'welcome' | Onboarding |
| dismissed_onboarding_steps | TEXT[] | {} | Onboarding |
| created_at | TIMESTAMPTZ | now() | |
| updated_at | TIMESTAMPTZ | now() | |

**RLS:** Own SELECT/INSERT/UPDATE + admin SELECT/UPDATE.

### bug_reports

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | UUID | gen_random_uuid() | PK |
| user_id | UUID | | FK → auth.users, CASCADE |
| title | TEXT | | NOT NULL |
| description | TEXT | | NOT NULL |
| status | TEXT | 'open' | |
| image_url | TEXT | | |
| category | TEXT | 'general' | NOT NULL |
| created_at | TIMESTAMPTZ | now() | |
| updated_at | TIMESTAMPTZ | now() | |

**RLS:** Own INSERT/SELECT + admin SELECT/UPDATE/DELETE.

### user_roles

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | UUID | gen_random_uuid() | PK |
| user_id | UUID | | FK → auth.users, CASCADE |
| role | app_role | 'user' | ENUM: admin, user |
| created_at | TIMESTAMPTZ | now() | |

**Constraints:** UNIQUE(user_id, role).
**RLS:** Own SELECT + admin INSERT.

### custom_drink_types

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | UUID | gen_random_uuid() | PK |
| user_id | UUID | | FK → auth.users, CASCADE |
| name | TEXT | | NOT NULL |
| icon | TEXT | '🍹' | |
| color | TEXT | '#8B5CF6' | |
| created_at | TIMESTAMPTZ | now() | |

**RLS:** Own CRUD.

### analytics_events

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | UUID | gen_random_uuid() | PK |
| user_id | UUID | | Nullable (anonymous events) |
| session_id | UUID | | NOT NULL |
| event_name | TEXT | | NOT NULL |
| event_category | TEXT | | NOT NULL |
| properties | JSONB | {} | |
| device_info | JSONB | {} | |
| created_at | TIMESTAMPTZ | now() | |

**RLS:** INSERT (own or anonymous) + admin SELECT.

### collections

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | UUID | gen_random_uuid() | PK |
| user_id | UUID | | FK → auth.users, CASCADE |
| name | TEXT | | NOT NULL |
| description | TEXT | | |
| icon | TEXT | '📚' | |
| cover_color | TEXT | '#8B5CF6' | |
| share_id | UUID | gen_random_uuid() | UNIQUE, for sharing |
| is_public | BOOLEAN | false | |
| is_system | BOOLEAN | false | Legacy, unused |
| created_at | TIMESTAMPTZ | now() | |
| updated_at | TIMESTAMPTZ | now() | |

**RLS:** Own CRUD only. Public access via `collections_public` view.

### collection_drinks
Junction table linking drinks to collections.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | UUID | gen_random_uuid() | PK |
| collection_id | UUID | | FK → collections, CASCADE |
| drink_id | UUID | | FK → drinks, CASCADE |
| position | INTEGER | 0 | |
| added_at | TIMESTAMPTZ | now() | |

**Constraints:** UNIQUE(collection_id, drink_id).
**RLS:** Own collection CRUD. Public access via `collection_drinks_public` view.

### follows

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | UUID | gen_random_uuid() | PK |
| follower_id | UUID | | FK → auth.users, CASCADE |
| following_id | UUID | | FK → auth.users, CASCADE |
| status | TEXT | 'accepted' | CHECK: pending/accepted |
| created_at | TIMESTAMPTZ | now() | |

**Constraints:** UNIQUE(follower_id, following_id), CHECK(follower_id != following_id).
**RLS:** Own INSERT/DELETE + SELECT where involved.

### activity_feed
Auto-populated by trigger on drinks INSERT/UPDATE.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | UUID | gen_random_uuid() | PK |
| user_id | UUID | | FK → auth.users, CASCADE |
| activity_type | TEXT | | CHECK: drink_added/drink_rated |
| drink_id | UUID | | FK → drinks, CASCADE |
| metadata | JSONB | {} | name, type, rating, image_url, notes, location |
| created_at | TIMESTAMPTZ | now() | |

**RLS:** Own SELECT + followed users (non-private visibility) SELECT + own INSERT.
**Realtime:** Enabled.

## Views

| View | Security | Purpose |
|------|----------|---------|
| profiles_public | security_invoker=false | Public profile data (username IS NOT NULL) |
| drinks_public | security_invoker=false | Drinks filtered by owner's activity_visibility |
| collections_public | security_invoker=false | Public collections only |
| collection_drinks_public | security_invoker=false | Drinks in public collections |

## Functions

| Function | Type | Purpose |
|----------|------|---------|
| update_updated_at_column() | TRIGGER | Auto-update updated_at |
| handle_new_user() | TRIGGER | Auto-create profile on signup |
| has_role(uuid, app_role) | QUERY | Check user role (SECURITY DEFINER) |
| is_following(uuid, uuid) | QUERY | Check follow relationship (SECURITY DEFINER) |
| get_activity_visibility(uuid) | QUERY | Get user's visibility setting (SECURITY DEFINER) |
| create_drink_activity() | TRIGGER | Auto-populate activity feed |
| get_trending_drinks(int, int) | RPC | Trending drinks across platform |

## Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| avatars | Yes | Profile pictures |
| drink-images | Yes | Drink photos |
| bug-attachments | No | Bug report screenshots (admin + own access) |

All buckets restrict uploads to authenticated users within their own user-id folder.

## Enum Types

- `app_role`: `admin`, `user`
