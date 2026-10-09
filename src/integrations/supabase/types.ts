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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      leads: {
        Row: {
          cidade: string
          criado_em: string
          id: string
          interesse: string
          nome: string
          rede_id: string
          status: string
          telefone: string
          unidade_id: string
        }
        Insert: {
          cidade?: string
          criado_em?: string
          id?: string
          interesse?: string
          nome: string
          rede_id: string
          status?: string
          telefone?: string
          unidade_id: string
        }
        Update: {
          cidade?: string
          criado_em?: string
          id?: string
          interesse?: string
          nome?: string
          rede_id?: string
          status?: string
          telefone?: string
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_rede_id_fkey"
            columns: ["rede_id"]
            isOneToOne: false
            referencedRelation: "redes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          email: string
          id: string
        }
        Insert: {
          email?: string
          id: string
        }
        Update: {
          email?: string
          id?: string
        }
        Relationships: []
      }
      redes: {
        Row: {
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      unidades: {
        Row: {
          cidade: string
          estado: string
          id: string
          nome: string
          rede_id: string
        }
        Insert: {
          cidade?: string
          estado?: string
          id?: string
          nome: string
          rede_id: string
        }
        Update: {
          cidade?: string
          estado?: string
          id?: string
          nome?: string
          rede_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidades_rede_id_fkey"
            columns: ["rede_id"]
            isOneToOne: false
            referencedRelation: "redes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          rede_id: string
          role: Database["public"]["Enums"]["app_role"]
          unidade_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          rede_id: string
          role: Database["public"]["Enums"]["app_role"]
          unidade_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          rede_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          unidade_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_rede_id_fkey"
            columns: ["rede_id"]
            isOneToOne: false
            referencedRelation: "redes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_see_unidade: {
        Args: { _rede: string; _uid: string; _unidade: string }
        Returns: boolean
      }
      find_user_by_email: { Args: { _email: string }; Returns: string }
      is_rede_admin: { Args: { _rede: string; _uid: string }; Returns: boolean }
      is_rede_member: {
        Args: { _rede: string; _uid: string }
        Returns: boolean
      }
      shares_rede_as_admin: {
        Args: { _admin: string; _user: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "franqueado"
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
      app_role: ["admin", "franqueado"],
    },
  },
} as const
