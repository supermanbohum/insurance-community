import Link from 'next/link';
import { Building2, Clock, Undo2, ChevronRight } from 'lucide-react';
import type { MyBranchSlotState } from '@/lib/public/my-branch-slot';

/**
 * 홈 「우리 지점」 슬롯 (SPEC-042).
 *
 * 🔴 이 컴포넌트는 **등록 유도 배너 자리를 대체**한다. 배너 아래에 따로 붙이지 마라 -
 * 그러면 이미 등록한 사람에게 등록하라고 계속 말하게 된다(오너·CTO 확정).
 * 상태가 'none'이면 **아무것도 그리지 않고** 호출부가 기존 배너를 그린다.
 *
 * 🔴 ③(심사 중)과 ⑤(반려)의 차이가 이 설계의 핵심이다:
 *   ③ 사용자가 할 일이 없다 → **누를 데가 없다.** 셰브론·버튼을 넣지 마라
 *   ⑤ 사용자가 할 일이 있다 → **도착지가 있어야 한다**
 * 같은 「내 지점이 안 보인다」인데 행동 유무가 정반대라 카드도 정반대여야 한다.
 *
 * 🔴 ⑤의 버튼은 **빨강이 아니라 브랜드 블루**다. 문구는 「다시 신청하실 수 있습니다」로
 * 회복 가능을 말하는데 버튼이 위험 신호를 주면 어긋난다. 상태 표시는 붉은 pill이 하고,
 * 행동(사유 확인)은 부정적 행동이 아니므로 평소 CTA 색을 쓴다 -
 * **나쁜 소식을 전하는 것과 겁을 주는 것은 다르다**(디자인).
 *
 * 🔴 반려 사유를 여기 렌더하지 마라. **사유는 개인 정보이고 홈은 공용 화면**이다
 * (옆에서 보는 사람이 있을 수 있다). 카드는 「반려됐다 + 확인하러 가라」까지만 말한다.
 *
 * ⚠️ 지점명은 한 줄 고정(truncate)이고 버튼은 `shrink-0`이라 **절대 밀리지 않는다.**
 * 디자인 실측(카드 335 · 이름 자리 146.8): 11자 「메가인포에셋 청주지점」 133px로 온전,
 * 12자(155.6px)부터 말줄임. 이름이 잘려도 버튼 위치는 그대로다.
 *
 * ⚠️ 실사용 상태(2026-08-13 저녁): 공개 지점 2건 · 설계사 연결 5건(전부 pending_review).
 * `approved`(지점장)와 `plannerLinkPending`이 실제로 렌더되고 있고, 나머지 분기는
 * 아직 한 번도 렌더된 적이 없다. 「완료」로 적지 않는다.
 */
