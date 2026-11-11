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
      addresses: {
        Row: {
          address_line: string
          area: string
          created_at: string
          id: string
          is_default: boolean
          phone: string
          recipient: string
          user_id: string
        }
        Insert: {
          address_line: string
          area: string
          created_at?: string
          id?: string
          is_default?: boolean
          phone: string
          recipient: string
          user_id: string
        }
        Update: {
          address_line?: string
          area?: string
          created_at?: string
          id?: string
          is_default?: boolean
          phone?: string
          recipient?: string
          user_id?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string
          id: string
          product_id: string
          quantity: number
        }
        Insert: {
          cart_id: string
          id?: string
          product_id: string
          quantity: number
        }
        Update: {
          cart_id?: string
          id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          name_bn: string
          name_en: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          name_bn: string
          name_en: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          name_bn?: string
          name_en?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      delivery_areas: {
        Row: {
          active: boolean
          fee: number
          id: string
          name_bn: string
          name_en: string
          sort_order: number
          zone: string
        }
        Insert: {
          active?: boolean
          fee: number
          id?: string
          name_bn: string
          name_en: string
          sort_order?: number
          zone: string
        }
        Update: {
          active?: boolean
          fee?: number
          id?: string
          name_bn?: string
          name_en?: string
          sort_order?: number
          zone?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          image_url: string | null
          order_id: string
          product_id: string | null
          quantity: number
          status: Database["public"]["Enums"]["order_status"]
          store_id: string | null
          title: string
          unit_price: number
        }
        Insert: {
          id?: string
          image_url?: string | null
          order_id: string
          product_id?: string | null
          quantity: number
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string | null
          title: string
          unit_price: number
        }
        Update: {
          id?: string
          image_url?: string | null
          order_id?: string
          product_id?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string | null
          title?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "seller_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_line: string
          area: string
          created_at: string
          customer_id: string | null
          delivery_fee: number
          id: string
          is_demo: boolean
          note: string | null
          order_no: string
          payment_method: string
          phone: string
          recipient: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
        }
        Insert: {
          address_line: string
          area: string
          created_at?: string
          customer_id?: string | null
          delivery_fee: number
          id?: string
          is_demo?: boolean
          note?: string | null
          order_no: string
          payment_method?: string
          phone: string
          recipient: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
        }
        Update: {
          address_line?: string
          area?: string
          created_at?: string
          customer_id?: string | null
          delivery_fee?: number
          id?: string
          is_demo?: boolean
          note?: string | null
          order_no?: string
          payment_method?: string
          phone?: string
          recipient?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
        }
        Relationships: []
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          id?: string
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          id?: string
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          compare_price: number | null
          created_at: string
          description: string | null
          id: string
          price: number
          rating: number
          slug: string
          sold_count: number
          status: Database["public"]["Enums"]["product_status"]
          stock: number
          store_id: string
          title_bn: string
          title_en: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          compare_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          price: number
          rating?: number
          slug: string
          sold_count?: number
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          store_id: string
          title_bn: string
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          compare_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          price?: number
          rating?: number
          slug?: string
          sold_count?: number
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          store_id?: string
          title_bn?: string
          title_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "seller_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      seller_applications: {
        Row: {
          address: string
          admin_note: string | null
          area: string
          category_hint: string | null
          created_at: string
          description: string | null
          id: string
          owner_name: string
          phone: string
          reviewed_at: string | null
          status: Database["public"]["Enums"]["application_status"]
          store_name: string
          user_id: string | null
        }
        Insert: {
          address: string
          admin_note?: string | null
          area: string
          category_hint?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_name: string
          phone: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          store_name: string
          user_id?: string | null
        }
        Update: {
          address?: string
          admin_note?: string | null
          area?: string
          category_hint?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_name?: string
          phone?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          store_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      seller_stores: {
        Row: {
          address: string | null
          area: string
          banner_url: string | null
          created_at: string
          description: string | null
          id: string
          is_demo: boolean
          logo_url: string | null
          name: string
          name_en: string | null
          owner_id: string | null
          phone: string | null
          rating: number
          slug: string
          status: Database["public"]["Enums"]["store_status"]
        }
        Insert: {
          address?: string | null
          area?: string
          banner_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          logo_url?: string | null
          name: string
          name_en?: string | null
          owner_id?: string | null
          phone?: string | null
          rating?: number
          slug: string
          status?: Database["public"]["Enums"]["store_status"]
        }
        Update: {
          address?: string | null
          area?: string
          banner_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          logo_url?: string | null
          name?: string
          name_en?: string | null
          owner_id?: string | null
          phone?: string | null
          rating?: number
          slug?: string
          status?: Database["public"]["Enums"]["store_status"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      claim_first_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_my_order: { Args: { _order_id: string }; Returns: boolean }
      order_has_my_store: { Args: { _order_id: string }; Returns: boolean }
      owns_store: { Args: { _store_id: string }; Returns: boolean }
      place_order: {
        Args: {
          p_address: string
          p_area: string
          p_items: Json
          p_note?: string
          p_phone: string
          p_recipient: string
          p_save_address?: boolean
        }
        Returns: string
      }
      review_seller_application: {
        Args: { p_app_id: string; p_approve: boolean; p_note?: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "seller" | "customer"
      application_status: "pending" | "approved" | "rejected"
      order_status:
        | "pending"
        | "confirmed"
        | "shipped"
        | "delivered"
        | "cancelled"
      product_status: "active" | "draft" | "hidden"
      store_status: "pending" | "active" | "suspended"
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
      app_role: ["admin", "seller", "customer"],
      application_status: ["pending", "approved", "rejected"],
      order_status: [
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
      ],
      product_status: ["active", "draft", "hidden"],
      store_status: ["pending", "active", "suspended"],
    },
  },
} as const