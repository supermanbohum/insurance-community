/**
 * Supabase 스키마와 대응하는 타입 정의.
 * 실제 운영에서는 `supabase gen types typescript`로 자동 생성하는 것을 권장하며,
 * 이 파일은 그 결과물로 교체될 수 있다. Phase 1 범위의 핵심 테이블만 우선 정의한다.
 */
export type AuthorNameType = 'custom' | 'random' | 'admin' | 'system';
export type BestOverrideStatus = 'auto' | 'force_include' | 'force_exclude';
export type AdminRole = 'super_admin' | 'content_admin' | 'moderation_admin' | 'banner_admin';
export type PostStatus = 'visible' | 'hidden' | 'deleted';
export type ReportTargetType = 'post' | 'comment';
export type ReportReason = 'privacy' | 'abuse' | 'spam' | 'misinformation' | 'solicitation_violation' | 'illegal' | 'other';
export type ReportStatus = 'pending' | 'resolved_normal' | 'resolved_hidden' | 'resolved_deleted' | 'resolved_ban';

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
export type BranchRegistrationStatus = 'draft' | 'pending' | 'approved' | 'rejected';
/** 고소득 설계사 연봉 구간 - tier_1=1억+, tier_2=2억+, tier_3=3억+ */
export type PlannerIncomeTier = 'tier_1' | 'tier_2' | 'tier_3';
export type PlannerCertificationStatus = 'pending_review' | 'approved' | 'rejected' | 'pending_renewal';
export type PlannerCertificationHistoryEventType = 'initial_approval' | 'renewal_approval' | 'rejection';
export type PlannerApplicationSource = 'partner' | 'public';
export type VerificationDocumentOwnerType = 'planner_certification' | 'planner_badge';
/** banners.slot (0001) - PC/모바일 × 위치별 광고 슬롯.
 * 🔴 지금 실제로 화면에 연동된 값은 mobile_list_middle 하나다(홈 「우수 GA」 위, SPEC-040).
 * 이름은 0001의 레거시라 "모바일"이 붙어 있지만 지면은 전 기기 공통이다.
 * pc_left는 예전에 연동돼 있었으나 W-051로 지면이 폐지됐다. */
