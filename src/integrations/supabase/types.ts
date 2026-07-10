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
      activities: {
        Row: {
          actor_id: string | null
          church_id: string | null
          created_at: string
          id: string
          meta: Json
          organization_id: string | null
          subject_id: string | null
          subject_type: string | null
          verb: string
        }
        Insert: {
          actor_id?: string | null
          church_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          organization_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          verb: string
        }
        Update: {
          actor_id?: string | null
          church_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          organization_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          verb?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_events: {
        Row: {
          church_id: string
          created_at: string
          event_date: string
          id: string
          kind: Database["public"]["Enums"]["attendance_kind"]
          name: string
        }
        Insert: {
          church_id: string
          created_at?: string
          event_date: string
          id?: string
          kind?: Database["public"]["Enums"]["attendance_kind"]
          name: string
        }
        Update: {
          church_id?: string
          created_at?: string
          event_date?: string
          id?: string
          kind?: Database["public"]["Enums"]["attendance_kind"]
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_events_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          checked_in_at: string
          event_id: string
          id: string
          member_id: string
          present: boolean
        }
        Insert: {
          checked_in_at?: string
          event_id: string
          id?: string
          member_id: string
          present?: boolean
        }
        Update: {
          checked_in_at?: string
          event_id?: string
          id?: string
          member_id?: string
          present?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "attendance_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      churches: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          currency: string
          id: string
          name: string
          organization_id: string
          photo_url: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          currency?: string
          id?: string
          name: string
          organization_id: string
          photo_url?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          currency?: string
          id?: string
          name?: string
          organization_id?: string
          photo_url?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "churches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contributions: {
        Row: {
          amount: number
          category_id: string | null
          church_id: string
          created_at: string
          created_by: string | null
          currency: string
          id: string
          member_id: string | null
          method: string | null
          note: string | null
          occurred_on: string
          reference: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          church_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          member_id?: string | null
          method?: string | null
          note?: string | null
          occurred_on?: string
          reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          church_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          member_id?: string | null
          method?: string | null
          note?: string | null
          occurred_on?: string
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          church_id: string
          created_at: string
          created_by: string | null
          currency: string
          id: string
          method: string | null
          note: string | null
          occurred_on: string
          payee: string | null
          reference: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          church_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          method?: string | null
          note?: string | null
          occurred_on?: string
          payee?: string | null
          reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          church_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          method?: string | null
          note?: string | null
          occurred_on?: string
          payee?: string | null
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_categories: {
        Row: {
          church_id: string
          color: string | null
          created_at: string
          id: string
          is_archived: boolean
          kind: string
          name: string
          updated_at: string
        }
        Insert: {
          church_id: string
          color?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          kind: string
          name: string
          updated_at?: string
        }
        Update: {
          church_id?: string
          color?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          kind?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_categories_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      member_documents: {
        Row: {
          filename: string
          id: string
          member_id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          filename: string
          id?: string
          member_id: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          filename?: string
          id?: string
          member_id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_documents_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_family_links: {
        Row: {
          created_at: string
          id: string
          member_id: string
          related_member_id: string
          relation: Database["public"]["Enums"]["family_relation"]
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          related_member_id: string
          relation: Database["public"]["Enums"]["family_relation"]
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          related_member_id?: string
          relation?: Database["public"]["Enums"]["family_relation"]
        }
        Relationships: [
          {
            foreignKeyName: "member_family_links_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_family_links_related_member_id_fkey"
            columns: ["related_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_transfers: {
        Row: {
          from_church_id: string | null
          id: string
          member_id: string
          reason: string | null
          to_church_id: string
          transferred_at: string
          transferred_by: string | null
        }
        Insert: {
          from_church_id?: string | null
          id?: string
          member_id: string
          reason?: string | null
          to_church_id: string
          transferred_at?: string
          transferred_by?: string | null
        }
        Update: {
          from_church_id?: string | null
          id?: string
          member_id?: string
          reason?: string | null
          to_church_id?: string
          transferred_at?: string
          transferred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_transfers_from_church_id_fkey"
            columns: ["from_church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_transfers_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_transfers_to_church_id_fkey"
            columns: ["to_church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          address: string | null
          baptism_church: string | null
          baptism_date: string | null
          birthdate: string | null
          church_id: string
          civil_status: Database["public"]["Enums"]["civil_status"] | null
          created_at: string
          created_by: string | null
          email: string | null
          first_name: string
          id: string
          joined_at: string | null
          last_name: string
          membership_status: Database["public"]["Enums"]["membership_status"]
          middle_name: string | null
          notes: string | null
          phone: string | null
          photo_url: string | null
          sex: Database["public"]["Enums"]["sex_kind"] | null
          suffix: string | null
          updated_at: string
          wedding_date: string | null
        }
        Insert: {
          address?: string | null
          baptism_church?: string | null
          baptism_date?: string | null
          birthdate?: string | null
          church_id: string
          civil_status?: Database["public"]["Enums"]["civil_status"] | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name: string
          id?: string
          joined_at?: string | null
          last_name: string
          membership_status?: Database["public"]["Enums"]["membership_status"]
          middle_name?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          sex?: Database["public"]["Enums"]["sex_kind"] | null
          suffix?: string | null
          updated_at?: string
          wedding_date?: string | null
        }
        Update: {
          address?: string | null
          baptism_church?: string | null
          baptism_date?: string | null
          birthdate?: string | null
          church_id?: string
          civil_status?: Database["public"]["Enums"]["civil_status"] | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string
          id?: string
          joined_at?: string | null
          last_name?: string
          membership_status?: Database["public"]["Enums"]["membership_status"]
          middle_name?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          sex?: Database["public"]["Enums"]["sex_kind"] | null
          suffix?: string | null
          updated_at?: string
          wedding_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          church_id: string | null
          created_at: string
          id: string
          kind: string
          read_at: string | null
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          church_id?: string | null
          created_at?: string
          id?: string
          kind: string
          read_at?: string | null
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          church_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_church_roles: {
        Row: {
          church_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          church_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          church_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_church_roles_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_organizations: {
        Row: {
          created_at: string
          id: string
          is_org_admin: boolean
          is_owner: boolean
          organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_org_admin?: boolean
          is_owner?: boolean
          organization_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_org_admin?: boolean
          is_owner?: boolean
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_church_role: {
        Args: {
          _church: string
          _roles: Database["public"]["Enums"]["app_role"][]
          _user: string
        }
        Returns: boolean
      }
      is_org_admin: { Args: { _org: string; _user: string }; Returns: boolean }
      is_org_member: { Args: { _org: string; _user: string }; Returns: boolean }
      seed_default_giving_categories: {
        Args: { _church: string }
        Returns: undefined
      }
      user_church_ids: { Args: { _user: string }; Returns: string[] }
      user_org_ids: { Args: { _user: string }; Returns: string[] }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "org_admin"
        | "church_admin"
        | "pastor"
        | "ministry_leader"
        | "treasurer"
        | "secretary"
        | "sunday_school_coordinator"
        | "inventory_custodian"
        | "member_viewer"
      attendance_kind: "service" | "sunday_school" | "ministry" | "event"
      civil_status: "single" | "married" | "widowed" | "separated" | "divorced"
      family_relation:
        | "spouse"
        | "parent"
        | "child"
        | "sibling"
        | "guardian"
        | "other"
      membership_status:
        | "visitor"
        | "regular"
        | "member"
        | "inactive"
        | "transferred"
      sex_kind: "male" | "female"
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
      app_role: [
        "super_admin",
        "org_admin",
        "church_admin",
        "pastor",
        "ministry_leader",
        "treasurer",
        "secretary",
        "sunday_school_coordinator",
        "inventory_custodian",
        "member_viewer",
      ],
      attendance_kind: ["service", "sunday_school", "ministry", "event"],
      civil_status: ["single", "married", "widowed", "separated", "divorced"],
      family_relation: [
        "spouse",
        "parent",
        "child",
        "sibling",
        "guardian",
        "other",
      ],
      membership_status: [
        "visitor",
        "regular",
        "member",
        "inactive",
        "transferred",
      ],
      sex_kind: ["male", "female"],
    },
  },
} as const
