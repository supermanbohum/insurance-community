import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, Eye, Megaphone, MapPinned } from 'lucide-react';
import { HeroCtaButton } from '@/components/home/HeroCtaButton';
import { SITE_CONFIG } from '@/lib/config/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  // 🔴 "6개월 무료"를 뺐다(오너 확정 2026-08-11). 본문 헤드라인에서 지운 문구가
  // 탭 제목·검색결과·카톡 공유 미리보기에 계속 뜨고 있었다 - 같은 페이지가 본문에서
  // 안 하는 말을 제목으로 하고 있었다.
  // ⚠️ "무료 등록"은 남긴다. 지점 등록 자체가 무료인 것은 사실이라 거짓이 아니다.
  // ⚠️ 다른 화면(홈 히어로·설계사 게이트·지도 카드)의 "6개월 무료"는 지시 대상이
  //    아니라 그대로 둔다 - 오너가 등록 페이지만 지정했다.
  title: '우리 지점 무료 등록 — 선착순 100개',
  description: '보험맵에 지점을 등록하면 지점 상세 페이지, 조회수, 채용공고까지 한 번에 노출됩니다. 지금 신청하면 선착순 100개 안에 들어갑니다.',
  alternates: { canonical: '/register' },
};

// W-059(비로그인 문의 폼)가 배포되기 전까지는 "문의 수신" 혜택을 넣지 않는다 - 아직
// 없는 기능을 약속하면 등록한 지점장이 문의를 기다리다 아무것도 못 받는 첫인상을
// 남긴다(CTO 검수 지적). W-059가 나가면 이 배열에 다시 추가한다.
const BENEFITS = [
  { icon: MapPinned, label: '전용 지점 상세 페이지', desc: '지도·연락처·채용정보가 담긴 소개 페이지가 생깁니다' },
  { icon: Eye, label: '조회수 집계', desc: '설계사님들이 지점을 얼마나 찾아봤는지 그대로 보여드립니다' },
  { icon: Megaphone, label: '채용공고 등록', desc: '지점 페이지에 채용공고를 무료로 올릴 수 있습니다' },
];

/**
 * W-061① — "우리 지점 등록하기"의 새 목적지. 기존에는 이 버튼이 곧장 로그인 벽
 * (/partner/register → requireFullMember)으로 갔는데, 인스타 등 광고에서 폰으로
 * 넘어온 방문자가 아무 설명도 못 보고 로그인부터 요구받아 이탈했다(가입 완료 0건).
 * 이 페이지는 (main) 레이아웃 밖에 둬서 헤더/푸터/채팅 패널 없이 독립적으로 뜬다 -
 * 메타 광고 랜딩으로 그대로 재사용하기 위함. 실제 가입/승인 플로우
 * (/partner/register, 운영팀 승인 단계)는 전혀 건드리지 않고, 그 앞에 가치를
 * 먼저 보여주는 화면만 끼워 넣는다.
 *
 * 실적 숫자(등록 지점 수 등)는 의도적으로 넣지 않는다 - 지금은 1곳뿐이라 오히려
 * 설득력을 깎는다. 대신 지금 살아있는 프로모션(선착순 100개)으로 설득한다.
 * ⚠️ "6개월 무료"는 이 페이지에서 제거됐다(오너 확정 2026-08-11) - 다른 화면에는
 * 남아 있으니 여기에 다시 넣지 말 것.
 *
 * W-081 - 실제 등록된 지점 데이터를 미리보기 예시로 썼었는데, 그 지점이 삭제/수정될
 * 때마다 이 광고 랜딩이 함께 흔들렸다. /planner-register가 실제 개인 프로필 대신
 * 가상 예시를 쓰는 것과 같은 이유(본인 동의 없이 실제 데이터를 광고 소재로 쓰지
 * 않는다)로 데이터는 가상 예시로 고정한다. 조회수는 넣지 않는다.
 * 사진 자리는 디자인이 만든 "사진 미등록 상태" 샘플 이미지를 쓴다(가짜 사무실 사진
 * 금지 - 없는 데이터를 실물처럼 보여주는 것이다).
 */
const PREVIEW_EXAMPLE = {
  gaCompanyName: '○○금융파트너스',
  isGaVerified: true,
  branchName: '○○지점',
  // 등록 폼의 "한 줄 소개"가 카드에 이렇게 나온다는 것을 보여주는 자리다.
  // 🔴 예시만 바꾸면 안 된다 - 실제 카드(NewBranchCard 등)에도 같이 나와야 한다.
  tagline: '○○역 5분 · 신입 교육 전담',
  sidoName: '서울특별시',
  sigunguName: '○○구',
};