export type BannerSlot =
  | 'pc_top'
  | 'pc_left'
  | 'pc_right'
  | 'pc_list_middle'
  | 'pc_detail_bottom'
  | 'mobile_top'
  | 'mobile_list_middle'
  | 'mobile_detail_bottom'
  | 'mobile_sticky_bottom';
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
          source_url: string | null;
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
      reports: {
        Row: {
          id: string;
          target_type: ReportTargetType;
          target_id: string;
          reporter_id: string;
          reason: ReportReason;
          detail: string | null;
          status: ReportStatus;
          handled_by_admin_id: string | null;
          handled_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['reports']['Row']>;
        Update: Partial<Database['public']['Tables']['reports']['Row']>;
        Relationships: [];
      };
      user_blocks: {
        Row: {
          id: string;
          anonymous_profile_id: string;
          blocked_by_admin_id: string | null;
          reason: string | null;
          blocked_until: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['user_blocks']['Row']>;
        Update: Partial<Database['public']['Tables']['user_blocks']['Row']>;
        Relationships: [];
      };
      site_visit_adjustments: {
        Row: {
          adjustment_date: string;
          delta: number;
          reason: string | null;
          adjusted_by_admin_id: string | null;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['site_visit_adjustments']['Row']>;
        Update: Partial<Database['public']['Tables']['site_visit_adjustments']['Row']>;
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
      home_open_banner: {
        Row: {
          id: string;
          is_active: boolean;
          headline: string;
          subtext: string;
          cta_label: string;
          cta_href: string;
          updated_by_admin_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['home_open_banner']['Row']>;
        Update: Partial<Database['public']['Tables']['home_open_banner']['Row']>;
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
          /** 지점명 오른쪽에 작게 붙는 짧은 소개(0107, 9자 이내·선택).
           *  🔴 tagline(지점명 아래 한 줄 소개)과 다른 문구다 - 자른 것이 아니다. */
          short_tagline: string | null;
          contact_click_count: number;
          operation_type: GaOperationType;
          is_headquarters: boolean;
          organic_view_count: number;
          imported_view_count: number;
          correction_view_count: number;
          is_recommended: boolean;
          recommended_rank: number | null;
          has_new_open_badge: boolean;
          /** PRO 뱃지 만료 시각(0094). now()보다 미래면 PRO 표시. 🔴 정렬·랭킹 금지. */
          pro_until: string | null;
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
      branch_inquiries: {
        Row: {
          id: string;
          branch_id: string;
          inquirer_name: string;
          contact_type: string;
          contact_value: string;
          career: string | null;
          message: string;
          consent_collection: boolean;
          consent_third_party: boolean;
          consent_agreed_at: string;
          ip_address: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['branch_inquiries']['Row']>;
        Update: Partial<Database['public']['Tables']['branch_inquiries']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'branch_inquiries_branch_id_fkey';
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
      site_visits: {
        Row: {
          id: string;
          anonymous_profile_id: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['site_visits']['Row']>;
        Update: Partial<Database['public']['Tables']['site_visits']['Row']>;
        Relationships: [];
      };
      /** 0103 - 카카오 계정 상태 변경 웹훅 수신 로그. 서비스롤 전용(RLS 정책 없음).
       *  🔴 매칭 실패(no_match)와 검증 실패(error)도 남는다 - 그래야 "안 온 것"과
       *  "와서 튕긴 것"을 구분할 수 있다. */
      kakao_webhook_events: {
        Row: {
          id: string;
          received_at: string;
          kakao_user_id: string | null;
          reason: string | null;
          raw_claims: Record<string, unknown> | null;
          matched_user_id: string | null;
          /** 🔴 'ignored'는 "처리 대상이 아닌 이벤트"(연결·동의 등)다.
           *  'no_match'("우리 DB에 없는 회원번호")와 섞지 말 것 - 조사 방향이 다르다.
           *  제약은 0104에서 확장됐다. */
          outcome: 'withdrawn' | 'already_withdrawn' | 'no_match' | 'ignored' | 'error';
          /** 0105 - 검증 실패 건에만 채운다. 수신 본문 앞 500자와 Content-Type.
           *  실패 코드만으로는 "카카오가 다른 걸 보냈다"와 "우리 파싱이 틀렸다"가 안 갈린다. */
          raw_body_prefix: string | null;
          content_type: string | null;
          error_message: string | null;
        };
        Insert: Partial<Database['public']['Tables']['kakao_webhook_events']['Row']>;
        Update: Partial<Database['public']['Tables']['kakao_webhook_events']['Row']>;
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
          /** 0115 - 회사의 모든 지점을 관리한다. 예전의 암묵 규칙(branch_id null = 회사 전체)을 대체한다. */
          is_company_owner: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['ga_admin_users']['Row']>;
        Update: Partial<Database['public']['Tables']['ga_admin_users']['Row']>;
        Relationships: [];
      };
      /** 0115 - 지점 매니저 위임. 계정이 달라도 여기 행이 있으면 그 지점을 관리한다. */
      ga_branch_admins: {
        Row: {
          ga_admin_user_id: string;
          branch_id: string;
          granted_by_admin_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['ga_branch_admins']['Row']>;
        Update: Partial<Database['public']['Tables']['ga_branch_admins']['Row']>;
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
          kakao_verified_contact: string | null;
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
          before_snapshot: Record<string, unknown>;
          reviewed_by_admin_id: string | null;
          reviewed_at: string | null;
          review_reason: string | null;
          incomplete_reminder_sent_at: string | null;
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
      ga_admin_registration_drafts: {
        Row: {
          ga_admin_id: string;
          payload: Record<string, unknown>;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['ga_admin_registration_drafts']['Row']>;
        Update: Partial<Database['public']['Tables']['ga_admin_registration_drafts']['Row']>;
        Relationships: [];
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
          photo_public: boolean | null;
          photo_flagged: boolean;
          photo_flag_reason: string | null;
          active_region_id: string;
          career_years: number;
          specialties: string[];
          self_introduction: string | null;
          currently_employed: boolean;
          job_search_status: 'actively_looking' | 'open_to_offers' | 'not_looking';
          desired_start_timing: 'immediate' | 'within_1_month' | 'within_3_months' | 'negotiable' | null;
          contactable_times: string[];
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
          pending_active_region_id: string | null;
          pending_career_years: number | null;
          pending_desired_ga_company_id: string | null;
          trust_update_status: 'none' | 'draft' | 'pending';
          trust_before_snapshot: Record<string, unknown>;
          trust_reviewed_by_admin_id: string | null;
          trust_reviewed_at: string | null;
          trust_review_reason: string | null;
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
      planner_contact_view_notifications: {
        Row: {
          id: string;
          planner_profile_id: string;
          ga_company_id: string;
          viewer_branch_id: string | null;
          viewed_by_ga_admin_id: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['planner_contact_view_notifications']['Row']>;
        Update: Partial<Database['public']['Tables']['planner_contact_view_notifications']['Row']>;
        Relationships: [];
      };
      push_tokens: {
        Row: {
          id: string;
          auth_user_id: string;
          token: string;
          platform: 'ios' | 'android';
          created_at: string;
          updated_at: string;
          last_seen_at: string;
        };
        Insert: Partial<Database['public']['Tables']['push_tokens']['Row']>;
        Update: Partial<Database['public']['Tables']['push_tokens']['Row']>;
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
      banners: {
        Row: {
          id: string;
          advertiser_name: string;
          campaign_name: string;
          pc_image_path: string | null;
          mobile_image_path: string | null;
          link_url: string;
          slot: BannerSlot;
          start_at: string;
          end_at: string;
          priority: number;
          is_active: boolean;
          total_contract_amount: number | null;
          admin_memo: string | null;
          created_by_admin_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['banners']['Row']>;
        Update: Partial<Database['public']['Tables']['banners']['Row']>;
        Relationships: [];
      };
      top_designer_certifications: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          ga_company_id: string;
          branch_name: string | null;
          career_years: number | null;
          self_introduction: string | null;
          business_card_path: string | null;
          photo_path: string | null;
          photo_public: boolean | null;
          consent_public_display: boolean;
          consent_document_collection: boolean;
          job_title: string;
          income_doc_storage_path: string | null;
          declared_annual_income_krw: number | null;
          confirmed_annual_income_krw: number | null;
          star_tier: 'star_1' | 'star_2' | 'star_3' | 'star_4' | null;
          status: 'pending_review' | 'on_hold' | 'approved' | 'rejected';
          review_reason: string | null;
          reviewed_by_admin_id: string | null;
          reviewed_at: string | null;
          ocr_status: 'not_run' | 'pending' | 'completed' | 'failed';
          ocr_extracted_income_krw: number | null;
          ocr_raw_response: unknown;
          ocr_confidence: number | null;
          appointed_at: string | null;
          branch_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['top_designer_certifications']['Row']>;
        Update: Partial<Database['public']['Tables']['top_designer_certifications']['Row']>;
        Relationships: [];
      };
      map_external_pois: {
        Row: {
          id: string;
          source: string;
          external_id: string;
          name: string;
          address: string | null;
          road_address: string | null;
          phone: string | null;
          /** 0096 - null이면 [네이버 지도에서 보기] CTA를 렌더하지 않는다. */
          place_url: string | null;
          lat: number;
          lng: number;
          collected_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['map_external_pois']['Row']>;
        Update: Partial<Database['public']['Tables']['map_external_pois']['Row']>;
        Relationships: [];
      };
      map_external_poi_suppressions: {
        Row: {
          id: string;
          source: string;
          external_id: string;
          reason: string | null;
          suppressed_by_admin_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['map_external_poi_suppressions']['Row']>;
        Update: Partial<Database['public']['Tables']['map_external_poi_suppressions']['Row']>;
        Relationships: [];
      };
      top_designer_certification_revisions: {
        Row: {
          id: string;
          certification_id: string;
          user_id: string;
          job_title: string;
          ga_company_id: string;
          branch_name: string | null;
          declared_annual_income_krw: number | null;
          income_doc_storage_path: string | null;
          business_card_path: string | null;
          status: 'pending_review' | 'on_hold' | 'approved' | 'rejected';
          review_reason: string | null;
          reviewed_by_admin_id: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['top_designer_certification_revisions']['Row']>;
        Update: Partial<Database['public']['Tables']['top_designer_certification_revisions']['Row']>;
        Relationships: [];
      };
      branch_planner_registrations: {
        Row: {
          id: string;
          user_id: string;
          branch_id: string;
          name: string;
          job_title: string;
          business_card_path: string | null;
          income_doc_storage_path: string | null;
          declared_annual_income_krw: number | null;
          status: 'pending_review' | 'on_hold' | 'approved' | 'rejected';
          review_reason: string | null;
          reviewed_by_admin_id: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['branch_planner_registrations']['Row']>;
        Update: Partial<Database['public']['Tables']['branch_planner_registrations']['Row']>;
        Relationships: [];
      };
      branch_planner_gate_events: {
        Row: {
          id: string;
          event_type: 'blocked' | 'forward_click';
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['branch_planner_gate_events']['Row']>;
        Update: Partial<Database['public']['Tables']['branch_planner_gate_events']['Row']>;
        Relationships: [];
      };
      top_designer_likes: {
        Row: {
          id: string;
          top_designer_certification_id: string;
          liker_user_id: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['top_designer_likes']['Row']>;
        Update: Partial<Database['public']['Tables']['top_designer_likes']['Row']>;
        Relationships: [];
      };
      top_designer_views: {
        Row: {
          id: string;
          top_designer_certification_id: string;
          viewed_at: string;
        };
        Insert: Partial<Database['public']['Tables']['top_designer_views']['Row']>;
        Update: Partial<Database['public']['Tables']['top_designer_views']['Row']>;
        Relationships: [];
      };
      salary_ranking_submissions: {
        Row: {
          id: string;
          planner_profile_id: string;
          ranking_year: number;
          job_title: string;
          display_name: string;
          income_doc_storage_path: string;
          declared_annual_income_krw: number;
          confirmed_annual_income_krw: number | null;
          consent_public_display: boolean;
          status: 'pending_review' | 'on_hold' | 'approved' | 'rejected';
          review_reason: string | null;
          reviewed_by_admin_id: string | null;
          reviewed_at: string | null;
          ocr_status: 'not_run' | 'pending' | 'completed' | 'failed';
          ocr_extracted_income_krw: number | null;
          ocr_raw_response: unknown;
          ocr_confidence: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['salary_ranking_submissions']['Row']>;
        Update: Partial<Database['public']['Tables']['salary_ranking_submissions']['Row']>;
        Relationships: [];
      };
      salary_ranking_views: {
        Row: {
          id: string;
          submission_id: string;
          viewed_at: string;
        };
        Insert: Partial<Database['public']['Tables']['salary_ranking_views']['Row']>;
        Update: Partial<Database['public']['Tables']['salary_ranking_views']['Row']>;
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
      public_planner_profiles: {
        Row: {
          id: string;
          active_region_id: string;
          career_years: number;
          specialties: string[];
          self_introduction: string | null;
          currently_employed: boolean;
          job_search_status: 'actively_looking' | 'open_to_offers' | 'not_looking';
          desired_start_timing: 'immediate' | 'within_1_month' | 'within_3_months' | 'negotiable' | null;
          contactable_times: string[];
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
      public_top_designer_certifications: {
        Row: {
          id: string;
          name: string;
          ga_company_id: string;
          ga_company_name: string;
          branch_name: string | null;
          job_title: string;
          star_tier: 'star_1' | 'star_2' | 'star_3' | 'star_4' | null;
          career_years: number | null;
          self_introduction: string | null;
          certified_at: string | null;
          created_at: string;
          photo_path: string | null;
          view_count: number;
          like_count: number;
        };
        Relationships: [];
      };
      public_salary_ranking_submissions: {
        Row: {
          id: string;
          planner_profile_id: string;
          ranking_year: number;
          job_title: string;
          display_name: string;
          annual_income_krw: number | null;
          ranked_at: string | null;
          created_at: string;
          profile_photo_path: string | null;
          active_region_id: string;
          view_count: number;
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
      create_comment: {
        Args: {
          p_post_id: string;
          p_content: string;
          p_author_display_name: string;
          p_author_name_type?: AuthorNameType;
          p_parent_comment_id?: string | null;
        };
        Returns: string;
      };
      soft_delete_comment: {
        Args: { p_comment_id: string };
        Returns: void;
      };
      admin_create_comment_as: {
        Args: {
          p_post_id: string;
          p_content: string;
          p_parent_comment_id?: string | null;
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
      /** 0115 - 지점 매니저 목록. 운영팀 또는 그 지점을 관리할 수 있는 사람만 읽는다. */
      list_branch_managers: {
        Args: { p_branch_id: string };
        Returns: { ga_admin_user_id: string; email: string; display_name: string | null; created_at: string }[];
      };
      /** 0115 → 0116 - 이메일로 계정을 찾아 그 지점의 매니저로 등록한다.
       *  0116부터 **운영팀뿐 아니라 그 지점 관리자도** 호출할 수 있다(승인 절차 없음). */
      grant_branch_manager: {
        Args: { p_branch_id: string; p_email: string };
        Returns: string;
      };
      /** 0115 - 지점 매니저 해제(운영팀 전용). */
      revoke_branch_manager: {
        Args: { p_branch_id: string; p_ga_admin_user_id: string };
        Returns: void;
      };
      /** 0115 - 내가 관리할 수 있는 지점 id 목록. 화면과 저장이 같은 기준을 쓰게 한다. */
      my_manageable_branch_ids: {
        Args: Record<string, never>;
        Returns: string[];
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
      /** 0108 - 짧은 소개 단독 저장. GA 담당자는 심사 전 지점만, 운영팀은 제한 없이. */
      set_branch_short_tagline: {
        Args: { p_branch_id: string; p_short_tagline: string | null };
        Returns: void;
      };
      /** 지점 직영/지사 구분 단독 저장. GA 담당자는 심사 전 지점만, 운영팀은 제한 없이. */
      set_branch_operation_type: {
        Args: { p_branch_id: string; p_operation_type: GaOperationType };
        Returns: void;
      };
      /** 0111 - 설계사 지점 연결 심사. 주체는 해당 지점 관리자(운영팀도 가능). */
      review_branch_planner_registration: {
        Args: {
          p_registration_id: string;
          p_decision: 'approved' | 'on_hold' | 'rejected' | 'pending_review';
          p_reason?: string;
        };
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
      record_site_visit: {
        Args: Record<string, never>;
        Returns: void;
      };
      get_today_site_traffic_stats: {
        Args: Record<string, never>;
        Returns: { view_count: number; visitor_count: number }[];
      };
      get_platform_core_stats: {
        Args: Record<string, never>;
        Returns: {
          approved_ga_count: number;
          approved_branch_count: number;
          registered_planner_count: number;
          today_new_ga_count: number;
          today_new_branch_count: number;
          today_new_planner_count: number;
          region_count: number;
          approved_planner_profile_count: number;
        }[];
      };
      record_branch_contact_click: {
        Args: { p_contact_id: string };
        Returns: void;
      };
      submit_branch_inquiry: {
        Args: {
          p_branch_id: string;
          p_inquirer_name: string;
          p_contact_type: string;
          p_contact_value: string;
          p_career: string | null;
          p_message: string;
          p_consent_collection: boolean;
          p_consent_third_party: boolean;
          p_ip_address: string | null;
          p_form_rendered_at: string | null;
        };
        Returns: string;
      };
      list_my_branch_inquiries: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          branch_id: string;
          branch_name: string;
          inquirer_name: string;
          contact_type: string;
          contact_value: string;
          career: string | null;
          message: string;
          read_at: string | null;
          created_at: string;
        }[];
      };
      admin_list_branch_inquiries: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          branch_id: string;
          branch_name: string;
          ga_company_name: string;
          inquirer_name: string;
          contact_type: string;
          contact_value: string;
          career: string | null;
          message: string;
          read_at: string | null;
          created_at: string;
        }[];
      };
      mark_branch_inquiry_read: {
        Args: { p_inquiry_id: string };
        Returns: void;
      };
      admin_set_planner_photo_flag: {
        Args: { p_profile_id: string; p_flagged: boolean; p_reason: string | null };
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
      list_monthly_top_planner_profiles: {
        Args: { p_limit?: number };
        Returns: { planner_profile_id: string; view_count: number }[];
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
      submit_branch_registration_incomplete: {
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
      complete_branch_registration: {
        Args: { p_registration_id: string };
        Returns: void;
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
      /** 0114 - 필수 서류·사진 검사를 건너뛰고 승인한다(운영진 전용, 신규 등록만).
       *  🔴 review_branch_registration의 검사는 그대로 남는다. 인자를 추가하는 대신
       *  이름이 다른 전용 RPC로 만든 것이다(0108의 시그니처 충돌 재발 방지). */
      force_approve_branch_registration: {
        Args: { p_registration_id: string; p_reason?: string | null };
        Returns: void;
      };
      /** 0101 - 반려된 지점 등록을 심사 대기로 되돌린다(파트너 본인). */
      resubmit_branch_registration: {
        Args: { p_registration_id: string };
        Returns: void;
      };
      /** 0103 - 카카오 연결 해제 웹훅 수신 시 탈퇴 처리. 서비스롤 전용.
       *  반환: { outcome: 'withdrawn'|'already_withdrawn'|'no_match', user_id: string|null } */
      withdraw_kakao_user: {
        Args: { p_kakao_user_id: string };
        Returns: { outcome: string; user_id: string | null };
      };
      list_my_branch_registrations: {
        Args: Record<string, never>;
        Returns: Database['public']['Tables']['branch_registrations']['Row'][];
      };
      save_branch_update_draft: {
        Args: {
          p_branch_id: string;
          p_registrant_name?: string | null;
          p_registrant_title?: string | null;
          p_registrant_phone?: string | null;
          p_registrant_company?: string | null;
          p_registrant_branch_label?: string | null;
          p_payload?: Record<string, unknown>;
        };
        Returns: string;
      };
      get_open_branch_update: {
        Args: { p_branch_id: string };
        Returns: Database['public']['Tables']['branch_registrations']['Row'][];
      };
      save_branch_registration_draft: {
        Args: { p_payload: Record<string, unknown> };
        Returns: void;
      };
      get_my_branch_registration_draft: {
        Args: Record<string, never>;
        Returns: Record<string, unknown> | null;
      };
      clear_branch_registration_draft: {
        Args: Record<string, never>;
        Returns: void;
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
      get_username_by_verified_email: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      submit_top_designer_certification: {
        Args: {
          p_name: string;
          p_ga_company_id: string;
          p_job_title: string;
          p_income_doc_path: string;
          p_business_card_path: string;
          p_consent_public_display: boolean;
          p_consent_document_collection: boolean;
          p_branch_name?: string | null;
          p_career_years?: number | null;
          p_self_introduction?: string | null;
          p_declared_annual_income_krw?: number | null;
          p_photo_path?: string | null;
          p_photo_public?: boolean | null;
        };
        Returns: string;
      };
      admin_review_top_designer_certification: {
        Args: {
          p_certification_id: string;
          p_decision: string;
          p_star_tier?: string;
          p_confirmed_income_krw?: number;
          p_reason?: string;
        };
        Returns: undefined;
      };
      update_top_designer_profile: {
        Args: {
          p_self_introduction?: string | null;
          p_career_years?: number | null;
          p_photo_path?: string | null;
          p_photo_public?: boolean | null;
        };
        Returns: undefined;
      };
      submit_top_designer_certification_revision: {
        Args: {
          p_job_title: string;
          p_ga_company_id: string;
          p_income_doc_path: string;
          p_business_card_path: string;
          p_branch_name?: string | null;
          p_declared_annual_income_krw?: number | null;
        };
        Returns: string;
      };
      admin_review_top_designer_certification_revision: {
        Args: {
          p_revision_id: string;
          p_decision: string;
          p_star_tier?: string;
          p_confirmed_income_krw?: number;
          p_reason?: string;
        };
        Returns: undefined;
      };
      toggle_top_designer_like: {
        Args: { p_certification_id: string };
        Returns: boolean;
      };
      record_top_designer_view: {
        Args: { p_certification_id: string };
        Returns: undefined;
      };
      get_top_designer_home_ranking: {
        Args: { p_limit?: number };
        Returns: { id: string; name: string; ga_company_name: string; branch_name: string | null }[];
      };
      get_ga_quality_ranking: {
        Args: { p_limit?: number };
        Returns: { ga_company_id: string; ga_company_name: string; ga_company_slug: string; score: number; certified_count: number; registered_count: number }[];
      };
      admin_suppress_external_poi: {
        Args: { p_source: string; p_external_id: string; p_reason?: string };
        Returns: undefined;
      };
      admin_unsuppress_external_poi: {
        Args: { p_source: string; p_external_id: string };
        Returns: undefined;
      };
      admin_upsert_external_pois: {
        Args: { p_source: string; p_pois: unknown };
        Returns: number;
      };
      admin_set_branch_pro: {
        Args: { p_branch_id: string; p_until?: string | null };
        Returns: undefined;
      };
      get_ga_quality_ranking_by_region: {
        Args: { p_sido_code: string; p_sigungu_region_id?: string | null; p_limit?: number };
        Returns: { ga_company_id: string; ga_company_name: string; ga_company_slug: string; score: number; certified_count: number; registered_count: number }[];
      };
      submit_branch_planner_registration: {
        Args: {
          p_branch_id: string;
          p_name: string;
          p_job_title: string;
          p_business_card_path: string;
          p_income_doc_path?: string | null;
          p_declared_annual_income_krw?: number | null;
        };
        Returns: string;
      };
      admin_review_branch_planner_registration: {
        Args: { p_registration_id: string; p_decision: string; p_reason?: string };
        Returns: undefined;
      };
      record_branch_planner_gate_event: {
        Args: { p_event_type: string };
        Returns: undefined;
      };
      submit_salary_ranking: {
        Args: {
          p_planner_profile_id: string;
          p_ranking_year: number;
          p_job_title: string;
          p_display_name: string;
          p_income_doc_path: string;
          p_declared_annual_income_krw: number;
          p_consent_public_display: boolean;
        };
        Returns: string;
      };
      admin_review_salary_ranking: {
        Args: { p_submission_id: string; p_decision: string; p_confirmed_income_krw?: number; p_reason?: string };
        Returns: undefined;
      };
      record_salary_ranking_view: {
        Args: { p_submission_id: string };
        Returns: undefined;
      };
      get_salary_ranking_hall_of_fame: {
        Args: Record<PropertyKey, never>;
        Returns: {
          ranking_year: number;
          submission_id: string;
          display_name: string;
          job_title: string;
          annual_income_krw: number;
          profile_photo_path: string | null;
          active_region_id: string;
        }[];
      };
      confirm_email_signup: {
        Args: Record<string, never>;
        Returns: Database['public']['Tables']['users']['Row'];
      };
      complete_kakao_signup: {
        Args: { p_username: string; p_name: string; p_email: string; p_contact: string; p_ga_company_id: string };
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
          p_job_search_status: string;
          p_desired_start_timing?: string | null;
          p_contactable_times: string[];
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
          p_photo_public?: boolean | null;
        };
        Returns: string;
      };
      update_planner_market_profile_instant: {
        Args: {
          p_planner_profile_id: string;
          p_name: string;
          p_phone: string;
          p_email: string;
          p_specialties: string[];
          p_currently_employed: boolean;
          p_job_search_status: string;
          p_desired_start_timing?: string | null;
          p_contactable_times: string[];
          p_kakao_id?: string | null;
          p_profile_photo_path?: string | null;
          p_self_introduction?: string | null;
          p_desired_region_id?: string | null;
          p_desired_conditions?: string | null;
          p_photo_public?: boolean | null;
        };
        Returns: void;
      };
      save_planner_trust_update_draft: {
        Args: {
          p_planner_profile_id: string;
          p_active_region_id: string | null;
          p_career_years: number | null;
          p_desired_ga_company_id?: string | null;
        };
        Returns: void;
      };
      submit_planner_trust_update: {
        Args: {
          p_planner_profile_id: string;
          p_active_region_id: string;
          p_career_years: number;
          p_desired_ga_company_id?: string | null;
        };
        Returns: void;
      };
      admin_review_planner_trust_update: {
        Args: { p_planner_profile_id: string; p_decision: string; p_reason?: string | null };
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
        Returns: { name: string; phone: string; email: string; kakao_id: string | null; profile_photo_path: string | null }[];
      };
      list_my_planner_contact_notifications: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          branch_id: string | null;
          branch_slug: string | null;
          branch_name: string | null;
          branch_region_label: string | null;
          ga_company_name: string | null;
          created_at: string;
          read_at: string | null;
        }[];
      };
      count_my_unread_planner_contact_notifications: {
        Args: Record<string, never>;
        Returns: number;
      };
      mark_my_planner_contact_notifications_read: {
        Args: Record<string, never>;
        Returns: void;
      };
      register_push_token: {
        Args: { p_token: string; p_platform: string };
        Returns: void;
      };
      unregister_push_token: {
        Args: { p_token: string };
        Returns: void;
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
      admin_set_visitor_adjustment: {
        Args: { p_delta: number; p_reason?: string | null };
        Returns: void;
      };
      get_today_visitor_breakdown: {
        Args: Record<string, never>;
        Returns: { real_count: number; adjustment: number; display_count: number }[];
      };
      admin_create_post: {
        Args: { p_category_id: string; p_title: string; p_content: string; p_source_url?: string | null };
        Returns: string;
      };
      admin_set_post_status: {
        Args: { p_post_id: string; p_status: string; p_reason?: string | null };
        Returns: void;
      };
      admin_set_post_notice: {
        Args: { p_post_id: string; p_is_notice: boolean };
        Returns: void;
      };
      admin_set_post_best: {
        Args: { p_post_id: string; p_force: boolean };
        Returns: void;
      };
      admin_set_comment_status: {
        Args: { p_comment_id: string; p_status: string; p_reason?: string | null };
        Returns: void;
      };
      admin_block_user: {
        Args: { p_anonymous_profile_id: string; p_reason: string; p_until?: string | null };
        Returns: void;
      };
      admin_unblock_user: {
        Args: { p_anonymous_profile_id: string };
        Returns: void;
      };
      admin_resolve_report: {
        Args: { p_report_id: string; p_status: string; p_note?: string | null };
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
  /** 'admin'이면 운영팀 공식 게시물(W-027) - 목록/상세에서 공식 배지로 구분해 보여준다. */
  authorNameType: string;
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
  /** 광고상품 "신규오픈배지" 구매+승인+기간내 여부 (0037/0048). */
  hasNewOpenBadge: boolean;
  /** PRO 뱃지 노출 여부 - ga_branch.pro_until이 아직 안 지났는지(0094). 운영팀 수동
   * 부여이고 결제 연동은 없다. 🔴 정렬·랭킹에는 절대 쓰지 않는다(오너 확정). */
  isPro: boolean;
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
  /** 지점명 오른쪽 짧은 소개(0107). 미입력이거나 마이그레이션 미적용이면 null이고,
   *  그때는 카드 오른쪽을 그냥 비운다(대체 텍스트 금지). */
  shortTagline: string | null;
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
  jobSearchStatus: 'actively_looking' | 'open_to_offers' | 'not_looking';
  desiredStartTiming: 'immediate' | 'within_1_month' | 'within_3_months' | 'negotiable' | null;
  contactableTimes: string[];
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
