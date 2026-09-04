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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      auction_events: {
        Row: {
          auction_round: number
          created_at: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          is_undone: boolean
          player_id: string | null
          player_name_snapshot: string | null
          price: number | null
          team_id: string | null
          team_name_snapshot: string | null
          tournament_id: string
        }
        Insert: {
          auction_round?: number
          created_at?: string
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          is_undone?: boolean
          player_id?: string | null
          player_name_snapshot?: string | null
          price?: number | null
          team_id?: string | null
          team_name_snapshot?: string | null
          tournament_id: string
        }
        Update: {
          auction_round?: number
          created_at?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_undone?: boolean
          player_id?: string | null
          player_name_snapshot?: string | null
          price?: number | null
          team_id?: string | null
          team_name_snapshot?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_events_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_layouts: {
        Row: {
          created_at: string
          id: string
          layout: Json
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          layout?: Json
          tournament_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          layout?: Json
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_layouts_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: true
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      live_auction: {
        Row: {
          current_bid: number | null
          player_id: string | null
          round: number | null
          status: string
          team_id: string | null
          tournament_id: string
          updated_at: string
        }
        Insert: {
          current_bid?: number | null
          player_id?: string | null
          round?: number | null
          status?: string
          team_id?: string | null
          tournament_id: string
          updated_at?: string
        }
        Update: {
          current_bid?: number | null
          player_id?: string | null
          round?: number | null
          status?: string
          team_id?: string | null
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_auction_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_auction_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_auction_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: true
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          age: number | null
          auction_round: number
          base_price: number | null
          batting_style: string | null
          bowling_style: string | null
          city: string | null
          created_at: string
          cricheroes_data: Json | null
          cricheroes_fetched_at: string | null
          cricheroes_player_id: string | null
          cricheroes_url: string | null
          details: string | null
          final_price: number | null
          id: string
          name: string
          notes: string | null
          photo_url: string | null
          player_number: string | null
          role: string | null
          round_2_eligible: boolean
          state: string | null
          status: Database["public"]["Enums"]["player_status"]
          team_id: string | null
          tournament_id: string
          updated_at: string
        }
        Insert: {
          age?: number | null
          auction_round?: number
          base_price?: number | null
          batting_style?: string | null
          bowling_style?: string | null
          city?: string | null
          created_at?: string
          cricheroes_data?: Json | null
          cricheroes_fetched_at?: string | null
          cricheroes_player_id?: string | null
          cricheroes_url?: string | null
          details?: string | null
          final_price?: number | null
          id?: string
          name: string
          notes?: string | null
          photo_url?: string | null
          player_number?: string | null
          role?: string | null
          round_2_eligible?: boolean
          state?: string | null
          status?: Database["public"]["Enums"]["player_status"]
          team_id?: string | null
          tournament_id: string
          updated_at?: string
        }
        Update: {
          age?: number | null
          auction_round?: number
          base_price?: number | null
          batting_style?: string | null
          bowling_style?: string | null
          city?: string | null
          created_at?: string
          cricheroes_data?: Json | null
          cricheroes_fetched_at?: string | null
          cricheroes_player_id?: string | null
          cricheroes_url?: string | null
          details?: string | null
          final_price?: number | null
          id?: string
          name?: string
          notes?: string | null
          photo_url?: string | null
          player_number?: string | null
          role?: string | null
          round_2_eligible?: boolean
          state?: string | null
          status?: Database["public"]["Enums"]["player_status"]
          team_id?: string | null
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      site_branding: {
        Row: {
          assets: Json
          colors: Json
          id: number
          typography: Json
          updated_at: string
        }
        Insert: {
          assets?: Json
          colors?: Json
          id?: number
          typography?: Json
          updated_at?: string
        }
        Update: {
          assets?: Json
          colors?: Json
          id?: number
          typography?: Json
          updated_at?: string
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          tournament_id: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          tournament_id: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          tournament_id?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsors_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          captain_contact: string | null
          captain_name: string
          captain_photo_url: string | null
          created_at: string
          description: string | null
          id: string
          initial_purse: number
          logo_url: string | null
          max_players: number
          name: string
          owner_name: string | null
          players_purchased_count: number
          remaining_purse: number
          short_name: string
          slug: string
          theme_color: string | null
          total_spent: number
          tournament_id: string
          updated_at: string
        }
        Insert: {
          captain_contact?: string | null
          captain_name: string
          captain_photo_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          initial_purse: number
          logo_url?: string | null
          max_players?: number
          name: string
          owner_name?: string | null
          players_purchased_count?: number
          remaining_purse: number
          short_name: string
          slug: string
          theme_color?: string | null
          total_spent?: number
          tournament_id: string
          updated_at?: string
        }
        Update: {
          captain_contact?: string | null
          captain_name?: string
          captain_photo_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          initial_purse?: number
          logo_url?: string | null
          max_players?: number
          name?: string
          owner_name?: string | null
          players_purchased_count?: number
          remaining_purse?: number
          short_name?: string
          slug?: string
          theme_color?: string | null
          total_spent?: number
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          banner_url: string | null
          created_at: string
          currency: string
          default_purse: number
          description: string | null
          display_order: number
          id: string
          location: string | null
          logo_url: string | null
          max_teams: number | null
          name: string
          slug: string
          status: Database["public"]["Enums"]["tournament_status"]
          team_size: number | null
          tournament_date: string | null
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          currency?: string
          default_purse?: number
          description?: string | null
          display_order?: number
          id?: string
          location?: string | null
          logo_url?: string | null
          max_teams?: number | null
          name: string
          slug: string
          status?: Database["public"]["Enums"]["tournament_status"]
          team_size?: number | null
          tournament_date?: string | null
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          currency?: string
          default_purse?: number
          description?: string | null
          display_order?: number
          id?: string
          location?: string | null
          logo_url?: string | null
          max_teams?: number | null
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["tournament_status"]
          team_size?: number | null
          tournament_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_player_sale: {
        Args: { p_player_id: string; p_price: number; p_team_id: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      mark_player_unsold: { Args: { p_player_id: string }; Returns: string }
      restore_player_available: {
        Args: { p_player_id: string }
        Returns: undefined
      }
      undo_last_event: { Args: { p_tournament_id: string }; Returns: string }
    }
    Enums: {
      event_type: "sale" | "unsold" | "undo_sale" | "undo_unsold"
      player_status: "available" | "sold" | "unsold"
      tournament_status: "draft" | "active" | "completed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      event_type: ["sale", "unsold", "undo_sale", "undo_unsold"],
      player_status: ["available", "sold", "unsold"],
      tournament_status: ["draft", "active", "completed"],
    },
  },
} as const
