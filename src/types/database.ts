/**
 * Supabase 스키마와 대응하는 타입 정의.
 * 실제 운영에서는 `supabase gen types typescript`로 자동 생성하는 것을 권장하며,
 * 이 파일은 그 결과물로 교체될 수 있다. Phase 1 범위의 핵심 테이블만 우선 정의한다.
 */
export type AuthorNameType = 'custom' | 'random' | 'admin' | 'system';
export type BestOverrideStatus = 'auto' | 'force_include' | 'force_exclude';
export type AdminRole = 'super_admin' | 'content_admin' | 'moderation_admin' | 'banner_admin';
export type PostStatus = 'visible' | 'hidden' | 'deleted';

export interface Database {
  public: {
    Tables: {
      anonymous_profiles: {
        Row: {
          id: string;
          auth_user_id: string;
          last_author_name: string | null;
          is_blocked: boolean;
          blocked_until: string | null;
          blocked_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['anonymous_profiles']['Row']>;
        Update: Partial<Database['public']['Tables']['anonymous_profiles']['Row']>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          is_active: boolean;
          admin_only_write: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['categories']['Row']>;
        Update: Partial<Database['public']['Tables']['categories']['Row']>;
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          category_id: string;
          author_id: string;
          author_admin_id: string | null;
          title: string;
          content: string;
          author_display_name: string;
          author_name_type: AuthorNameType;
          organic_view_count: number;
          imported_view_count: number;
          correction_view_count: number;
          organic_upvote_count: number;
          imported_upvote_count: number;
          correction_upvote_count: number;
          organic_downvote_count: number;
          imported_downvote_count: number;
          correction_downvote_count: number;
          organic_comment_count: number;
          correction_comment_count: number;
          auto_best_score: number;
          best_override_status: BestOverrideStatus;
          best_rank_override: number | null;
          editor_pick: boolean;
          editor_pick_rank: number | null;
          editor_pick_reason: string | null;
          editor_pick_start_at: string | null;
          editor_pick_end_at: string | null;
          is_pinned: boolean;
          pinned_rank: number | null;
          is_notice: boolean;
          status: PostStatus;
          is_seo_indexable: boolean;
          report_count: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['posts']['Row']>;
        Update: Partial<Database['public']['Tables']['posts']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'posts_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          parent_comment_id: string | null;
          author_id: string;
          author_admin_id: string | null;
          content: string;
          author_display_name: string;
          author_name_type: AuthorNameType;
          organic_upvote_count: number;
          imported_upvote_count: number;
          correction_upvote_count: number;
          organic_downvote_count: number;
          imported_downvote_count: number;
          correction_downvote_count: number;
          is_pinned: boolean;
          is_best_comment: boolean;
          status: PostStatus;
          report_count: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['comments']['Row']>;
        Update: Partial<Database['public']['Tables']['comments']['Row']>;
        Relationships: [];
      };
      admin_users: {
        Row: {
          id: string;
          auth_user_id: string;
          email: string;
          display_name: string;
          role: AdminRole;
          can_adjust_metrics: boolean;
          can_override_best: boolean;
          can_edit_author_name: boolean;
          can_change_created_at: boolean;
          can_pin_posts: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['admin_users']['Row']>;
        Update: Partial<Database['public']['Tables']['admin_users']['Row']>;
        Relationships: [];
      };
      site_settings: {
        Row: {
          key: string;
          value: unknown;
          updated_by_admin_id: string | null;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['site_settings']['Row']>;
        Update: Partial<Database['public']['Tables']['site_settings']['Row']>;
        Relationships: [];
      };
      post_images: {
        Row: {
          id: string;
          post_id: string;
          storage_path: string;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['post_images']['Row']>;
        Update: Partial<Database['public']['Tables']['post_images']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'post_images_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      public_banners: {
        Row: {
          id: string;
          pc_image_path: string | null;
          mobile_image_path: string | null;
          link_url: string;
          slot: string;
          priority: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      current_profile_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      is_current_user_blocked: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      create_post: {
        Args: {
          p_category_id: string;
          p_title: string;
          p_content: string;
          p_author_display_name: string;
          p_author_name_type?: AuthorNameType;
        };
        Returns: string;
      };
      add_post_image: {
        Args: {
          p_post_id: string;
          p_storage_path: string;
          p_sort_order?: number;
        };
        Returns: string;
      };
      delete_post_image: {
        Args: { p_image_id: string };
        Returns: string;
      };
      publish_post: {
        Args: { p_post_id: string };
        Returns: void;
      };
      delete_post_hard: {
        Args: { p_post_id: string };
        Returns: string[];
      };
      update_post: {
        Args: { p_post_id: string; p_title: string; p_content: string };
        Returns: void;
      };
      soft_delete_post: {
        Args: { p_post_id: string };
        Returns: string[];
      };
      record_post_view: {
        Args: { p_post_id: string };
        Returns: void;
      };
    };
  };
}

/** 화면에 노출되는 게시글 최종 표시값 (organic+imported+correction 계산 결과만 포함) */
export interface PublicPostSummary {
  id: string;
  categorySlug: string;
  categoryName: string;
  title: string;
  authorDisplayName: string;
  viewCount: number;
  upvoteCount: number;
  downvoteCount: number;
  commentCount: number;
  isBest: boolean;
  isEditorPick: boolean;
  isNotice: boolean;
  isPinned: boolean;
  hasImage: boolean;
  createdAt: string;
}
