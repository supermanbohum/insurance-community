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

/** ga_branch.registration_status - 지점 등록/신뢰도 항목 수정 승인 게이트 (0022) */
export type GaBranchRegistrationStatus = 'pending' | 'approved' | 'rejected';
/** ga_branch.status_reason - status='hidden'이 된 원인 구분 (콘텐츠 검수/결제 미납/수동) */
export type GaBranchStatusReason = 'content_review' | 'payment_suspended' | 'manual';
export type BranchRegistrationRequestType = 'create' | 'update';
export type BranchRegistrationStatus = 'pending' | 'approved' | 'rejected';
/** 고소득 설계사 연봉 구간 - tier_1=1억+, tier_2=2억+, tier_3=3억+ */
export type PlannerIncomeTier = 'tier_1' | 'tier_2' | 'tier_3';
export type PlannerCertificationStatus = 'pending_review' | 'approved' | 'rejected' | 'pending_renewal';
export type PlannerCertificationHistoryEventType = 'initial_approval' | 'renewal_approval' | 'rejection';
export type PlannerApplicationSource = 'partner' | 'public';
export type VerificationDocumentOwnerType = 'planner_certification' | 'planner_badge';
export type VerificationDocumentType = 'withholding_tax_certificate' | 'badge_document';
export type SubscriptionSubjectType = 'branch_listing' | 'planner_addon';
export type SubscriptionPlanCode = 'branch_standard' | 'branch_early_bird' | 'planner_addon';
export type SubscriptionStatus = 'active' | 'past_due' | 'grace_period' | 'suspended' | 'canceled';
export type PaymentTransactionStatus = 'succeeded' | 'failed' | 'refunded';

/** 설계사 마켓(0034~0036) - TOP설계사(planner_certifications)와는 완전히 별개인 시스템. */
export type PlannerProfileStatus = 'pending_review' | 'approved' | 'rejected';
/** 확장형 배지 시스템(0038) - 새 배지 종류는 planner_badge_types에 행만 추가하면 되고
 * 이 status 도메인은 모든 배지 종류가 공유한다(연봉인증/TOP설계사/본인인증/향후 MDRT 등). */
export type PlannerBadgeStatus = 'pending_review' | 'approved' | 'rejected';

/** public_planner_profiles 뷰의 badges 컬럼(jsonb 배열) 원소 하나. */
export interface PlannerBadgeSummary {
  code: string;
  label: string;
  icon: string;
}
export type CreditPurchaseTierCode = 'credits_1' | 'credits_10' | 'credits_30' | 'credits_50' | 'credits_100';
export type CreditPurchaseStatus = 'paid' | 'refunded' | 'failed';

/** 지점 광고 상품(0037) - 설계사 마켓과 완전히 독립된 두 번째 수익 스트림. */
export type AdProductType =
  | 'featured_branch'
  | 'main_banner'
  | 'region_top_pin'
  | 'search_top'
  | 'new_open_badge'
  | 'top_exposure'
  | 'event_banner';
