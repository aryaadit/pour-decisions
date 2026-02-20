# Pour Decisions

A mobile-first drink logging and social discovery app. Log drinks you try, rate them, build your taste profile, and see what your friends are drinking.

## What It Does

- **Log drinks** — Snap a photo and AI identifies the drink, auto-filling name, type, brand, tasting notes, and price. Or enter manually.
- **Build your taste profile** — Your profile shows your taste signature, top drinks by category, and drinking stats.
- **Follow friends** — See what others are drinking in your feed. Discover new drinks through your network.
- **Create collections** — Organize drinks by trip, occasion, or theme. Make collections public to share on your profile.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Postgres, Auth, Storage, Edge Functions, Row Level Security)
- **Mobile**: Capacitor (iOS + Android)
- **AI**: Google Gemini for drink photo recognition

## Project Structure

```
src/
├── components/       # UI components
│   ├── ui/           # shadcn/ui base components
│   └── ...           # Feature components
├── hooks/            # React Query hooks and custom hooks
├── pages/            # Route-level pages
├── services/         # Supabase data access layer
├── lib/              # Utilities, constants, query keys
├── types/            # TypeScript type definitions
└── contexts/         # React context providers
supabase/
├── migrations/       # Database schema (single clean migration)
├── functions/        # Edge functions (drink lookup)
└── config.toml       # Supabase project config
ios/                  # Capacitor iOS project
android/              # Capacitor Android project
```

## Getting Started

### Prerequisites

- Node.js 18+
- [Bun](https://bun.sh/) (package manager)
- A Supabase project with the schema applied
- A Google Gemini API key (for drink recognition)
- Xcode (for iOS builds)
- Android Studio (for Android builds)

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/aryaadit/barkeeply.git
   cd barkeeply
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Set up environment variables — create a `.env` file:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Apply the database schema:
   ```bash
   supabase link --project-ref your_project_ref
   supabase db push
   ```

5. Deploy the edge function:
   ```bash
   supabase functions deploy lookup-drink
   ```

6. Set the Gemini API key as a Supabase secret:
   ```bash
   supabase secrets set GEMINI_API_KEY=your_gemini_key
   ```

7. Run the dev server:
   ```bash
   bun run dev
   ```

### Mobile Builds

**iOS:**
```bash
bun run build
npx cap sync ios
npx cap open ios
```
Then archive and upload to TestFlight from Xcode.

**Android:**
```bash
bun run build
npx cap sync android
npx cap open android
```
Then generate a signed AAB from Android Studio.

## Architecture

- **Service layer**: All Supabase calls go through dedicated service modules. Components never call Supabase directly.
- **React Query**: All server state managed through TanStack Query with centralized query keys and configured stale times.
- **Row Level Security**: Enabled on all tables. Service layer also includes user_id filtering as defense-in-depth.
- **Log-first data model**: Each drink entry is a standalone log, not linked to a canonical drink database. Cross-user matching uses fuzzy matching on name, type, and brand.

## License

Private — all rights reserved.

See CREDENTIALS.md (local only, not tracked by git) for passwords and review account info.