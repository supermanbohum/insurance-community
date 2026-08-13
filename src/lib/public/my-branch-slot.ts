import 'server-only';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * 홈 「우리 지점」 슬롯의 상태 판정 (SPEC-042).
 *
 * 🔴 새 자리를 만드는 게 아니다. **기존 등록 유도 배너 자리가 상태에 따라 바뀐다.**
 * 따로 만들면 이미 등록한 사람에게 등록하라고 계속 말하게 된다(오너·CTO 확정).
 *
 * ---------------------------------------------------------------------------
 * 🔴 `else`로 짜지 않는다 — 상태를 하나씩 명시한다
 * ---------------------------------------------------------------------------
 * 「approved가 아니면 심사 중」으로 짜면 반려자가 영원히 기다리고,
 * 「pending이 아니면 미등록」으로 짜면 반려자가 등록 유도 배너를 본다.
 * 둘 다 실제로 났던 사고의 형태다(0101 이전: 반려당하면 3경로가 전부 닫혀 있었다).
 *
 * ---------------------------------------------------------------------------
 * ⚠️ 상태 축이 **둘**이다 — 하나로 보면 틀린다
 * ---------------------------------------------------------------------------
 * 지점:    ga_branch.registration_status            pending | approved | rejected   (NOT NULL)
 * 설계사:  branch_planner_registrations.status      pending_review | on_hold | rejected | approved
 *
 * **값 집합이 다르다.** 설계사 쪽에는 `pending_review`(≠`pending`)와 `on_hold`가 있다.
 * 그래서 설계사 카드는 한 상태가 아니라 **두 상태의 곱**이고, 「내가 소속된 지점
 * 페이지입니다」는 **본인 연결이 approved일 때만 참**이다.
 *
 * 🔴 지금은 최소안이다(CTO 판단 대기): **본인 approved + 지점 approved**일 때만
 * 「우리 지점 보기」를 띄우고, 나머지 조합은 전부 설계사용 안내(④-b)로 떨어뜨린다.
 * 새 문구를 만들지 않고 이미 확정·배포된 문안만 쓴다.
 * ⚠️ 그 결과 `on_hold`·`rejected` 설계사는 **자기 연결이 어떻게 됐는지 홈에서 모른다.**
 * ⑤(지점 반려 카드)를 만든 이유와 같은 형태의 구멍이라, 첫 연결이 생기면 다시 본다.
 *
 * ---------------------------------------------------------------------------
 * 🔴 ⑤ 반려의 판정 소스는 **「내 등록 큐」**다 (CTO 확정, 디자인 권고 기각)
 * ---------------------------------------------------------------------------
 * `branch_registrations`에서 `submitted_by_ga_admin_id = 나` 이고 `status='rejected'`.
 * **지점이 rejected인지가 아니다.** 근거는 사용자 관점이 아니라 **동작 가능성**이다:
 *
 *     재신청 RPC  resubmit_branch_registration(p_registration_id)
 *                 → 큐 행이 있어야 부를 수 있다
 *                 → 큐 행이 없으면 재신청할 대상 자체가 없다
 *
 * 지점 기준으로 가면 「다시 신청하실 수 있습니다」를 보여주고 **눌러도 아무것도 못 한다.**
 * 카드에 **도착지가 있다는 것**이 ⑤의 정의인데 그 도착지가 동작하지 않으면 정의가 깨진다.
 *
 * ⚠️ 「지점은 rejected인데 큐 행이 없는」 상태는 **데이터 이상**이다. 카드로 덮지 않는다 -
 * 덮으면 그 이상이 영영 안 보인다(CTO, 별건 등재).
 *
 * ---------------------------------------------------------------------------
 * ⚠️ 지금 이 함수가 반환할 수 있는 값은 사실상 'none' 하나뿐이다
 * ---------------------------------------------------------------------------
 * [실측 2026-08-13] branch_planner_registrations 0행 · branch_registrations 0행 ·
 * 활성 GA 관리자 3명 전원 branch_id 없음 · 살아있는 지점 0건.
 * **나머지 분기는 한 번도 렌더된 적이 없다.** 화면 검증은 첫 등록 이후다 -
 * 「없는 상태를 상상해서 검증했다」고 적지 않는다.
 */
export type MyBranchSlotState =
  /** ④-a 미등록(지점장·비로그인 포함) - 현행 등록 유도 배너 */
  | { kind: 'none' }
  /** ③ 심사 중 - 🔴 도착지 없음(비활성 카드) */
  | { kind: 'pending' }
  /** ①② 승인됨 - 지점장·설계사 **같은 도착지**(손님이 보는 화면) */
  | { kind: 'approved'; branchSlug: string; branchName: string; viewer: 'owner' | 'planner' }
  /** ⑤ 반려 - 도착지 있음. 🔴 사유는 여기 담지 않는다(홈은 공용 화면) */
  | { kind: 'rejected'; registrationId: string }
  /** ④-b 설계사인데 소속 지점이 없다/못 간다 - 🔴 ④-a(등록 유도)를 보이면 안 된다 */
  | { kind: 'plannerWithoutBranch' };

