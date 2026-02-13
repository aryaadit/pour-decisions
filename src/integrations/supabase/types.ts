export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_feed: {
        Row: {
          activity_type: string
          created_at: string
          drink_id: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          drink_id?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          drink_id?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_drink_id_fkey"
            columns: ["drink_id"]
            isOneToOne: false
            referencedRelation: "drinks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_feed_drink_id_fkey"
            columns: ["drink_id"]
            isOneToOne: false
            referencedRelation: "drinks_public"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string | null
          device_info: Json | null
          event_category: string
          event_name: string
          id: string
          properties: Json | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          event_category: string
          event_name: string
          id?: string
          properties?: Json | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          event_category?: string
          event_name?: string
          id?: string
          properties?: Json | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bug_reports: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          id?: string
          image_url?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      collection_drinks: {
        Row: {
          added_at: string
          collection_id: string
          drink_id: string
          id: string
          position: number | null
        }
        Insert: {
          added_at?: string
          collection_id: string
          drink_id: string
          id?: string
          position?: number | null
        }
        Update: {
          added_at?: string
          collection_id?: string
          drink_id?: string
          id?: string
          position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_drinks_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_drinks_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_drinks_drink_id_fkey"
            columns: ["drink_id"]
            isOneToOne: false
            referencedRelation: "drinks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_drinks_drink_id_fkey"
            columns: ["drink_id"]
            isOneToOne: false
            referencedRelation: "drinks_public"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          cover_color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_public: boolean | null
          name: string
          share_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          share_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          share_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_drink_types: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      drinks: {
        Row: {
          brand: string | null
          created_at: string
          date_added: string
          id: string
          image_url: string | null
          is_favorite: boolean | null
          is_wishlist: boolean | null
          location: string | null
          name: string
          notes: string | null
          price: string | null
          rating: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          date_added?: string
          id?: string
          image_url?: string | null
          is_favorite?: boolean | null
          is_wishlist?: boolean | null
          location?: string | null
          name: string
          notes?: string | null
          price?: string | null
          rating?: number | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          date_added?: string
          id?: string
          image_url?: string | null
          is_favorite?: boolean | null
          is_wishlist?: boolean | null
          location?: string | null
          name?: string
          notes?: string | null
          price?: string | null
          rating?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
          status?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_visibility: string | null
          analytics_enabled: boolean | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          default_drink_type: string | null
          default_sort_order: string | null
          dismissed_onboarding_steps: string[] | null
          display_name: string | null
          has_seen_welcome: boolean | null
          id: string
          is_public: boolean | null
          onboarding_step: string | null
          theme_preference: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          activity_visibility?: string | null
          analytics_enabled?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          default_drink_type?: string | null
          default_sort_order?: string | null
          dismissed_onboarding_steps?: string[] | null
          display_name?: string | null
          has_seen_welcome?: boolean | null
          id?: string
          is_public?: boolean | null
          onboarding_step?: string | null
          theme_preference?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          activity_visibility?: string | null
          analytics_enabled?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          default_drink_type?: string | null
          default_sort_order?: string | null
          dismissed_onboarding_steps?: string[] | null
          display_name?: string | null
          has_seen_welcome?: boolean | null
          id?: string
          is_public?: boolean | null
          onboarding_step?: string | null
          theme_preference?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      collection_drinks_public: {
        Row: {
          added_at: string | null
          collection_id: string | null
          drink_id: string | null
          position: number | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_drinks_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_drinks_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_drinks_drink_id_fkey"
            columns: ["drink_id"]
            isOneToOne: false
            referencedRelation: "drinks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_drinks_drink_id_fkey"
            columns: ["drink_id"]
            isOneToOne: false
            referencedRelation: "drinks_public"
            referencedColumns: ["id"]
          },
        ]
      }
      collections_public: {
        Row: {
          cover_color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string | null
          is_public: boolean | null
          name: string | null
          share_id: string | null
          updated_at: string | null
        }
        Insert: {
          cover_color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string | null
          is_public?: boolean | null
          name?: string | null
          share_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cover_color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string | null
          is_public?: boolean | null
          name?: string | null
          share_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      drinks_public: {
        Row: {
          brand: string | null
          created_at: string | null
          date_added: string | null
          id: string | null
          image_url: string | null
          is_wishlist: boolean | null
          name: string | null
          rating: number | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string | null
          date_added?: string | null
          id?: string | null
          image_url?: string | null
          is_wishlist?: boolean | null
          name?: string | null
          rating?: number | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string | null
          date_added?: string | null
          id?: string | null
          image_url?: string | null
          is_wishlist?: boolean | null
          name?: string | null
          rating?: number | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          activity_visibility: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          is_public: boolean | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          activity_visibility?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          is_public?: boolean | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          activity_visibility?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          is_public?: boolean | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_activity_visibility: { Args: { _user_id: string }; Returns: string }
      get_or_create_wishlist_collection: {
        Args: { _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_following: {
        Args: { _follower_id: string; _following_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
