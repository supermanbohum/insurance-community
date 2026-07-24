/**
 * Supabase 스키마와 대응하는 타입 정의.
 * 실제 운영에서는 `supabase gen types typescript`로 자동 생성하는 것을 권장하며,
 * 이 파일은 그 결과물로 교체될 수 있다. Phase 1 범위의 핵심 테이블만 우선 정의한다.
 */
export type AuthorNameType = 'custom' | 'random' | 'admin' | 'system';
export type BestOverrideStatus = 'auto' | 'force_include' | 'force_exclude';
export type AdminRole = 'super_admin' | 'content_admin' | 'moderation_admin' | 'banner_admin';
export type PostStatus = 'visible' | 'hidden' | 'deleted';

/** ga_branch의 공개 상태 (posts.status와 동일한 값 도메인) */
export type GaStatus = 'visible' | 'hidden' | 'deleted';
/** ga_company의 승인 프로세스 상태 - approved여야만 공개 노출된다 */
export type GaApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type BranchMediaType = 'image_main' | 'image_office' | 'video';
export type BranchMediaSource = 'storage' | 'external';
/** ga_company의 노출 상태 - approval_status(심사)와 별개로 승인 이후에도 관리자가 임시로 내릴 수 있는 스위치. */
export type GaDisplayStatus = 'visible' | 'hidden' | 'deleted';
/** 지점 운영 형태 - 'direct'(직영) | 'branch'(지사). GA가 아니라 지점 단위로 다를 수 있다. */
export type GaOperationType = 'direct' | 'branch';
/** 일반 회원(users)의 로그인 수단. 실제 소셜 로그인 연동 전까지는 Mock Auth에서만 쓰인다. */
export type AuthProviderType = 'kakao' | 'google' | 'email';
/** branch_contacts.type - enum이 아닌 자유 문자열. 알려진 값 기준 UI 매핑용 참고 목록. */
export type KnownBranchContactType =
  | 'phone'
  | 'phone_recruit'
  | 'kakao'
  | 'kakao_open_chat'
  | 'homepage'
  | 'instagram'
  | 'youtube'
  | 'blog';

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
      regions: {
        Row: {
          id: string;
          sido_code: string;
          sido_name: string;
          sigungu_code: string | null;
          sigungu_name: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['regions']['Row']>;
        Update: Partial<Database['public']['Tables']['regions']['Row']>;
        Relationships: [];
      };
      insurers: {
        Row: {
          id: string;
          name: string;
          logo_path: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['insurers']['Row']>;
        Update: Partial<Database['public']['Tables']['insurers']['Row']>;
        Relationships: [];
      };
      ga_company: {
        Row: {
          id: string;
          slug: string;
          name: string;
          ceo_name: string | null;
          description: string | null;
          logo_path: string | null;
          status: GaDisplayStatus;
          is_verified: boolean;
          verified_at: string | null;
          verified_by_admin_id: string | null;
          approval_status: GaApprovalStatus;
          approval_reason: string | null;
          reviewed_by_admin_id: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['ga_company']['Row']>;
        Update: Partial<Database['public']['Tables']['ga_company']['Row']>;
        Relationships: [];
      };
      ga_branch: {
        Row: {
          id: string;
          slug: string;
          ga_company_id: string;
          region_id: string | null;
          name: string;
          manager_name: string | null;
          address: string;
          address_detail: string | null;
          lat: number | null;
          lng: number | null;
          intro_text: string | null;
          education_info: string | null;
          welfare_info: string | null;
          db_support_info: string | null;
          settlement_support_info: string | null;
          atmosphere_info: string | null;
          planner_count: number | null;
          parking_available: boolean | null;
          visit_consult_available: boolean | null;
          business_hours: string | null;
          operation_type: GaOperationType;
          is_headquarters: boolean;
          organic_view_count: number;
          imported_view_count: number;
          correction_view_count: number;
          is_recommended: boolean;
          recommended_rank: number | null;
          status: GaStatus;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['ga_branch']['Row']>;
        Update: Partial<Database['public']['Tables']['ga_branch']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'ga_branch_ga_company_id_fkey';
            columns: ['ga_company_id'];
            isOneToOne: false;
            referencedRelation: 'ga_company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ga_branch_region_id_fkey';
            columns: ['region_id'];
            isOneToOne: false;
            referencedRelation: 'regions';
            referencedColumns: ['id'];
          },
        ];
      };
      branch_media: {
        Row: {
          id: string;
          branch_id: string;
          media_type: BranchMediaType;
          source: BranchMediaSource;
          value: string;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['branch_media']['Row']>;
        Update: Partial<Database['public']['Tables']['branch_media']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'branch_media_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'ga_branch';
            referencedColumns: ['id'];
          },
        ];
      };
      branch_contacts: {
        Row: {
          id: string;
          branch_id: string;
          type: string;
          value: string;
          label: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['branch_contacts']['Row']>;
        Update: Partial<Database['public']['Tables']['branch_contacts']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'branch_contacts_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'ga_branch';
            referencedColumns: ['id'];
          },
        ];
      };
      branch_recruit: {
        Row: {
          id: string;
          branch_id: string;
          title: string;
          content: string;
          employment_type: string | null;
          is_active: boolean;
          start_at: string;
          end_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['branch_recruit']['Row']>;
        Update: Partial<Database['public']['Tables']['branch_recruit']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'branch_recruit_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'ga_branch';
            referencedColumns: ['id'];
          },
        ];
      };
      branch_event: {
        Row: {
          id: string;
          branch_id: string;
          title: string;
          content: string;
          image_path: string | null;
          is_active: boolean;
          start_at: string;
          end_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['branch_event']['Row']>;
        Update: Partial<Database['public']['Tables']['branch_event']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'branch_event_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'ga_branch';
            referencedColumns: ['id'];
          },
        ];
      };
      branch_insurers: {
        Row: {
          branch_id: string;
          insurer_id: string;
        };
        Insert: Partial<Database['public']['Tables']['branch_insurers']['Row']>;
        Update: Partial<Database['public']['Tables']['branch_insurers']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'branch_insurers_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'ga_branch';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'branch_insurers_insurer_id_fkey';
            columns: ['insurer_id'];
            isOneToOne: false;
            referencedRelation: 'insurers';
            referencedColumns: ['id'];
          },
        ];
      };
      branch_views: {
        Row: {
          id: string;
          branch_id: string;
          anonymous_profile_id: string;
          is_admin_view: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['branch_views']['Row']>;
        Update: Partial<Database['public']['Tables']['branch_views']['Row']>;
        Relationships: [];
      };
      branch_contact_clicks: {
        Row: {
          id: string;
          branch_id: string;
          contact_id: string | null;
          contact_type: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['branch_contact_clicks']['Row']>;
        Update: Partial<Database['public']['Tables']['branch_contact_clicks']['Row']>;
        Relationships: [];
      };
      ga_admin_users: {
        Row: {
          id: string;
          auth_user_id: string;
          ga_company_id: string;
          branch_id: string | null;
          email: string;
          display_name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['ga_admin_users']['Row']>;
        Update: Partial<Database['public']['Tables']['ga_admin_users']['Row']>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          auth_user_id: string;
          email: string | null;
          nickname: string;
          profile_image: string | null;
          provider: AuthProviderType;
          approval_status: 'approved' | 'pending' | 'rejected';
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['users']['Row']>;
        Update: Partial<Database['public']['Tables']['users']['Row']>;
        Relationships: [];
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          branch_id: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['favorites']['Row']>;
        Update: Partial<Database['public']['Tables']['favorites']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'favorites_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'favorites_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'ga_branch';
            referencedColumns: ['id'];
          },
        ];
      };
      /** 향후 확장용 - 이번 스코프에서는 타입만 정의하고 CRUD/UI는 구현하지 않는다. */
      reviews: {
        Row: {
          id: string;
          user_id: string;
          branch_id: string;
          rating: number;
          content: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['reviews']['Row']>;
        Update: Partial<Database['public']['Tables']['reviews']['Row']>;
        Relationships: [];
      };
      /** 향후 확장용 - 이번 스코프에서는 타입만 정의하고 CRUD/UI는 구현하지 않는다. */
      recent_views: {
        Row: {
          id: string;
          user_id: string;
          branch_id: string;
          viewed_at: string;
        };
        Insert: Partial<Database['public']['Tables']['recent_views']['Row']>;
        Update: Partial<Database['public']['Tables']['recent_views']['Row']>;
        Relationships: [];
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
      current_admin_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      is_ga_admin_for_branch: {
        Args: { p_branch_id: string };
        Returns: boolean;
      };
      create_ga_company: {
        Args: {
          p_slug: string;
          p_name: string;
          p_ceo_name?: string;
          p_description?: string;
          p_logo_path?: string;
        };
        Returns: string;
      };
      update_ga_company: {
        Args: {
          p_ga_company_id: string;
          p_name?: string;
          p_ceo_name?: string;
          p_description?: string;
          p_logo_path?: string;
          p_status?: GaDisplayStatus;
        };
        Returns: void;
      };
      verify_ga_company: {
        Args: { p_ga_company_id: string; p_verified: boolean };
        Returns: void;
      };
      set_ga_company_approval_status: {
        Args: { p_ga_company_id: string; p_status: GaApprovalStatus; p_reason?: string };
        Returns: void;
      };
      set_ga_company_status: {
        Args: { p_ga_company_id: string; p_status: GaDisplayStatus };
        Returns: void;
      };
      get_ga_company_delete_impact: {
        Args: { p_ga_company_id: string };
        Returns: { branch_count: number }[];
      };
      get_branch_delete_impact: {
        Args: { p_branch_id: string };
        Returns: { media_count: number; contacts_count: number; active_recruit_count: number; view_count: number }[];
      };
      create_branch: {
        Args: {
          p_ga_company_id: string;
          p_region_id: string | null;
          p_slug: string;
          p_name: string;
          p_manager_name?: string;
          p_address: string;
          p_address_detail?: string;
          p_lat?: number;
          p_lng?: number;
          p_intro_text?: string;
          p_education_info?: string;
          p_welfare_info?: string;
          p_db_support_info?: string;
          p_settlement_support_info?: string;
          p_atmosphere_info?: string;
          p_planner_count?: number;
          p_parking_available?: boolean;
          p_visit_consult_available?: boolean;
          p_business_hours?: string;
          p_operation_type?: GaOperationType;
          p_is_headquarters?: boolean;
        };
        Returns: string;
      };
      update_branch: {
        Args: {
          p_branch_id: string;
          p_name: string;
          p_manager_name?: string;
          p_region_id: string | null;
          p_address: string;
          p_address_detail?: string;
          p_lat?: number;
          p_lng?: number;
          p_intro_text?: string;
          p_education_info?: string;
          p_welfare_info?: string;
          p_db_support_info?: string;
          p_settlement_support_info?: string;
          p_atmosphere_info?: string;
          p_planner_count?: number;
          p_parking_available?: boolean;
          p_visit_consult_available?: boolean;
          p_business_hours?: string;
          p_operation_type?: GaOperationType;
          p_is_headquarters?: boolean;
        };
        Returns: void;
      };
      set_branch_status: {
        Args: { p_branch_id: string; p_status: GaStatus };
        Returns: void;
      };
      set_branch_recommended: {
        Args: { p_branch_id: string; p_is_recommended: boolean; p_recommended_rank?: number };
        Returns: void;
      };
      update_branch_profile: {
        Args: {
          p_branch_id: string;
          p_intro_text: string;
          p_education_info: string;
          p_welfare_info: string;
          p_db_support_info: string;
          p_settlement_support_info: string;
          p_atmosphere_info?: string;
        };
        Returns: void;
      };
      add_branch_media: {
        Args: {
          p_branch_id: string;
          p_media_type: BranchMediaType;
          p_source: BranchMediaSource;
          p_value: string;
          p_sort_order?: number;
        };
        Returns: string;
      };
      delete_branch_media: {
        Args: { p_media_id: string };
        Returns: string;
      };
      upsert_branch_contact: {
        Args: {
          p_contact_id: string | null;
          p_branch_id: string;
          p_type: string;
          p_value: string;
          p_label?: string;
          p_sort_order?: number;
        };
        Returns: string;
      };
      delete_branch_contact: {
        Args: { p_contact_id: string };
        Returns: void;
      };
      create_branch_recruit: {
        Args: { p_branch_id: string; p_title: string; p_content: string; p_employment_type?: string; p_end_at?: string };
        Returns: string;
      };
      update_branch_recruit: {
        Args: {
          p_recruit_id: string;
          p_title: string;
          p_content: string;
          p_employment_type?: string;
          p_end_at?: string;
          p_is_active?: boolean;
        };
        Returns: void;
      };
      close_branch_recruit: {
        Args: { p_recruit_id: string };
        Returns: void;
      };
      create_branch_event: {
        Args: { p_branch_id: string; p_title: string; p_content: string; p_image_path?: string; p_start_at?: string; p_end_at?: string };
        Returns: string;
      };
      update_branch_event: {
        Args: {
          p_event_id: string;
          p_title: string;
          p_content: string;
          p_image_path?: string;
          p_start_at?: string;
          p_end_at?: string;
          p_is_active?: boolean;
        };
        Returns: void;
      };
      set_branch_insurers: {
        Args: { p_branch_id: string; p_insurer_ids: string[] };
        Returns: void;
      };
      record_branch_view: {
        Args: { p_branch_id: string };
        Returns: void;
      };
      record_branch_contact_click: {
        Args: { p_contact_id: string };
        Returns: void;
      };
      get_branch_stats: {
        Args: { p_branch_id: string };
        Returns: { total_views: number; today_views: number; contact_clicks: number }[];
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

/** 지점 목록/카드에 노출되는 표시값 (organic+imported+correction 합산 결과만 포함) */
export interface PublicBranchSummary {
  id: string;
  /** 공개 상세페이지(/branch/[slug]) 라우팅 키. */
  slug: string;
  gaCompanyId: string;
  gaCompanyName: string;
  gaCompanyLogoUrl: string | null;
  isGaVerified: boolean;
  name: string;
  sidoName: string | null;
  sigunguName: string | null;
  address: string;
  mainImageUrl: string | null;
  viewCount: number;
  isRecommended: boolean;
  createdAt: string;
  updatedAt: string;
  gaBranchCount: number;
  operationType: GaOperationType;
  isHeadquarters: boolean;
  lat: number | null;
  lng: number | null;
  hasActiveRecruit: boolean;
}