export default function RegisterIntroPage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="mx-auto flex max-w-xl items-center justify-between px-5 py-4">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-ink">
          {SITE_CONFIG.name}
        </Link>
      </header>

      {/* 🔴 pb를 늘려 CTA 겹침을 고치려 하지 말 것 - 측정으로 무효임이 확인됐다.
          최하단 스크롤에서 카드 하단과 sticky 상단의 간격은 pb-16이든 pb-40이든 항상
          32px로 같다(뷰포트 600/640/667/700/740/812 전부 동일). sticky는 최하단에서
          고정이 풀려 자기 자리에 앉고, 그 자리는 pb와 함께 통째로 밀리기 때문이다.
          겹침의 진짜 원인은 섹션 순서였다 - 아래 예시 카드 주석 참고. */}
      <main className="mx-auto flex max-w-xl flex-col gap-8 px-5 pb-16 pt-4">
        <section className="flex flex-col items-center gap-3 text-center">
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600">
            지점 등록 · 선착순 100개
          </span>
          {/* 오너 지정 표기(2026-08-11). "등록(선점)하세요"의 괄호는 그대로 둔다.
              바로 위 「지점 등록 · 선착순 100개」 뱃지는 지시 대상이 아니라 유지한다. */}
          <h1 className="text-[28px] font-extrabold leading-tight text-ink">
            우리 지점을 등록(선점)하세요
          </h1>
          <p className="text-sm leading-relaxed text-ink-soft">
            보험맵은 전국 GA 지점 정보를 모으는 플랫폼입니다.
            <br />
            지금 등록하면 정착지원금 없이도 노출을 시작할 수 있어요.
          </p>
        </section>

        {/* 🔴 예시 카드가 혜택 목록보다 위에 있어야 한다. 순서를 되돌리면 첫 화면에서
            이 카드가 하단 고정 CTA에 가려진다 - 실측: 카드가 아래일 때 문서좌표 634~939에
            놓이는데, 고정된 CTA가 뷰포트 하단에 붙어 679~796을 덮는다. 스크롤 0~143 구간
            내내 사진 영역이 가려지고, 첫 화면이 정확히 그 구간이다.
            카드를 위로 올리면 카드가 CTA 띠보다 위에 앉고 스크롤 시 위로 빠져나가므로
            어느 스크롤 위치에서도 가려지지 않는다(0~최하단 전 구간 히트테스트 0건 확인). */}
        <section className="flex flex-col gap-2">
          <p className="text-xs font-bold text-ink-faint">등록하시면 이렇게 보입니다 — 예시 화면입니다</p>
          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            {/* 🔴 가짜 사무실 사진을 그리지 않는다 - 없는 데이터를 실물처럼 보여주는 것이라
                이 자리는 "사진 미등록 지점이 실제로 갖게 될 모습"이어야 한다(디자인 판단).
                기존 초록 단색 그라데이션은 브랜드색도 아니었다. */}
            {/* 🔴 aspect-[4/3]을 지킬 것. 두 가지가 동시에 걸린다.
                (1) 실제 지점 카드가 4/3이다(BranchCard·NewBranchCard·PlannerCard 전부).
                    이 페이지는 "등록하면 이렇게 보입니다"라는 약속이라 비율이 다르면
                    약속이 틀린 게 된다. 원래 코드의 aspect-video는 실물과 달랐다.
                (2) 자산이 750×560(4:3)이라 16:9 슬롯에 object-cover로 넣으면 위아래가
                    69px씩 잘려 아래쪽 「사진을 등록하면 이 자리에 표시됩니다」 문구가
                    통째로 날아간다 - 이 이미지의 존재 이유가 그 문구다. */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-sunken">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/ui/branch-card-photo-sample.png"
                alt="사진을 등록하면 이 자리에 표시됩니다"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col gap-1 p-4">
              <div className="flex items-center gap-1 text-xs font-semibold text-brand-600">
                {PREVIEW_EXAMPLE.isGaVerified && <BadgeCheck className="h-3.5 w-3.5" />}
                {PREVIEW_EXAMPLE.gaCompanyName}
              </div>
              <p className="text-base font-bold text-ink">{PREVIEW_EXAMPLE.branchName}</p>
              <p className="truncate text-xs font-medium text-brand-600">✨ {PREVIEW_EXAMPLE.tagline}</p>
              <p className="text-xs text-ink-faint">
                {PREVIEW_EXAMPLE.sidoName} {PREVIEW_EXAMPLE.sigunguName}
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          {BENEFITS.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-card">
              <Icon className="h-5 w-5 shrink-0 text-brand-500" />
              <div>
                <p className="text-sm font-bold text-ink">{label}</p>
                <p className="text-xs leading-relaxed text-ink-faint">{desc}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="sticky bottom-4 pt-2">
          <HeroCtaButton
            href="/partner/register"
            label="무료로 등록하기"
            icon={<MapPinned className="h-6 w-6" strokeWidth={2.5} />}
            gradientClassName="from-brand-500 via-brand-600 to-brand-800"
            glowColor="rgba(37,99,235,0.45)"
          />
          <p className="mt-2 text-center text-[11px] text-ink-faint">등록 정보는 검토 후 승인되면 공개됩니다.</p>
        </section>
      </main>
    </div>
  );
}