export function MyBranchSlot({ state }: { state: MyBranchSlotState }) {
  if (state.kind === 'none') return null;

  if (state.kind === 'approved') {
    // ①② 지점장·설계사가 **같은 카드 · 같은 도착지**다(오너 확정). 목적이 「내 지점 보러
    // 가기」로 같아서, 주 버튼을 나누면 같은 것을 두 번 설명하게 된다. 권한 차이는
    // 아래 보조 링크에서만 갈린다.
    // 🔴 도착지는 지점 상세(손님이 보는 화면)다. 관리 화면(/partner/branches)이 아니다.
    return (
      <div className="flex flex-col gap-2">
        <Link
          href={`/branch/${state.branchSlug}`}
          className="flex items-center gap-3 rounded-2xl border border-[#C7D7F5] bg-gradient-to-br from-[#F5F9FF] to-[#EAF2FF] p-3.5 transition-shadow hover:shadow-card"
        >
          <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[10px] bg-[#DCE7FA] text-brand-600">
            <Building2 className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center gap-1 text-[11px] font-bold text-brand-600">
              우리 지점 보기
              <span className="rounded-full bg-[#E7F7F1] px-1.5 py-0.5 text-[10px] font-extrabold text-[#0E9F6E]">
                공개 중
              </span>
            </span>
            <span className="mt-0.5 truncate text-[15px] font-extrabold text-ink">{state.branchName}</span>
            <span className="mt-0.5 truncate text-[11px] text-ink-faint">
              {state.viewer === 'owner' ? '설계사님들에게 보이는 화면입니다' : '내가 소속된 지점 페이지입니다'}
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-brand-600" strokeWidth={2.5} />
        </Link>

        <div className="flex gap-2">
          {state.viewer === 'owner' ? (
            <>
              <SubLink href="/partner/branches">지점 정보 수정</SubLink>
              <SubLink href="/partner/planners">설계사 초대</SubLink>
            </>
          ) : (
            <SubLink href="/branch-planner/edit">내 프로필 수정</SubLink>
          )}
        </div>
      </div>
    );
  }

  if (state.kind === 'pending') {
    // ③ 🔴 링크가 아니다. 누를 데를 만들지 마라 - 사용자가 할 일이 없다.
    // 🔴 「승인되면 알려드립니다」를 넣지 마라(콘텐츠가 일부러 뺐다). 알림 수단이
    // 확정돼야 쓸 수 있는 실행 약속이다 - 알림톡은 보류고 이 경로의 푸시 배선은
    // 확인되지 않았다. 「확인이 끝나면 이 자리에 표시됩니다」는 화면 상태 서술이라
    // 승인되면 **따로 보내지 않아도 자동으로 참**이 된다.
    // 🔴 소요 시간(「영업일 2일」 등)도 넣지 마라 - 심사 표본 0건이라 근거가 없다.
    return (
      <div className="rounded-2xl border border-line bg-surface-sunken p-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[10px] bg-[#E9ECF1] text-ink-faint">
            <Clock className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <p className="text-sm font-extrabold leading-snug text-ink">등록하신 지점을 확인하고 있습니다</p>
        </div>
        <p className="mt-2.5 text-xs leading-relaxed text-ink-soft">
          운영팀이 명함과 사무실 사진을 확인하고 있습니다.{' '}
          <b className="font-bold">확인이 끝나면 이 자리에 우리 지점이 표시됩니다.</b>
        </p>
      </div>
    );
  }

  if (state.kind === 'rejected') {
    // ⑤ 🔴 「반려되었습니다」를 부드럽게 바꾸지 마라(콘텐츠). 「다시 확인해 주세요」류로
    // 흐리면 상태를 오해하고 **다시 신청하지 않는다.** 이 카드의 목적은 통보가 아니라
    // **재신청**이다.
    return (
      <div className="rounded-2xl border border-[#F7C9BE] bg-[#FFF8F6] p-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[10px] bg-[#E9ECF1] text-ink-faint">
            <Undo2 className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-extrabold leading-snug text-ink">
            등록하신 지점이 반려되었습니다
            <span className="rounded-full bg-[#FDE8E4] px-1.5 py-0.5 text-[10px] font-extrabold text-[#B42318]">
              반려
            </span>
          </p>
        </div>
        <p className="mt-2.5 text-xs leading-relaxed text-ink-soft">
          사유를 확인하고 <b className="font-bold">다시 신청하실 수 있습니다.</b>
        </p>
        <Link
          href="/partner/register"
          className="mt-2.5 block rounded-[10px] bg-brand-500 py-2.5 text-center text-[13px] font-extrabold text-white transition-colors hover:bg-brand-600"
        >
          반려 사유 확인하기
        </Link>
      </div>
    );
  }

  if (state.kind === 'plannerLinkPending') {
    // 🔴 ③(지점 심사 중)과 문장이 다르다. 심사 대상이 **지점이 아니라 본인의 연결**이다.
    // 지점은 이미 공개 중인데 「등록하신 지점을 확인하고 있습니다」를 보여주면 거짓이다.
    // 🔴 「승인되면 알려드립니다」를 넣지 않는다 - 알림 수단이 확정돼야 쓸 수 있는
    // 실행 약속이다(③과 같은 원칙). 소요 시간도 넣지 않는다.
    return (
      <div className="rounded-2xl border border-line bg-surface-sunken p-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[10px] bg-[#E9ECF1] text-ink-faint">
            <Clock className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <p className="text-sm font-extrabold leading-snug text-ink">소속 지점 연결을 확인하고 있습니다</p>
        </div>
        <p className="mt-2.5 text-xs leading-relaxed text-ink-soft">
          지점 관리자가 명함을 확인하고 있습니다.{' '}
          <b className="font-bold">확인이 끝나면 이 자리에 우리 지점이 표시됩니다.</b>
        </p>
      </div>
    );
  }

  if (state.kind === 'plannerLinkRejected') {
    // 🔴 ⑤(지점 반려)와 다른 카드다. 지점은 멀쩡하고 **내 연결만** 반려됐다.
    // ⑤를 쓰면 남의 지점이 반려된 것처럼 읽힌다.
    // 🔴 사유는 지점 관리자가 적어 보낸 것이라 본인에게 보여준다 - 홈이 공용 화면이라
    // 걱정되지만, 지점 반려 사유(제3자 정보)와 달리 이건 **본인에 대한 통지**다.
    return (
      <div className="rounded-2xl border border-[#F7C9BE] bg-[#FFF8F6] p-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[10px] bg-[#E9ECF1] text-ink-faint">
            <Undo2 className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <p className="text-sm font-extrabold leading-snug text-ink">소속 지점 연결이 반려되었습니다</p>
        </div>
        {state.reason && (
          <p className="mt-2.5 rounded-lg bg-white/70 px-3 py-2 text-xs leading-relaxed text-ink-soft">
            {state.reason}
          </p>
        )}
        <Link
          href="/branch-planner/register"
          className="mt-2.5 block rounded-[10px] bg-brand-500 py-2.5 text-center text-[13px] font-extrabold text-white transition-colors hover:bg-brand-600"
        >
          다시 신청하기
        </Link>
      </div>
    );
  }

  // ④-b 설계사인데 갈 지점이 없다.
  // 🔴 여기서 ④-a(「우리 지점 등록하기」)를 보이면 **할 수 없는 일을 권하는 것**이다 -
  // 지점 등록은 지점장·관리자만 한다(콘텐츠 지적). 문안은 /branch-planner-register
  // 하드 게이트의 확정·배포본을 그대로 쓴다 - 같은 사실을 두 곳에서 다르게 말하지 않는다.
  return (
    <Link
      href="/branch-planner-register"
      className="flex flex-col gap-1 rounded-xl border border-dashed border-brand-200 bg-brand-50/50 px-3.5 py-3 transition-colors hover:bg-brand-50"
    >
      <span className="text-[13px] font-bold text-ink">소속 지점이 아직 보험맵에 없습니다</span>
      <span className="text-[11px] leading-relaxed text-ink-soft">
        등록이 안 되는 게 아니라, 순서가 하나 남았습니다. 지점 페이지가 먼저 만들어져야, 그 지점의
        설계사로 등록할 수 있습니다.
      </span>
    </Link>
  );
}

function SubLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex-1 rounded-[9px] border border-line bg-white py-2 text-center text-xs font-bold text-ink-soft transition-colors hover:border-brand-200 hover:text-brand-600"
    >
      {children}
    </Link>
  );
}
