/**
 * One-time seed script: creates a demo account for App Store reviewers.
 *
 * Usage:  node scripts/seed-review-account.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── 1. Create user ──────────────────────────────────────────────────────────

console.log('Creating reviewer account…');

const { data: userData, error: userError } =
  await supabase.auth.admin.createUser({
    email: 'review@pourdecisions.app',
    password: 'ReviewTest2026!',
    email_confirm: true,
  });

if (userError) {
  if (userError.message?.includes('already been registered')) {
    console.log('User already exists — fetching existing account…');
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existing = users.find((u) => u.email === 'review@pourdecisions.app');
    if (!existing) { console.error('Cannot find existing user'); process.exit(1); }
    var userId = existing.id;
  } else {
    console.error('Failed to create user:', userError.message);
    process.exit(1);
  }
} else {
  var userId = userData.user.id;
}

console.log('User ID:', userId);

// ── 2. Set up profile ───────────────────────────────────────────────────────

console.log('Updating profile…');

const { error: profileError } = await supabase
  .from('profiles')
  .update({
    username: 'pour_reviewer',
    display_name: 'Alex Review',
    bio: 'Exploring drinks one sip at a time 🥃',
    is_public: true,
    activity_visibility: 'public',
    has_seen_welcome: true,
    onboarding_step: 'complete',
  })
  .eq('user_id', userId);

if (profileError) {
  console.error('Profile update failed:', profileError.message);
  process.exit(1);
}

// ── 3. Log drinks ───────────────────────────────────────────────────────────

console.log('Logging drinks…');

const drinks = [
  // Wines
  {
    name: 'Caymus Cabernet Sauvignon 2021',
    type: 'wine',
    brand: 'Caymus Vineyards',
    rating: 5,
    notes: 'Rich dark cherry and cocoa with a velvety finish. Full-bodied with beautifully integrated tannins. A perfect pairing for grilled ribeye.',
    price: '$80-95 per bottle',
  },
  {
    name: 'Santa Margherita Pinot Grigio 2023',
    type: 'wine',
    brand: 'Santa Margherita',
    rating: 4,
    notes: 'Crisp and refreshing with notes of green apple and white peach. Clean mineral finish that makes it ideal for warm-weather sipping.',
    price: '$20-25 per bottle',
  },
  // Whiskeys
  {
    name: "Maker's Mark Bourbon",
    type: 'whiskey',
    brand: "Maker's Mark",
    rating: 4,
    notes: 'Smooth caramel and vanilla with a hint of toasted oak. Easy-drinking bourbon with a warm, gentle finish. Great neat or in an Old Fashioned.',
    price: '$28-35 per bottle',
  },
  {
    name: 'Suntory Toki',
    type: 'whiskey',
    brand: 'Suntory',
    rating: 4,
    notes: 'Delicate and subtly sweet with green apple and honey notes. Silky texture with a clean, slightly spicy finish. Perfect for a Japanese highball.',
    price: '$35-40 per bottle',
  },
  // Cocktails
  {
    name: 'Old Fashioned',
    type: 'cocktail',
    brand: 'The Violet Hour',
    rating: 5,
    notes: 'Perfectly balanced with rich bourbon, a touch of Demerara syrup, and aromatic bitters. The expressed orange peel adds a bright citrus lift.',
    price: '$16 per glass',
  },
  {
    name: 'Tommy\'s Margarita',
    type: 'cocktail',
    brand: 'Casa Mezcal',
    rating: 4,
    notes: 'Bright and citrus-forward with quality blanco tequila and fresh lime. Agave nectar keeps it smooth without being too sweet.',
    price: '$14 per glass',
  },
  // Beers
  {
    name: 'Pliny the Elder',
    type: 'beer',
    brand: 'Russian River Brewing',
    rating: 5,
    notes: 'Massive hop aroma of pine and citrus with a surprisingly balanced malt backbone. Dangerously drinkable for a double IPA. Lives up to the hype.',
    price: '$7-8 per can',
  },
  {
    name: 'Guinness Draught Stout',
    type: 'beer',
    brand: 'Guinness',
    rating: 3,
    notes: 'Classic roasted barley and dark chocolate flavors with a creamy nitrogen head. Light-bodied for a stout, making it very sessionable.',
    price: '$10-12 per four-pack',
  },
];

const drinkRows = drinks.map((d) => ({
  user_id: userId,
  name: d.name,
  type: d.type,
  brand: d.brand,
  rating: d.rating,
  notes: d.notes,
  price: d.price,
  image_url: null,
}));

const { data: insertedDrinks, error: drinksError } = await supabase
  .from('drinks')
  .insert(drinkRows)
  .select('id, name');

if (drinksError) {
  console.error('Drinks insert failed:', drinksError.message);
  process.exit(1);
}

console.log(`Inserted ${insertedDrinks.length} drinks`);

// Build a name→id lookup for collections
const drinkIdByName = Object.fromEntries(
  insertedDrinks.map((d) => [d.name, d.id]),
);

// ── 4. Create collections ───────────────────────────────────────────────────

console.log('Creating collections…');

const { data: collections, error: collError } = await supabase
  .from('collections')
  .insert([
    {
      user_id: userId,
      name: 'Top Shelf Favorites',
      description: 'The best drinks I\'ve had so far',
      icon: '⭐',
      cover_color: '#F59E0B',
      is_public: true,
    },
    {
      user_id: userId,
      name: 'Weekend Cocktails',
      description: 'Go-to cocktails for a relaxed weekend',
      icon: '🍸',
      cover_color: '#8B5CF6',
      is_public: true,
    },
  ])
  .select('id, name');

if (collError) {
  console.error('Collections insert failed:', collError.message);
  process.exit(1);
}

const collIdByName = Object.fromEntries(
  collections.map((c) => [c.name, c.id]),
);

// Top Shelf Favorites: Caymus, Pliny, Old Fashioned, Suntory Toki
const topShelfDrinks = [
  'Caymus Cabernet Sauvignon 2021',
  'Pliny the Elder',
  'Old Fashioned',
  'Suntory Toki',
];

// Weekend Cocktails: Old Fashioned, Tommy's Margarita
const weekendDrinks = [
  'Old Fashioned',
  "Tommy's Margarita",
];

const collectionDrinkRows = [
  ...topShelfDrinks.map((name, i) => ({
    collection_id: collIdByName['Top Shelf Favorites'],
    drink_id: drinkIdByName[name],
    position: i,
  })),
  ...weekendDrinks.map((name, i) => ({
    collection_id: collIdByName['Weekend Cocktails'],
    drink_id: drinkIdByName[name],
    position: i,
  })),
];

const { error: cdError } = await supabase
  .from('collection_drinks')
  .insert(collectionDrinkRows);

if (cdError) {
  console.error('Collection drinks insert failed:', cdError.message);
  process.exit(1);
}

console.log('Collections populated');

// ── 5. Follow the dev account ───────────────────────────────────────────────

console.log('Setting up follow…');

const { data: { users } } = await supabase.auth.admin.listUsers();
const devUser = users.find((u) => u.email === 'aryaadit123@gmail.com');

if (devUser) {
  const { error: followError } = await supabase
    .from('follows')
    .insert({
      follower_id: userId,
      following_id: devUser.id,
      status: 'accepted',
    });

  if (followError && !followError.message?.includes('duplicate')) {
    console.error('Follow insert failed:', followError.message);
  } else {
    console.log('Now following dev account');
  }
} else {
  console.warn('Dev account (aryaadit123@gmail.com) not found — skipping follow');
}

// ── Done ────────────────────────────────────────────────────────────────────

console.log('\n✅ Review account ready!');
console.log('   Email:    review@pourdecisions.app');
console.log('   Password: ReviewTest2026!');
console.log('   Username: @pour_reviewer');
