/**
 * GENERATED FILE — do not edit by hand.
 *
 * Produced by `npm run db:types` (scripts/gen-types.mjs) directly from the
 * live schema through information_schema. Regenerate after every migration and
 * commit the result.
 *
 * Generated: 2026-09-02T15:54:07.697Z
 * Tables: 12 · Views: 3
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      articles: {
        Row: {
          id: string;
          slug: string;
          title: string;
          excerpt: string | null;
          body_json: Json;
          body_text: string | null;
          cover_key: string | null;
          cover_alt: string | null;
          kind: "blog" | "market_update" | "guide";
          city_id: string | null;
          community_id: string | null;
          tags: string[];
          status: "draft" | "published" | "archived";
          published_at: string | null;
          author_id: string | null;
          meta_title: string | null;
          meta_desc: string | null;
          og_key: string | null;
          reading_min: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          excerpt?: string | null;
          body_json?: Json;
          body_text?: string | null;
          cover_key?: string | null;
          cover_alt?: string | null;
          kind?: "blog" | "market_update" | "guide";
          city_id?: string | null;
          community_id?: string | null;
          tags?: string[];
          status?: "draft" | "published" | "archived";
          published_at?: string | null;
          author_id?: string | null;
          meta_title?: string | null;
          meta_desc?: string | null;
          og_key?: string | null;
          reading_min?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          excerpt?: string | null;
          body_json?: Json;
          body_text?: string | null;
          cover_key?: string | null;
          cover_alt?: string | null;
          kind?: "blog" | "market_update" | "guide";
          city_id?: string | null;
          community_id?: string | null;
          tags?: string[];
          status?: "draft" | "published" | "archived";
          published_at?: string | null;
          author_id?: string | null;
          meta_title?: string | null;
          meta_desc?: string | null;
          og_key?: string | null;
          reading_min?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cities: {
        Row: {
          id: string;
          slug: string;
          name: string;
          county: string;
          state: string;
          in_search: boolean;
          is_flagship: boolean;
          sort_order: number;
          hero_key: string | null;
          intro_md: string | null;
          body_md: string | null;
          stats_json: Json;
          faq_json: Json;
          meta_title: string | null;
          meta_desc: string | null;
          published: boolean;
          created_at: string;
          updated_at: string;
          hero_alt: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          county: string;
          state?: string;
          in_search?: boolean;
          is_flagship?: boolean;
          sort_order?: number;
          hero_key?: string | null;
          intro_md?: string | null;
          body_md?: string | null;
          stats_json?: Json;
          faq_json?: Json;
          meta_title?: string | null;
          meta_desc?: string | null;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
          hero_alt?: string | null;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          county?: string;
          state?: string;
          in_search?: boolean;
          is_flagship?: boolean;
          sort_order?: number;
          hero_key?: string | null;
          intro_md?: string | null;
          body_md?: string | null;
          stats_json?: Json;
          faq_json?: Json;
          meta_title?: string | null;
          meta_desc?: string | null;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
          hero_alt?: string | null;
        };
        Relationships: [];
      };
      communities: {
        Row: {
          id: string;
          city_id: string;
          slug: string;
          name: string;
          hero_key: string | null;
          intro_md: string | null;
          body_md: string | null;
          hoa_info: string | null;
          amenities: string[];
          price_range: Json | null;
          faq_json: Json;
          meta_title: string | null;
          meta_desc: string | null;
          published: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
          hero_alt: string | null;
        };
        Insert: {
          id?: string;
          city_id: string;
          slug: string;
          name: string;
          hero_key?: string | null;
          intro_md?: string | null;
          body_md?: string | null;
          hoa_info?: string | null;
          amenities?: string[];
          price_range?: Json | null;
          faq_json?: Json;
          meta_title?: string | null;
          meta_desc?: string | null;
          published?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          hero_alt?: string | null;
        };
        Update: {
          id?: string;
          city_id?: string;
          slug?: string;
          name?: string;
          hero_key?: string | null;
          intro_md?: string | null;
          body_md?: string | null;
          hoa_info?: string | null;
          amenities?: string[];
          price_range?: Json | null;
          faq_json?: Json;
          meta_title?: string | null;
          meta_desc?: string | null;
          published?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          hero_alt?: string | null;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          message: string | null;
          lead_type: "general" | "listing_inquiry" | "showing_request" | "seller" | "va" | "assumable" | "new_construction";
          source_page: string | null;
          listing_id: string | null;
          utm: Json | null;
          status: "new" | "contacted" | "qualified" | "closed" | "spam";
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          message?: string | null;
          lead_type?: "general" | "listing_inquiry" | "showing_request" | "seller" | "va" | "assumable" | "new_construction";
          source_page?: string | null;
          listing_id?: string | null;
          utm?: Json | null;
          status?: "new" | "contacted" | "qualified" | "closed" | "spam";
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          message?: string | null;
          lead_type?: "general" | "listing_inquiry" | "showing_request" | "seller" | "va" | "assumable" | "new_construction";
          source_page?: string | null;
          listing_id?: string | null;
          utm?: Json | null;
          status?: "new" | "contacted" | "qualified" | "closed" | "spam";
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      listings: {
        Row: {
          id: string;
          slug: string;
          status: "active" | "pending" | "sold" | "coming_soon" | "off_market";
          listing_type: "resale" | "new_construction" | "assumable" | "va_eligible" | "land";
          property_type: "single_family" | "townhouse" | "condo" | "villa" | "multi_family" | "land" | "manufactured";
          price: number;
          hoa_fee: number | null;
          taxes_annual: number | null;
          beds: number | null;
          baths: number | null;
          half_baths: number;
          sqft: number | null;
          lot_size: number | null;
          year_built: number | null;
          garage_spaces: number;
          stories: number | null;
          pool: boolean;
          waterfront: boolean;
          features: string[];
          address: string;
          unit: string | null;
          city_id: string;
          community_id: string | null;
          zip: string | null;
          lat: number | null;
          lng: number | null;
          headline: string | null;
          description: string | null;
          contractors_take: string | null;
          photos: Json;
          virtual_tour: string | null;
          floorplan_key: string | null;
          meta_title: string | null;
          meta_desc: string | null;
          is_featured: boolean;
          published: boolean;
          published_at: string | null;
          sold_at: string | null;
          sold_price: number | null;
          purge_after: string | null;
          photos_purged: boolean;
          keep_photos: boolean;
          source: string;
          source_id: string | null;
          mls_number: string | null;
          synced_at: string | null;
          is_locked: boolean;
          raw: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          status?: "active" | "pending" | "sold" | "coming_soon" | "off_market";
          listing_type?: "resale" | "new_construction" | "assumable" | "va_eligible" | "land";
          property_type?: "single_family" | "townhouse" | "condo" | "villa" | "multi_family" | "land" | "manufactured";
          price: number;
          hoa_fee?: number | null;
          taxes_annual?: number | null;
          beds?: number | null;
          baths?: number | null;
          half_baths?: number;
          sqft?: number | null;
          lot_size?: number | null;
          year_built?: number | null;
          garage_spaces?: number;
          stories?: number | null;
          pool?: boolean;
          waterfront?: boolean;
          features?: string[];
          address: string;
          unit?: string | null;
          city_id: string;
          community_id?: string | null;
          zip?: string | null;
          lat?: number | null;
          lng?: number | null;
          headline?: string | null;
          description?: string | null;
          contractors_take?: string | null;
          photos?: Json;
          virtual_tour?: string | null;
          floorplan_key?: string | null;
          meta_title?: string | null;
          meta_desc?: string | null;
          is_featured?: boolean;
          published?: boolean;
          published_at?: string | null;
          sold_at?: string | null;
          sold_price?: number | null;
          purge_after?: string | null;
          photos_purged?: boolean;
          keep_photos?: boolean;
          source?: string;
          source_id?: string | null;
          mls_number?: string | null;
          synced_at?: string | null;
          is_locked?: boolean;
          raw?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          status?: "active" | "pending" | "sold" | "coming_soon" | "off_market";
          listing_type?: "resale" | "new_construction" | "assumable" | "va_eligible" | "land";
          property_type?: "single_family" | "townhouse" | "condo" | "villa" | "multi_family" | "land" | "manufactured";
          price?: number;
          hoa_fee?: number | null;
          taxes_annual?: number | null;
          beds?: number | null;
          baths?: number | null;
          half_baths?: number;
          sqft?: number | null;
          lot_size?: number | null;
          year_built?: number | null;
          garage_spaces?: number;
          stories?: number | null;
          pool?: boolean;
          waterfront?: boolean;
          features?: string[];
          address?: string;
          unit?: string | null;
          city_id?: string;
          community_id?: string | null;
          zip?: string | null;
          lat?: number | null;
          lng?: number | null;
          headline?: string | null;
          description?: string | null;
          contractors_take?: string | null;
          photos?: Json;
          virtual_tour?: string | null;
          floorplan_key?: string | null;
          meta_title?: string | null;
          meta_desc?: string | null;
          is_featured?: boolean;
          published?: boolean;
          published_at?: string | null;
          sold_at?: string | null;
          sold_price?: number | null;
          purge_after?: string | null;
          photos_purged?: boolean;
          keep_photos?: boolean;
          source?: string;
          source_id?: string | null;
          mls_number?: string | null;
          synced_at?: string | null;
          is_locked?: boolean;
          raw?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      media: {
        Row: {
          id: string;
          key: string;
          variants: number[];
          bytes: number;
          width: number | null;
          height: number | null;
          mime: string;
          content_hash: string | null;
          entity_type: "listing" | "article" | "city" | "community" | "profile" | "site";
          entity_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          variants?: number[];
          bytes: number;
          width?: number | null;
          height?: number | null;
          mime?: string;
          content_hash?: string | null;
          entity_type: "listing" | "article" | "city" | "community" | "profile" | "site";
          entity_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          variants?: number[];
          bytes?: number;
          width?: number | null;
          height?: number | null;
          mime?: string;
          content_hash?: string | null;
          entity_type?: "listing" | "article" | "city" | "community" | "profile" | "site";
          entity_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          role: "admin" | "editor" | "viewer";
          full_name: string | null;
          avatar_key: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: "admin" | "editor" | "viewer";
          full_name?: string | null;
          avatar_key?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: "admin" | "editor" | "viewer";
          full_name?: string | null;
          avatar_key?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      redirects: {
        Row: {
          id: string;
          from_path: string;
          to_path: string;
          status_code: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_path: string;
          to_path: string;
          status_code?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          from_path?: string;
          to_path?: string;
          status_code?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          author_name: string;
          author_role: string | null;
          rating: number | null;
          body: string;
          source: "Google" | "Zillow" | "Realtor.com" | "Direct" | null;
          source_url: string | null;
          reviewed_at: string | null;
          published: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          author_name: string;
          author_role?: string | null;
          rating?: number | null;
          body: string;
          source?: "Google" | "Zillow" | "Realtor.com" | "Direct" | null;
          source_url?: string | null;
          reviewed_at?: string | null;
          published?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          author_name?: string;
          author_role?: string | null;
          rating?: number | null;
          body?: string;
          source?: "Google" | "Zillow" | "Realtor.com" | "Direct" | null;
          source_url?: string | null;
          reviewed_at?: string | null;
          published?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      saved_searches: {
        Row: {
          id: string;
          email: string;
          label: string | null;
          query_json: Json;
          frequency: "instant" | "daily" | "weekly";
          confirmed: boolean;
          confirm_token: string | null;
          unsubscribed: boolean;
          last_sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          label?: string | null;
          query_json?: Json;
          frequency?: "instant" | "daily" | "weekly";
          confirmed?: boolean;
          confirm_token?: string | null;
          unsubscribed?: boolean;
          last_sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          label?: string | null;
          query_json?: Json;
          frequency?: "instant" | "daily" | "weekly";
          confirmed?: boolean;
          confirm_token?: string | null;
          unsubscribed?: boolean;
          last_sent_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          id: number;
          phone: string | null;
          email: string | null;
          address_street: string | null;
          address_locality: string | null;
          address_region: string | null;
          address_postal: string | null;
          office_hours: string | null;
          profiles_json: Json;
          positioning: string | null;
          announcement: string | null;
          announcement_href: string | null;
          og_key: string | null;
          hero_key: string | null;
          brokerage_name: string | null;
          license_re: string | null;
          license_contractor: string | null;
          disclosure_text: string | null;
          lead_notify_email: string | null;
          autoresponder_subject: string | null;
          autoresponder_body: string | null;
          last_orphan_sweep: string | null;
          last_purge_run: string | null;
          last_sitemap_ping: string | null;
          updated_at: string;
        };
        Insert: {
          id?: number;
          phone?: string | null;
          email?: string | null;
          address_street?: string | null;
          address_locality?: string | null;
          address_region?: string | null;
          address_postal?: string | null;
          office_hours?: string | null;
          profiles_json?: Json;
          positioning?: string | null;
          announcement?: string | null;
          announcement_href?: string | null;
          og_key?: string | null;
          hero_key?: string | null;
          brokerage_name?: string | null;
          license_re?: string | null;
          license_contractor?: string | null;
          disclosure_text?: string | null;
          lead_notify_email?: string | null;
          autoresponder_subject?: string | null;
          autoresponder_body?: string | null;
          last_orphan_sweep?: string | null;
          last_purge_run?: string | null;
          last_sitemap_ping?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: number;
          phone?: string | null;
          email?: string | null;
          address_street?: string | null;
          address_locality?: string | null;
          address_region?: string | null;
          address_postal?: string | null;
          office_hours?: string | null;
          profiles_json?: Json;
          positioning?: string | null;
          announcement?: string | null;
          announcement_href?: string | null;
          og_key?: string | null;
          hero_key?: string | null;
          brokerage_name?: string | null;
          license_re?: string | null;
          license_contractor?: string | null;
          disclosure_text?: string | null;
          lead_notify_email?: string | null;
          autoresponder_subject?: string | null;
          autoresponder_body?: string | null;
          last_orphan_sweep?: string | null;
          last_purge_run?: string | null;
          last_sitemap_ping?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      sync_log: {
        Row: {
          id: string;
          source: string;
          started_at: string;
          finished_at: string | null;
          created: number;
          updated: number;
          removed: number;
          error: string | null;
        };
        Insert: {
          id?: string;
          source: string;
          started_at?: string;
          finished_at?: string | null;
          created?: number;
          updated?: number;
          removed?: number;
          error?: string | null;
        };
        Update: {
          id?: string;
          source?: string;
          started_at?: string;
          finished_at?: string | null;
          created?: number;
          updated?: number;
          removed?: number;
          error?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      listing_card: {
        Row: {
          id: string | null;
          slug: string | null;
          status: string | null;
          listing_type: string | null;
          property_type: string | null;
          price: number | null;
          sold_price: number | null;
          beds: number | null;
          baths: number | null;
          sqft: number | null;
          address: string | null;
          unit: string | null;
          zip: string | null;
          city_id: string | null;
          city_slug: string | null;
          city_name: string | null;
          community_id: string | null;
          cover: Json | null;
          photos_purged: boolean | null;
          is_featured: boolean | null;
          published_at: string | null;
          sold_at: string | null;
        };
        Relationships: [];
      };
      listing_facets: {
        Row: {
          city_id: string | null;
          city_slug: string | null;
          city_name: string | null;
          property_type: string | null;
          listing_type: string | null;
          total: number | null;
          min_price: number | null;
          max_price: number | null;
          min_beds: number | null;
          max_beds: number | null;
          min_baths: number | null;
          max_baths: number | null;
          min_sqft: number | null;
          max_sqft: number | null;
          min_year: number | null;
          max_year: number | null;
          has_pool: boolean | null;
        };
        Relationships: [];
      };
      site_settings_public: {
        Row: {
          id: number | null;
          phone: string | null;
          email: string | null;
          address_street: string | null;
          address_locality: string | null;
          address_region: string | null;
          address_postal: string | null;
          office_hours: string | null;
          profiles_json: Json | null;
          positioning: string | null;
          announcement: string | null;
          announcement_href: string | null;
          og_key: string | null;
          hero_key: string | null;
          brokerage_name: string | null;
          license_re: string | null;
          license_contractor: string | null;
          disclosure_text: string | null;
          updated_at: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      storage_usage: {
        Args: Record<string, never>;
        Returns: {
          total_bytes: number;
          listing_bytes: number;
          article_bytes: number;
          other_bytes: number;
          object_count: number;
        }[];
      };
      tiptap_to_text: { Args: { doc: Json }; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/** Convenience aliases. */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"];
export type Inserts<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type Updates<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
