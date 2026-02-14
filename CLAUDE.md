# CLAUDE.md — Pour Decisions (Barkeeply)

## Project Overview

Pour Decisions is a mobile-first drink logging and social discovery app. Users log drinks they try (wine, whiskey, beer, etc.), rate them, and build a taste profile. The app has a social layer where users follow friends, see what they're drinking, and discover new drinks through their network.

The app is **log-first** — each drink entry is a self-contained log, not linked to a canonical drink database. There is no master drink catalog. Matching across users is done via fuzzy matching on name + type + brand.

**Primary target: Mobile (iOS and Android via Capacitor)**. There is a web version at barkeeply.com but mobile is the priority. Every decision should optimize for the mobile experience.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Query (TanStack Query) for all server state
- **Backend**: Supabase (Postgres database, Auth, Storage, Row Level Security)
- **Mobile**: Capacitor (iOS + Android native wrappers)
- **Package Manager**: Bun (bun.lockb)

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── ui/           # shadcn/ui base components
│   └── ...           # Feature-specific components
├── hooks/            # Custom React hooks (React Query wrappers)
├── pages/            # Route-level page components
├── services/         # Supabase service modules (data access layer)
├── lib/              # Utilities, helpers, constants
├── types/            # TypeScript type definitions
└── App.tsx           # Root component with routing
supabase/
└── migrations/       # Database migration files
ios/                  # Capacitor iOS project
android/              # Capacitor Android project
```

## Architecture Principles

### Service Layer Pattern
All Supabase calls go through dedicated service modules in `src/services/`. Components and hooks NEVER call Supabase directly. Services include: drinkLogService, feedService, profileService, profileStatsService, collectionService, followService, storageService, adminService, customDrinkTypeService.

### React Query for Server State
All data fetching and mutations use React Query. Key conventions:
- Query keys are defined centrally in `src/lib/queryKeys.ts`
- Stale times are set per query type (drinks list: 5min, feed: 1-2min, profile: 5min)
- Use `staleWhileRevalidate` pattern — show cached data immediately, refresh in background
- Invalidate related queries after mutations
- No full-screen loading spinners — use skeleton states or show cached data

### Component Architecture
- Pages are thin orchestrators — they compose smaller components and wire up hooks
- Components should be small and focused (under 300 lines, ideally under 200)
- Extract reusable pieces: drink cards, rating stars, feed items, collection cards, etc.
- Every component handles its own loading, error, and empty states
- Use React.memo on expensive list item components

## Coding Standards

### TypeScript
- **Strict mode**: Always use strict TypeScript. No `any` types except as a last resort with a comment explaining why.
- **Interfaces over types** for object shapes. Use `type` for unions, intersections, and utility types.
- **Explicit return types** on all service functions and hooks.
- **No non-null assertions** (`!`). Handle null/undefined explicitly.
- **Enums**: Prefer string literal unions over enums (`type DrinkType = 'wine' | 'whiskey' | 'beer'`).

### React
- **Functional components only**. No class components.
- **Named exports** for components. Default exports only for pages (for lazy loading).
- **Custom hooks** for any logic that involves state, effects, or data fetching. Components should primarily render UI.
- **Avoid inline function definitions** in JSX where they cause unnecessary re-renders. Use useCallback for callbacks passed to child components.
- **Avoid inline object creation** in JSX props (causes new reference every render).
- **Dependency arrays**: Always complete and correct on useEffect, useMemo, useCallback. No eslint-disable for exhaustive-deps.
- **No useEffect for derived state**. Use useMemo instead.
- **Error boundaries**: Wrap major page sections in error boundaries so a failure in one section doesn't crash the whole page.

### File Naming
- Components: PascalCase (`DrinkCard.tsx`, `TasteProfile.tsx`)
- Hooks: camelCase with `use` prefix (`useDrinkLogs.ts`, `useProfile.ts`)
- Services: camelCase with `Service` suffix (`drinkLogService.ts`, `feedService.ts`)
- Utils/helpers: camelCase (`formatDate.ts`, `drinkMatching.ts`)
- Types: PascalCase (`DrinkLog.ts`, `UserProfile.ts`)
- One component per file. If a component needs helper sub-components, they go in the same directory.

### Code Organization
- **Imports**: Group and order imports — React first, third-party libs, then internal (services, hooks, components, utils, types). Separate groups with a blank line.
- **No dead code**. Don't comment out code and leave it. Delete it. Git has history.
- **No console.log in committed code** except for error logging in catch blocks.
- **Constants**: Magic numbers and strings go in constants files, not inline.
- **DRY but not prematurely abstract**. Don't create abstractions until a pattern appears at least 3 times.

### CSS / Tailwind
- **Tailwind utility classes** for all styling. No inline styles except for truly dynamic values.
- **No custom CSS** unless Tailwind can't achieve it.
- **Consistent spacing**: Use Tailwind's spacing scale (p-4, gap-3, etc.), don't mix arbitrary values.
- **Mobile-first**: Write base styles for mobile, use responsive breakpoints (md:, lg:) for larger screens only when needed.
- **Dark theme**: The app uses a dark color scheme. All UI must look correct on dark backgrounds. Test contrast.

### Error Handling
- **Service functions**: Always use try/catch. Return typed error objects, don't throw.
- **React Query**: Use `onError` callbacks for user-facing error toasts. Use error boundaries for unexpected failures.
- **User-facing errors**: Show friendly messages with retry options. Never show raw error messages, stack traces, or technical details.
- **Network errors**: Always handle offline/timeout states gracefully. Show "Something went wrong, tap to retry" not a blank screen.
- **Form validation**: Validate on submit, highlight specific fields, show error messages near the problematic field.

### Performance
- **No unnecessary re-renders**. Profile with React DevTools if something feels slow.
- **Lazy load pages** with React.lazy and Suspense.
- **Virtualize long lists** if they exceed ~50 items (react-virtual or similar).
- **Debounce search inputs** (300ms).
- **Optimize images**: Lazy load images in lists, use appropriate sizes (thumbnails in lists, full-size in detail views), show placeholders while loading.
- **No animations that add perceived latency**. If an animation makes something feel slower, remove it. Max 150ms for modal/sheet open transitions.
- **Bundle splitting**: Keep page-level code in separate chunks. Don't import heavy libraries globally.

### Git
- **Conventional commits**: Use prefixes — `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `perf:`, `style:`
- **Small, focused commits**. One logical change per commit.
- **Branch naming**: `feature/`, `fix/`, `refactor/`, `chore/` prefixes.
- **Always ensure the build passes** before committing.