const NONE: MyBranchSlotState = { kind: 'none' };

/**
 * 🔴 이 함수는 쿠키를 읽는다. 홈이 요청마다 렌더된다는 뜻이다.
 * 지금 `(main)/page.tsx`는 이미 `force-dynamic`이라(레이아웃이 매 요청 getCurrentUser를
 * 부른다) 추가 비용은 없다. 다만 그 파일 주석의 "추후 헤더 로그인 체크를 클라이언트로
 * 옮기면 캐시 가능해진다"는 길은 **이 함수가 홈에 들어오면 막힌다** - 그때는 이 슬롯도
 * 함께 클라이언트로 옮겨야 한다.
 */
export async function getMyBranchSlotState(): Promise<MyBranchSlotState> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NONE;

  const admin = createAdminClient();

  // ── 지점장(GA 관리자) 경로 ────────────────────────────────────────────────
  const { data: gaAdmin } = await admin
    .from('ga_admin_users')
    .select('id, branch_id')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (gaAdmin) {
    // ⑤를 먼저 본다. 반려 뒤 재신청하면 큐에 새 행이 생기므로, **가장 최근 행**만 본다 -
    // 옛 반려 행이 남아 있다고 지금도 반려 상태인 것은 아니다.
    const { data: myLatestRegistration } = await admin
      .from('branch_registrations')
      .select('id, status')
      .eq('submitted_by_ga_admin_id', gaAdmin.id)
      .eq('request_type', 'create')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (myLatestRegistration?.status === 'rejected') {
      return { kind: 'rejected', registrationId: myLatestRegistration.id };
    }

    if (gaAdmin.branch_id) {
      const branch = await fetchLiveBranch(admin, gaAdmin.branch_id);
      // 지점이 삭제됐으면 도착지가 없다. 지점장에게는 등록 유도가 성립하므로 ④-a로 둔다
      // (설계사와 다른 지점이다 - 지점장은 다시 등록할 수 있다).
      if (!branch) return NONE;

      // 🔴 명시적 분기. 새 상태값이 생기면 여기서 걸려야 한다.
      if (branch.registration_status === 'approved') {
        return { kind: 'approved', branchSlug: branch.slug, branchName: branch.name, viewer: 'owner' };
      }
      if (branch.registration_status === 'pending') return { kind: 'pending' };
      if (branch.registration_status === 'rejected') {
        // 큐 행이 없는 반려다 = 데이터 이상. 카드로 덮지 않는다(위 주석 참고).
        return NONE;
      }
      return NONE;
    }

    return NONE;
  }

  // ── 소속 설계사 경로 ──────────────────────────────────────────────────────
  // ⚠️ 「소속」의 정의는 `branch_planner_registrations`(우리 지점 설계사 등록)다.
  // 설계사마켓(planner_profiles)은 지점 소속을 뜻하지 않아 여기 포함하지 않는다.
  const { data: appUser } = await admin
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (!appUser) return NONE;

  const { data: link } = await admin
    .from('branch_planner_registrations')
    .select('branch_id, status')
    .eq('user_id', appUser.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!link) return NONE;

  // 🔴 본인 연결이 approved가 아니면 「내가 소속된 지점 페이지입니다」가 참이 아니다.
  // pending_review · on_hold · rejected 셋 다 여기서 걸린다(최소안).
  if (link.status !== 'approved') return { kind: 'plannerWithoutBranch' };

  const branch = await fetchLiveBranch(admin, link.branch_id);
  // 지점이 없거나 아직 공개 전이면 도착지가 없다. 🔴 설계사에게 ④-a(등록 유도)를 보이면
  // **할 수 없는 일을 권하는 것**이다 - 지점 등록은 지점장·관리자만 한다(콘텐츠 지적).
  if (!branch) return { kind: 'plannerWithoutBranch' };
  if (branch.registration_status === 'pending') return { kind: 'pending' };
  if (branch.registration_status !== 'approved') return { kind: 'plannerWithoutBranch' };

  return { kind: 'approved', branchSlug: branch.slug, branchName: branch.name, viewer: 'planner' };
}

/** 소프트 삭제된 지점은 도착지가 아니다 - status만 보면 삭제분이 통과한다(8/11 오경보). */
async function fetchLiveBranch(
  admin: ReturnType<typeof createAdminClient>,
  branchId: string
): Promise<{ slug: string; name: string; registration_status: string } | null> {
  const { data } = await admin
    .from('ga_branch')
    .select('slug, name, registration_status, deleted_at')
    .eq('id', branchId)
    .is('deleted_at', null)
    .maybeSingle();
  if (!data) return null;
  return { slug: data.slug, name: data.name, registration_status: data.registration_status };
}
