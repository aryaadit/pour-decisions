export const queryKeys = {
  drinks: {
    all: ['drinks'] as const,
    list: (userId: string) => ['drinks', 'list', userId] as const,
    detail: (id: string) => ['drinks', 'detail', id] as const,
    public: (id: string) => ['drinks', 'public', id] as const,
  },
  collections: {
    all: ['collections'] as const,
    list: (userId: string) => ['collections', 'list', userId] as const,
    detail: (id: string) => ['collections', 'detail', id] as const,
    drinks: (collectionId: string) => ['collections', 'drinks', collectionId] as const,
    public: (shareId: string) => ['collections', 'public', shareId] as const,
    forDrink: (drinkId: string) => ['collections', 'forDrink', drinkId] as const,
    publicByUser: (userId: string) => ['collections', 'publicByUser', userId] as const,
  },
  customDrinkTypes: {
    all: ['customDrinkTypes'] as const,
    list: (userId: string) => ['customDrinkTypes', 'list', userId] as const,
  },
  follows: {
    all: ['follows'] as const,
    status: (followerId: string, followingId: string) =>
      ['follows', 'status', followerId, followingId] as const,
    counts: (userId: string) => ['follows', 'counts', userId] as const,
    followers: (userId: string) => ['follows', 'followers', userId] as const,
    following: (userId: string) => ['follows', 'following', userId] as const,
  },
  feed: {
    all: ['feed'] as const,
    list: () => ['feed', 'list'] as const,
    userActivities: (userId: string) => ['feed', 'userActivities', userId] as const,
  },
  profile: {
    all: ['profile'] as const,
    detail: (userId: string) => ['profile', 'detail', userId] as const,
    byUsername: (username: string) => ['profile', 'byUsername', username] as const,
    byUserId: (userId: string) => ['profile', 'byUserId', userId] as const,
    search: (query: string) => ['profile', 'search', query] as const,
    usernameAvailable: (username: string) => ['profile', 'usernameAvailable', username] as const,
  },
  profileStats: {
    all: ['profileStats'] as const,
    detail: (userId: string) => ['profileStats', 'detail', userId] as const,
  },
};