## Data Model

The app is log-first. Key concepts:

- **Drink Log**: The core entity. A self-contained record of a drink someone had. Fields: name, type, rating, brand/producer, tasting_notes, location, price, photo, date, user_id.
- **User Profile**: Display name, username, avatar, bio. Stats are computed from logs.
- **Follow Relationship**: Directional — user A follows user B. Powers the feed and network features.
- **Collection**: User-created grouping of drink logs. Can be public or private. Public collections appear on the user's profile.
- **Feed**: Activity stream of drink logs from users you follow.

### Supabase / Database Rules
- **Row Level Security (RLS)** is enabled on all tables. Every table must have appropriate policies.
- A user should only see their own drinks on their Home page. Other users' drinks are visible only through the feed or public profiles.
- Private collections are never visible to other users at any layer (RLS + UI).
- Follow relationships can only be created/deleted by the authenticated user.
- Always include user_id filters in queries for user-specific data — don't rely solely on RLS as the only line of defense.

## Mobile / Capacitor Guidelines

- **Touch targets**: Minimum 44×44pt for all interactive elements.
- **Safe areas**: Respect iOS notch/Dynamic Island and bottom home indicator. Content must not be hidden under system UI.
- **Keyboard handling**: Forms must scroll properly when keyboard is open. Submit buttons must remain reachable. Keyboard should dismiss when tapping outside inputs.
- **iOS swipe-back**: Ensure back gesture works on all screens.
- **Pull-to-refresh**: Available on all main scrollable lists (Home, Feed, Collections).
- **Haptic feedback**: Use sparingly for meaningful interactions if available through Capacitor plugins.
- **Platform testing**: Always test changes on both iOS and Android. Capacitor apps can behave differently across platforms.

## AI-Generated Content Standards

When the app uses AI to auto-populate drink information:

### Tasting Notes
- **2-3 sentences maximum**. No exceptions.
- First sentence: primary flavor profile. Second: style/character context. Optional third: pairing or serving suggestion.
- Tone: knowledgeable but approachable. Not pretentious, not overly casual.
- Consistent format regardless of drink type.

### Naming
- Wines: Full name with vintage — "Château Margaux 2015"
- Whiskey: Full expression — "Lagavulin 16 Year"
- Beer: Brand + product — "Sierra Nevada Pale Ale"
- Title Case always.

### Price
- Format as range when exact price unknown: "$15-30 per bottle"
- Use appropriate unit: "per bottle", "per glass", "per can", "per pour"
- Leave empty if not determinable — don't guess.

### Brand/Producer
- Just the name: "Royal Tokaji", "Lagavulin", "Sierra Nevada"
- No additional descriptors.

### Rating
- **Never AI-generated.** Rating is always and only the user's personal input.

## Product Context

- The app has under 20 active users currently. Features should feel great for a small group.
- The profile is designed to be a shareable "taste identity" — like Spotify Wrapped for drinks.
- Collections serve as user-curated groupings (trips, events, tastings). Public collections appear on the profile.
- The social feed shows activity from followed users. Keep it simple — no algorithmic ranking.
- The taste profile (type breakdown, rating style) is computed from the user's logs.
- Future direction: taste profiling with structured flavor tags, recommendations, ranked lists, shareable profiles with Open Graph previews.

## What NOT to Do

- Don't add features without being asked. Suggest improvements but wait for approval.
- Don't add animations or transitions that slow down the experience.
- Don't use `any` types.
- Don't put Supabase calls in components. Use the service layer.
- Don't create God components. If a file exceeds 300 lines, it probably needs to be split.
- Don't leave TODO comments without filing them as issues.
- Don't ignore TypeScript errors or use ts-ignore.
- Don't make schema changes without creating a proper Supabase migration.
- Don't assume desktop-first. Think mobile-first, always.
- Don't add new dependencies without justification. Prefer what's already in the project.