export type BranchAdProductStatus = 'pending_review' | 'approved' | 'rejected' | 'expired' | 'canceled';
export type AdPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

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
      event_popups: {
        Row: {
          id: string;
          is_active: boolean;
          start_at: string | null;
          end_at: string | null;
          eyebrow: string;
          headline: string;
          offer_label: string;
          old_price: string;
          badge: string;
          highlight: string;
          highlight_suffix: string;
          description: string;
          features: string[];
          footnote: string;
          cta_label: string;
          cta_href: string;
          updated_by_admin_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['event_popups']['Row']>;
        Update: Partial<Database['public']['Tables']['event_popups']['Row']>;
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
      audit_logs: {
        Row: {
          id: string;
          admin_id: string;
          target_type: string;
          target_id: string;
          action: string;
          reason_code: string | null;
          reason_detail: string | null;
          before_value: unknown | null;
          after_value: unknown | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['audit_logs']['Row']>;
        Update: Partial<Database['public']['Tables']['audit_logs']['Row']>;
        Relationships: [];
      };
      page_layouts: {
        Row: {
          id: string;
          page_key: string;
          device: string;
          config: unknown;
          updated_by_admin_id: string | null;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['page_layouts']['Row']>;
        Update: Partial<Database['public']['Tables']['page_layouts']['Row']>;
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
          new_recruit_training: boolean | null;
          experienced_hire: boolean | null;
          db_support: boolean | null;
          settlement_support: boolean | null;
          business_hours: string | null;
          tagline: string | null;
          contact_click_count: number;
          operation_type: GaOperationType;
          is_headquarters: boolean;
          organic_view_count: number;
          imported_view_count: number;
          correction_view_count: number;
          is_recommended: boolean;
          recommended_rank: number | null;
          status: GaStatus;
          registration_status: GaBranchRegistrationStatus;
          status_reason: GaBranchStatusReason | null;
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
          pending_registration_id: string | null;
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
      branch_links: {
        Row: {
          id: string;
          branch_id: string;
          type: string;
          url: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['branch_links']['Row']>;
        Update: Partial<Database['public']['Tables']['branch_links']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'branch_links_branch_id_fkey';
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
          username: string | null;
          contact: string | null;
          ga_company_id: string | null;
          email_verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['users']['Row']>;
        Update: Partial<Database['public']['Tables']['users']['Row']>;
        Relationships: [];
      };
      user_ga_change_requests: {
        Row: {
          id: string;
          user_id: string;
          current_ga_company_id: string | null;
          requested_ga_company_id: string;
          status: 'pending' | 'approved' | 'rejected';
          reviewed_by_admin_id: string | null;
          reviewed_at: string | null;
          review_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['user_ga_change_requests']['Row']>;
        Update: Partial<Database['public']['Tables']['user_ga_change_requests']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'user_ga_change_requests_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          body: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['chat_messages']['Row']>;
        Update: Partial<Database['public']['Tables']['chat_messages']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'chat_messages_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
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
      branch_registrations: {
        Row: {
          id: string;
          request_type: BranchRegistrationRequestType;
          status: BranchRegistrationStatus;
          branch_id: string | null;
          ga_company_id: string | null;
          submitted_by_ga_admin_id: string;
          registrant_name: string;
          registrant_title: string;
          registrant_phone: string;
          registrant_company: string;
          registrant_branch_label: string;
          lease_contract_path: string | null;
          business_card_path: string | null;
          payload: Record<string, unknown>;
          reviewed_by_admin_id: string | null;
          reviewed_at: string | null;
          review_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['branch_registrations']['Row']>;
        Update: Partial<Database['public']['Tables']['branch_registrations']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'branch_registrations_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'ga_branch';
            referencedColumns: ['id'];
          },
        ];
      };
      planner_certifications: {
        Row: {
          id: string;
          branch_id: string;
          submitted_by_ga_admin_id: string | null;
          planner_name: string;
          planner_phone: string;
          planner_company: string;
          job_title: string | null;
          income_tier: PlannerIncomeTier;
          status: PlannerCertificationStatus;
          application_source: PlannerApplicationSource;
          approved_at: string | null;
          expires_at: string | null;
          approved_by_admin_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['planner_certifications']['Row']>;
        Update: Partial<Database['public']['Tables']['planner_certifications']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'planner_certifications_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'ga_branch';
            referencedColumns: ['id'];
          },
        ];
      };
      planner_certification_history: {
        Row: {
          id: string;
          certification_id: string;
          event_type: PlannerCertificationHistoryEventType;
          income_tier: PlannerIncomeTier;
          approved_by_admin_id: string | null;
          approval_memo: string | null;
          effective_from: string;
          effective_until: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['planner_certification_history']['Row']>;
        Update: Partial<Database['public']['Tables']['planner_certification_history']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'planner_certification_history_certification_id_fkey';
            columns: ['certification_id'];
            isOneToOne: false;
            referencedRelation: 'planner_certifications';
            referencedColumns: ['id'];
          },
        ];
      };
      verification_documents: {
        Row: {
          id: string;
          owner_type: VerificationDocumentOwnerType;
          owner_id: string;
          doc_type: VerificationDocumentType;
          storage_path: string;
          uploaded_at: string;
        };
        Insert: Partial<Database['public']['Tables']['verification_documents']['Row']>;
        Update: Partial<Database['public']['Tables']['verification_documents']['Row']>;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          subject_type: SubscriptionSubjectType;
          subject_id: string;
          ga_company_id: string;
          plan_code: SubscriptionPlanCode;
          monthly_amount_krw: number;
          status: SubscriptionStatus;
          current_period_end: string;
          grace_period_ends_at: string | null;
          last_payment_failure_at: string | null;
          auto_unpublished_at: string | null;
          manually_restored_by_admin_id: string | null;
          manually_restored_at: string | null;
          payment_provider: string;
          provider_subscription_ref: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['subscriptions']['Row']>;
        Update: Partial<Database['public']['Tables']['subscriptions']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'subscriptions_ga_company_id_fkey';
            columns: ['ga_company_id'];
            isOneToOne: false;
            referencedRelation: 'ga_company';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_transactions: {
        Row: {
          id: string;
          subscription_id: string;
          amount_krw: number;
          status: PaymentTransactionStatus;
          provider_transaction_ref: string | null;
          failure_reason: string | null;
          attempted_at: string;
        };
        Insert: Partial<Database['public']['Tables']['payment_transactions']['Row']>;
        Update: Partial<Database['public']['Tables']['payment_transactions']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'payment_transactions_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'subscriptions';
            referencedColumns: ['id'];
          },
        ];
      };
      planner_profiles: {
        Row: {
          id: string;
          user_id: string;
          profile_photo_path: string | null;
          active_region_id: string;
          career_years: number;
          specialties: string[];
          self_introduction: string | null;
          currently_employed: boolean;
          open_to_move: boolean;
          desired_region_id: string | null;
          desired_ga_company_id: string | null;
          desired_conditions: string | null;
          name: string;
          phone: string;
          email: string;
          kakao_id: string | null;
          status: PlannerProfileStatus;
          reviewed_by_admin_id: string | null;
          reviewed_at: string | null;
          review_reason: string | null;
          is_hidden: boolean;
          withdrawn_at: string | null;
          contact_sharing_revoked_at: string | null;
          consent_contact_paid_view: boolean;
          consent_recruit_contact: boolean;
          consent_privacy_policy: boolean;
          consent_third_party_share: boolean;
          consent_withdrawal_notice: boolean;
          consent_agreed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['planner_profiles']['Row']>;
        Update: Partial<Database['public']['Tables']['planner_profiles']['Row']>;
        Relationships: [];
      };
      planner_badge_types: {
        Row: {
          code: string;
          label: string;
          icon: string;
          description: string | null;
          requires_document: boolean;
          self_applicable: boolean;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['planner_badge_types']['Row']>;
        Update: Partial<Database['public']['Tables']['planner_badge_types']['Row']>;
        Relationships: [];
      };
      planner_badges: {
        Row: {
          id: string;
          planner_profile_id: string;
          badge_type_code: string;
          status: PlannerBadgeStatus;
          granted_by_admin_id: string | null;
          granted_at: string | null;
          review_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['planner_badges']['Row']>;
        Update: Partial<Database['public']['Tables']['planner_badges']['Row']>;
        Relationships: [];
      };
      planner_profile_views: {
        Row: {
          id: string;
          planner_profile_id: string;
          viewed_at: string;
        };
        Insert: Partial<Database['public']['Tables']['planner_profile_views']['Row']>;
        Update: Partial<Database['public']['Tables']['planner_profile_views']['Row']>;
        Relationships: [];
      };
      planner_market_credit_purchases: {
        Row: {
          id: string;
          ga_company_id: string;
          purchased_by_ga_admin_id: string;
          tier_code: CreditPurchaseTierCode;
          credit_count: number;
          unit_price_krw: number;
          amount_krw: number;
          status: CreditPurchaseStatus;
          payment_method: string | null;
          provider_transaction_ref: string | null;
          refunded_by_admin_id: string | null;
          refunded_at: string | null;
          refund_reason: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['planner_market_credit_purchases']['Row']>;
        Update: Partial<Database['public']['Tables']['planner_market_credit_purchases']['Row']>;
        Relationships: [];
      };
      planner_market_credit_balances: {
        Row: {
          ga_company_id: string;
          balance: number;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['planner_market_credit_balances']['Row']>;
        Update: Partial<Database['public']['Tables']['planner_market_credit_balances']['Row']>;
        Relationships: [];
      };
      planner_market_credit_unlocks: {
        Row: {
          id: string;
          ga_company_id: string;
          planner_profile_id: string;
          unlocked_by_ga_admin_id: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['planner_market_credit_unlocks']['Row']>;
        Update: Partial<Database['public']['Tables']['planner_market_credit_unlocks']['Row']>;
        Relationships: [];
      };
      planner_market_credit_adjustments: {
        Row: {
          id: string;
          ga_company_id: string;
          delta: number;
          reason: string;
          adjusted_by_admin_id: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['planner_market_credit_adjustments']['Row']>;
        Update: Partial<Database['public']['Tables']['planner_market_credit_adjustments']['Row']>;
        Relationships: [];
      };
      ad_payments: {
        Row: {
          id: string;
          buyer_id: string;
          product_type: AdProductType;
          amount: number;
          vat: number;
          total_amount: number;
          payment_method: string | null;
          pg_tid: string | null;
          status: AdPaymentStatus;
          paid_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['ad_payments']['Row']>;
        Update: Partial<Database['public']['Tables']['ad_payments']['Row']>;
        Relationships: [];
      };
      branch_ad_products: {
        Row: {
          id: string;
          branch_id: string;
          product_type: AdProductType;
          start_at: string;
          end_at: string;
          status: BranchAdProductStatus;
          payment_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['branch_ad_products']['Row']>;
        Update: Partial<Database['public']['Tables']['branch_ad_products']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'branch_ad_products_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'ga_branch';
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
      public_planner_profiles: {
        Row: {
          id: string;
          profile_photo_path: string | null;
          active_region_id: string;
          career_years: number;
          specialties: string[];
          self_introduction: string | null;
          currently_employed: boolean;
          open_to_move: boolean;
          desired_region_id: string | null;
          desired_ga_company_id: string | null;
          desired_conditions: string | null;
          created_at: string;
          badges: PlannerBadgeSummary[];
          has_income_verified: boolean;
          has_top_planner: boolean;
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
      signup_ga_admin: {
        Args: { p_display_name?: string | null };
        Returns: Database['public']['Tables']['ga_admin_users']['Row'];
      };
      register_ga_for_partner: {
        Args: {
          p_slug: string;
          p_name: string;
          p_ceo_name?: string | null;
          p_description?: string | null;
          p_branch_slug: string;
          p_branch_name: string;
          p_region_id: string | null;
          p_manager_name?: string | null;
          p_address: string;
          p_address_detail?: string | null;
          p_intro_text?: string | null;
          p_planner_count?: number | null;
          p_parking_available?: boolean | null;
          p_visit_consult_available?: boolean | null;
          p_business_hours?: string | null;
          p_lat?: number | null;
          p_lng?: number | null;
        };
        Returns: { ga_company_id: string; branch_id: string }[];
      };
      register_branch_for_partner: {
        Args: {
          p_ga_name: string;
          p_branch_slug: string;
          p_branch_name: string;
          p_region_id: string | null;
          p_manager_name?: string | null;
          p_address: string;
          p_address_detail?: string | null;
          p_intro_text?: string | null;
          p_planner_count?: number | null;
          p_parking_available?: boolean | null;
          p_visit_consult_available?: boolean | null;
          p_business_hours?: string | null;
          p_lat?: number | null;
          p_lng?: number | null;
          p_tagline?: string | null;
          p_new_recruit_training?: boolean | null;
          p_experienced_hire?: boolean | null;
          p_db_support?: boolean | null;
          p_settlement_support?: boolean | null;
        };
        Returns: { ga_company_id: string; branch_id: string }[];
      };
      create_partner_branch: {
        Args: {
          p_slug: string;
          p_name: string;
          p_region_id: string | null;
          p_manager_name?: string | null;
          p_address: string;
          p_address_detail?: string | null;
          p_intro_text?: string | null;
          p_planner_count?: number | null;
          p_parking_available?: boolean | null;
          p_visit_consult_available?: boolean | null;
          p_business_hours?: string | null;
          p_lat?: number | null;
          p_lng?: number | null;
        };
        Returns: string;
      };
      update_partner_ga_company: {
        Args: { p_name: string; p_ceo_name?: string | null; p_description?: string | null };
        Returns: void;
      };
      update_partner_branch: {
        Args: {
          p_branch_id: string;
          p_name: string;
          p_region_id: string | null;
          p_address: string;
          p_address_detail?: string | null;
          p_intro_text?: string | null;
          p_education_info?: string | null;
          p_welfare_info?: string | null;
          p_db_support_info?: string | null;
          p_settlement_support_info?: string | null;
          p_planner_count?: number | null;
          p_parking_available?: boolean | null;
          p_visit_consult_available?: boolean | null;
          p_business_hours?: string | null;
          p_tagline?: string | null;
          p_new_recruit_training?: boolean | null;
          p_experienced_hire?: boolean | null;
          p_db_support?: boolean | null;
          p_settlement_support?: boolean | null;
        };
        Returns: void;
      };
      upsert_branch_link: {
        Args: {
          p_link_id: string | null;
          p_branch_id: string;
          p_type: string;
          p_url: string;
          p_sort_order?: number;
        };
        Returns: string;
      };
      delete_branch_link: {
        Args: { p_link_id: string };
        Returns: void;
      };
      list_monthly_top_branches: {
        Args: { p_limit?: number };
        Returns: { branch_id: string; view_count: number }[];
      };
      upsert_page_layout: {
        Args: { p_page_key: string; p_device: string; p_config: unknown };
        Returns: void;
      };
      submit_branch_registration: {
        Args: {
          p_ga_name: string;
          p_branch_slug: string;
          p_branch_name: string;
          p_region_id: string | null;
          p_manager_name?: string | null;
          p_address: string;
          p_address_detail?: string | null;
          p_registrant_name: string;
          p_registrant_title: string;
          p_registrant_phone: string;
          p_registrant_company: string;
          p_registrant_branch_label: string;
          p_intro_text?: string | null;
          p_planner_count?: number | null;
          p_parking_available?: boolean | null;
          p_visit_consult_available?: boolean | null;
          p_business_hours?: string | null;
          p_lat?: number | null;
          p_lng?: number | null;
          p_tagline?: string | null;
          p_new_recruit_training?: boolean | null;
          p_experienced_hire?: boolean | null;
          p_db_support?: boolean | null;
          p_settlement_support?: boolean | null;
        };
        Returns: { registration_id: string; ga_company_id: string; branch_id: string }[];
      };
      attach_registration_document: {
        Args: { p_registration_id: string; p_doc_type: string; p_path: string };
        Returns: void;
      };
      submit_branch_update: {
        Args: {
          p_branch_id: string;
          p_registrant_name: string;
          p_registrant_title: string;
          p_registrant_phone: string;
          p_registrant_company: string;
          p_registrant_branch_label: string;
          p_payload: Record<string, unknown>;
        };
        Returns: string;
      };
      review_branch_registration: {
        Args: { p_registration_id: string; p_decision: string; p_reason?: string | null };
        Returns: void;
      };
      list_my_branch_registrations: {
        Args: Record<string, never>;
        Returns: Database['public']['Tables']['branch_registrations']['Row'][];
      };
      is_blocked_planner_title: {
        Args: { p_job_title: string };
        Returns: boolean;
      };
      submit_planner_certification: {
        Args: {
          p_branch_id: string;
          p_planner_name: string;
          p_planner_phone: string;
          p_planner_company: string;
          p_job_title: string;
          p_income_tier: string;
          p_withholding_doc_path: string;
        };
        Returns: string;
      };
      submit_top_planner_application: {
        Args: {
          p_branch_id: string;
          p_planner_name: string;
          p_planner_phone: string;
          p_planner_company: string;
          p_income_tier: string;
          p_withholding_doc_path: string;
        };
        Returns: string;
      };
      renew_planner_certification: {
        Args: { p_certification_id: string; p_withholding_doc_path: string };
        Returns: void;
      };
      review_planner_certification: {
        Args: { p_certification_id: string; p_decision: string; p_memo?: string | null };
        Returns: void;
      };
      get_branch_planner_badge_summary: {
        Args: { p_branch_id: string };
        Returns: { tier: string; planner_count: number }[];
      };
      list_branches_with_planner_certifications: {
        Args: { p_tiers?: string[] | null };
        Returns: { branch_id: string }[];
      };
      create_branch_subscription: {
        Args: { p_branch_id: string };
        Returns: string;
      };
      create_planner_addon_subscription: {
        Args: { p_certification_id: string };
        Returns: string;
      };
      record_payment_result: {
        Args: {
          p_subscription_id: string;
          p_succeeded: boolean;
          p_amount_krw: number;
          p_provider_transaction_ref?: string | null;
          p_failure_reason?: string | null;
        };
        Returns: void;
      };
      advance_grace_period_expirations: {
        Args: Record<string, never>;
        Returns: number;
      };
      admin_restore_subscription: {
        Args: { p_subscription_id: string };
        Returns: void;
      };
      set_media_pending_registration: {
        Args: { p_media_id: string; p_registration_id: string };
        Returns: void;
      };
      current_member_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      is_full_member: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      check_username_available: {
        Args: { p_username: string };
        Returns: boolean;
      };
      get_email_by_username: {
        Args: { p_username: string };
        Returns: string;
      };
      confirm_email_signup: {
        Args: Record<string, never>;
        Returns: Database['public']['Tables']['users']['Row'];
      };
      update_my_contact: {
        Args: { p_contact: string };
        Returns: void;
      };
      request_ga_change: {
        Args: { p_ga_company_id: string };
        Returns: string;
      };
      review_ga_change_request: {
        Args: { p_request_id: string; p_decision: string; p_reason?: string | null };
        Returns: void;
      };
      list_my_ga_change_requests: {
        Args: Record<string, never>;
        Returns: Database['public']['Tables']['user_ga_change_requests']['Row'][];
      };
      send_chat_message: {
        Args: { p_body: string };
        Returns: Database['public']['Tables']['chat_messages']['Row'];
      };
      list_chat_messages: {
        Args: { p_before?: string | null; p_limit?: number };
        Returns: { id: string; user_id: string; nickname: string; ga_company_name: string | null; body: string; created_at: string }[];
      };
      get_chat_message: {
        Args: { p_message_id: string };
        Returns: { id: string; user_id: string; nickname: string; ga_company_name: string | null; body: string; created_at: string }[];
      };
      get_chat_sender_labels: {
        Args: { p_user_ids: string[] };
        Returns: { user_id: string; nickname: string; ga_company_name: string | null }[];
      };
      is_owner_of_planner_profile: {
        Args: { p_planner_profile_id: string };
        Returns: boolean;
      };
      submit_planner_market_profile: {
        Args: {
          p_name: string;
          p_phone: string;
          p_email: string;
          p_active_region_id: string;
          p_career_years: number;
          p_specialties: string[];
          p_currently_employed: boolean;
          p_open_to_move: boolean;
          p_consent_contact_paid_view: boolean;
          p_consent_recruit_contact: boolean;
          p_consent_privacy_policy: boolean;
          p_consent_third_party_share: boolean;
          p_consent_withdrawal_notice: boolean;
          p_kakao_id?: string | null;
          p_profile_photo_path?: string | null;
          p_self_introduction?: string | null;
          p_desired_region_id?: string | null;
          p_desired_ga_company_id?: string | null;
          p_desired_conditions?: string | null;
        };
        Returns: string;
      };
      update_planner_market_profile: {
        Args: {
          p_planner_profile_id: string;
          p_name: string;
          p_phone: string;
          p_email: string;
          p_active_region_id: string;
          p_career_years: number;
          p_specialties: string[];
          p_currently_employed: boolean;
          p_open_to_move: boolean;
          p_kakao_id?: string | null;
          p_profile_photo_path?: string | null;
          p_self_introduction?: string | null;
          p_desired_region_id?: string | null;
          p_desired_ga_company_id?: string | null;
          p_desired_conditions?: string | null;
        };
        Returns: void;
      };
      set_planner_profile_hidden: {
        Args: { p_planner_profile_id: string; p_hidden: boolean };
        Returns: void;
      };
      withdraw_planner_profile: {
        Args: { p_planner_profile_id: string };
        Returns: void;
      };
      revoke_planner_contact_sharing: {
        Args: { p_planner_profile_id: string };
        Returns: void;
      };
      get_my_planner_market_profile: {
        Args: Record<string, never>;
        Returns: Database['public']['Tables']['planner_profiles']['Row'][];
      };
      admin_review_planner_market_profile: {
        Args: { p_planner_profile_id: string; p_decision: string; p_reason?: string | null };
        Returns: void;
      };
      submit_planner_badge_application: {
        Args: { p_planner_profile_id: string; p_badge_type_code: string; p_doc_path?: string | null };
        Returns: string;
      };
      admin_review_planner_badge: {
        Args: { p_badge_id: string; p_decision: string; p_reason?: string | null };
        Returns: void;
      };
      admin_reset_planner_badge_for_review: {
        Args: { p_badge_id: string };
        Returns: void;
      };
      admin_grant_planner_badge: {
        Args: { p_planner_profile_id: string; p_badge_type_code: string; p_reason?: string | null };
        Returns: string;
      };
      admin_revoke_planner_badge: {
        Args: { p_badge_id: string; p_reason?: string | null };
        Returns: void;
      };
      record_planner_profile_view: {
        Args: { p_planner_profile_id: string };
        Returns: void;
      };
      get_my_planner_market_profile_stats: {
        Args: Record<string, never>;
        Returns: { total_views: number; views_last_7_days: number; contact_unlock_count: number }[];
      };
      purchase_planner_market_credits: {
        Args: { p_tier_code: string; p_payment_method: string; p_provider_transaction_ref: string };
        Returns: string;
      };
      get_planner_contact: {
        Args: { p_planner_profile_id: string };
        Returns: { name: string; phone: string; email: string; kakao_id: string | null }[];
      };
      get_my_planner_market_credit_balance: {
        Args: Record<string, never>;
        Returns: number;
      };
      list_my_planner_market_credit_purchases: {
        Args: Record<string, never>;
        Returns: Database['public']['Tables']['planner_market_credit_purchases']['Row'][];
      };
      admin_adjust_planner_market_credits: {
        Args: { p_ga_company_id: string; p_delta: number; p_reason: string };
        Returns: void;
      };
      admin_refund_planner_market_credit_purchase: {
        Args: { p_purchase_id: string; p_reason: string };
        Returns: void;
      };
      purchase_branch_ad_product: {
        Args: {
          p_branch_id: string;
          p_product_type: string;
          p_start_at: string;
          p_end_at: string;
          p_payment_method?: string | null;
          p_pg_tid?: string | null;
        };
        Returns: string;
      };
      admin_review_branch_ad_product: {
        Args: { p_ad_product_id: string; p_decision: string; p_reason?: string | null };
        Returns: void;
      };
      admin_extend_branch_ad_product: {
        Args: { p_ad_product_id: string; p_new_end_at: string };
        Returns: void;
      };
      sync_branch_ad_exposure: {
        Args: Record<string, never>;
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
  kakaoContactHref: string | null;
  contactClickCount: number;
  tagline: string | null;
  /** 승인+만료 전인 고소득 설계사 인원수 합계. 배지 노출 여부 판단용(0이면 미노출). */
  plannerBadgeTotal: number;
  /** 보유한 등급 중 가장 높은 등급(3>2>1) - 카드에 대표로 보여줄 배지 하나를 고를 때 사용. */
  plannerTopTier: PlannerIncomeTier | null;
}

/** "설계사 찾기" 목록/상세에 노출되는 공개 표시값 - public_planner_profiles 뷰 그대로,
 * 이름/전화/이메일/카카오톡 등 비공개 필드는 이 타입에 절대 포함하지 않는다. */
export interface PublicPlannerProfileSummary {
  id: string;
  profilePhotoUrl: string | null;
  activeRegionId: string;
  activeRegionLabel: string;
  careerYears: number;
  specialties: string[];
  selfIntroduction: string | null;
  currentlyEmployed: boolean;
  openToMove: boolean;
  desiredRegionId: string | null;
  desiredRegionLabel: string | null;
  desiredGaCompanyId: string | null;
  desiredGaCompanyName: string | null;
  desiredConditions: string | null;
  badges: PlannerBadgeSummary[];
  hasIncomeVerified: boolean;
  hasTopPlanner: boolean;
  createdAt: string;
}
