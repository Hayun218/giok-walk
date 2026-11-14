export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity: {
        Row: {
          created_at: string
          id: number
          place_id: string
          type: Database["public"]["Enums"]["activity_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          place_id: string
          type: Database["public"]["Enums"]["activity_type"]
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: never
          place_id?: string
          type?: Database["public"]["Enums"]["activity_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_words: {
        Row: {
          word: string
        }
        Insert: {
          word: string
        }
        Update: {
          word?: string
        }
        Relationships: []
      }
      memories: {
        Row: {
          author_id: string
          created_at: string
          distance: number
          emotion: string
          id: string
          letter: string
          photo_path: string | null
          pitch: number
          place_id: string
          recall_at: string | null
          recipient: Database["public"]["Enums"]["recipient_kind"]
          report_count: number
          share_token: string
          status: Database["public"]["Enums"]["memory_status"]
          visibility: Database["public"]["Enums"]["memory_visibility"]
          yaw: number
        }
        Insert: {
          author_id?: string
          created_at?: string
          distance?: number
          emotion: string
          id?: string
          letter: string
          photo_path?: string | null
          pitch?: number
          place_id: string
          recall_at?: string | null
          recipient?: Database["public"]["Enums"]["recipient_kind"]
          report_count?: number
          share_token?: string
          status?: Database["public"]["Enums"]["memory_status"]
          visibility?: Database["public"]["Enums"]["memory_visibility"]
          yaw: number
        }
        Update: {
          author_id?: string
          created_at?: string
          distance?: number
          emotion?: string
          id?: string
          letter?: string
          photo_path?: string | null
          pitch?: number
          place_id?: string
          recall_at?: string | null
          recipient?: Database["public"]["Enums"]["recipient_kind"]
          report_count?: number
          share_token?: string
          status?: Database["public"]["Enums"]["memory_status"]
          visibility?: Database["public"]["Enums"]["memory_visibility"]
          yaw?: number
        }
        Relationships: [
          {
            foreignKeyName: "memories_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          lat: number | null
          lng: number | null
          mode: Database["public"]["Enums"]["place_mode"]
          name: string
          object_kind: Database["public"]["Enums"]["object_kind"]
          prompt: string | null
          slug: string
          starts_at: string | null
          status: Database["public"]["Enums"]["place_status"]
          venue_name: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          mode?: Database["public"]["Enums"]["place_mode"]
          name: string
          object_kind?: Database["public"]["Enums"]["object_kind"]
          prompt?: string | null
          slug: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["place_status"]
          venue_name?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          mode?: Database["public"]["Enums"]["place_mode"]
          name?: string
          object_kind?: Database["public"]["Enums"]["object_kind"]
          prompt?: string | null
          slug?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["place_status"]
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "places_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      recall_subscriptions: {
        Row: {
          address: string
          channel: string
          consent_at: string
          created_at: string
          id: string
          memory_id: string
          send_at: string
          sent_at: string | null
        }
        Insert: {
          address: string
          channel: string
          consent_at?: string
          created_at?: string
          id?: string
          memory_id: string
          send_at: string
          sent_at?: string | null
        }
        Update: {
          address?: string
          channel?: string
          consent_at?: string
          created_at?: string
          id?: string
          memory_id?: string
          send_at?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recall_subscriptions_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          memory_id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          memory_id: string
          reason: string
          reporter_id?: string
          resolved_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          memory_id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_shared_memory: {
        Args: { token: string }
        Returns: {
          created_at: string
          emotion: string
          id: string
          letter: string
          photo_path: string
          place_id: string
          place_name: string
          place_slug: string
          recipient: Database["public"]["Enums"]["recipient_kind"]
        }[]
      }
      is_operator: { Args: never; Returns: boolean }
      place_stats: {
        Args: { place: string }
        Returns: {
          entries: number
          hidden: number
          memories: number
          open_reports: number
          visitors: number
        }[]
      }
      set_memory_status: {
        Args: {
          memory: string
          new_status: Database["public"]["Enums"]["memory_status"]
        }
        Returns: undefined
      }
    }
    Enums: {
      activity_type: "enter" | "create" | "view" | "share"
      memory_status: "visible" | "hidden"
      memory_visibility: "private" | "link" | "public"
      object_kind: "orb" | "envelope"
      place_mode: "event" | "partner" | "personal"
      place_status: "draft" | "open" | "closed"
      recipient_kind: "future_me" | "companion" | "this_place" | "stranger"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_type: ["enter", "create", "view", "share"],
      memory_status: ["visible", "hidden"],
      memory_visibility: ["private", "link", "public"],
      object_kind: ["orb", "envelope"],
      place_mode: ["event", "partner", "personal"],
      place_status: ["draft", "open", "closed"],
      recipient_kind: ["future_me", "companion", "this_place", "stranger"],
    },
  },
} as const

