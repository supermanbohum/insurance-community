import Link from 'next/link';
import { Clock, AlertCircle, Undo2, CheckCircle2 } from 'lucide-react';
import type { MyBranchPlannerRegistration } from '@/lib/branch-planner/my-registration';

/**
 * 「우리 지점 설계사 등록」 화면 맨 위의 **내 신청 상태** 패널.
 *
 * ---------------------------------------------------------------------------
 * 🔴 왜 여기인가
 * ---------------------------------------------------------------------------
 * 지점 관리자가 승인/보류/반려를 처리해도 **신청자에게 알릴 수단이 없다**(알림톡 보류,
 * 오너 확정). 그래서 「보낸다」 대신 신청자가 **이미 가는 화면**에서 스스로 보게 한다.
 * 이 페이지는 홈 카드의 「다시 신청하기」가 데려오는 곳이자, 신청한 사람이 궁금할 때
 * 다시 열어 보는 곳이다. 그런데 2026-08-14 이전에는 여기가 **신청 이력을 전혀 모르는
 * 빈 폼**이었다 - 이미 신청한 사람이 와도 아무 상태도 안 보였다.
 *
 * 🔴 「승인되면 알려드립니다」류 문구는 쓰지 않는다. 보낼 수단이 없는 약속이다.
 * 대신 「여기에서 상태를 확인하실 수 있습니다」 - 화면 상태 서술이라 항상 참이다.
 *
 * ⚠️ 상태 네 가지를 **하나씩 명시**한다. else로 묶으면 보류가 심사 중으로 보이거나
 * 반려가 영원히 대기로 보인다(my-branch-slot.ts가 같은 이유로 같은 규칙을 쓴다).
 */
export function MyRegistrationStatus({ registration }: { registration: MyBranchPlannerRegistration }) {
  const branchLabel = registration.branchName ?? '신청한 지점';

  if (registration.status === 'approved') {
    return (
      <Panel
        tone="success"
        icon={<CheckCircle2 className="h-5 w-5" strokeWidth={2} />}
        badge="승인됨"
        title={`${branchLabel} 소속 설계사로 승인되었습니다`}
      >
        <p>
          홈 화면 상단이 <b>우리 지점 바로가기</b>로 바뀌었고, 내 프로필을 수정할 수 있습니다.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {registration.branchSlug && (
            <Link
              href={`/branch/${registration.branchSlug}`}
              className="rounded-[10px] bg-brand-500 px-4 py-2 text-[13px] font-extrabold text-white transition-colors hover:bg-brand-600"
            >
              우리 지점 보기
            </Link>
          )}
          <Link
            href="/branch-planner/edit"
            className="rounded-[10px] border border-line bg-white px-4 py-2 text-[13px] font-bold text-ink-soft transition-colors hover:border-brand-200 hover:text-brand-600"
          >
            내 프로필 수정
          </Link>
        </div>
      </Panel>
    );
  }

  if (registration.status === 'pending_review') {
    return (
      <Panel
        tone="neutral"
        icon={<Clock className="h-5 w-5" strokeWidth={2} />}
        badge="심사 대기"
        title={`${branchLabel} 연결을 확인하고 있습니다`}
      >
        <p>
          지점 관리자가 명함을 확인하고 있습니다. <b>지금 다시 신청하지 않으셔도 됩니다.</b>
        </p>
        <p className="mt-1.5">
          승인되면 홈 화면 상단이 우리 지점 바로가기로 바뀝니다. 보류·반려되면 그 사유가 여기에 그대로
          표시됩니다. <b>상태는 언제든 이 화면에서 확인하실 수 있습니다.</b>
        </p>
      </Panel>
    );
  }

  if (registration.status === 'on_hold') {
    return (
      <Panel
        tone="warning"
        icon={<AlertCircle className="h-5 w-5" strokeWidth={2} />}
        badge="보류"
        title={`${branchLabel} 연결이 보류되었습니다`}
      >
        <Reason reason={registration.reason} />
        <p className="mt-2.5">
          아래 양식에서 사유에 맞게 고쳐 다시 제출하시면 지점 관리자가 다시 검토합니다.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      tone="danger"
      icon={<Undo2 className="h-5 w-5" strokeWidth={2} />}
      badge="반려"
      title={`${branchLabel} 연결이 반려되었습니다`}
    >
      <Reason reason={registration.reason} />
      <p className="mt-2.5">아래 양식으로 다시 신청하실 수 있습니다.</p>
    </Panel>
  );
}

function Reason({ reason }: { reason: string | null }) {
  // 사유는 심사 RPC가 보류·반려에서 **필수로 받는다**(0112). 그래도 옛 데이터에는 비어
  // 있을 수 있으므로, 없는 것을 있는 것처럼 쓰지 않고 그대로 없다고 말한다.
  if (!reason) {
    return <p>남겨진 사유가 없습니다. 지점 관리자에게 직접 확인해주세요.</p>;
  }
  return (
    <>
      <p className="text-[11px] font-bold">지점 관리자가 남긴 사유</p>
      <p className="mt-1 whitespace-pre-wrap rounded-lg bg-white/80 px-3 py-2 text-xs leading-relaxed">
        {reason}
      </p>
    </>
  );
}

const TONE = {
  neutral: 'border-line bg-surface-sunken text-ink-soft',
  warning: 'border-[#F5DDA8] bg-[#FFFBF0] text-ink-soft',
  danger: 'border-[#F7C9BE] bg-[#FFF8F6] text-ink-soft',
  success: 'border-[#B7E4CE] bg-[#F2FBF7] text-ink-soft',
} as const;

const BADGE_TONE = {
  neutral: 'bg-[#E9ECF1] text-ink-faint',
  warning: 'bg-[#FBEFD3] text-[#B5730B]',
  danger: 'bg-[#FDE8E4] text-[#B42318]',
  success: 'bg-[#E7F7F1] text-[#0E9F6E]',
} as const;

function Panel({
  tone,
  icon,
  badge,
  title,
  children,
}: {
  tone: keyof typeof TONE;
  icon: React.ReactNode;
  badge: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border p-4 ${TONE[tone]}`}>
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${BADGE_TONE[tone]}`}>
          {icon}
        </span>
        <h2 className="flex flex-wrap items-center gap-1.5 text-sm font-extrabold leading-snug text-ink">
          {title}
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${BADGE_TONE[tone]}`}>
            {badge}
          </span>
        </h2>
      </div>
      <div className="mt-2.5 text-xs leading-relaxed">{children}</div>
    </section>
  );
}
