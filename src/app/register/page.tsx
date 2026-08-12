import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, Eye, Megaphone, MapPinned } from 'lucide-react';
import { HeroCtaButton } from '@/components/home/HeroCtaButton';
import { STICKY_BOTTOM_SAFE } from '@/lib/design/safe-area';
import { cn } from '@/lib/utils';
import { SITE_CONFIG } from '@/lib/config/site';
import { pageOpenGraph } from '@/lib/seo/config';

export const dynamic = 'force-dynamic';

// 🔴 og:title/og:description은 아래 title/description에서 자동으로 만들어지지 않는다.
// 안 적으면 루트 layout의 「보험맵」이 그대로 나간다(운영에서 확인). 한쪽만 고치지 말 것 -
// 제목을 바꾸면 공유 카드 문구도 같이 바뀌어야 한다.
const META_TITLE = '우리 지점 등록 — 지금 등록하면 0원, 선착순 100개';
const META_DESCRIPTION =
  '보험맵에 지점을 등록하면 지점 상세 페이지, 조회수, 채용공고까지 한 번에 노출됩니다. 지금 신청하면 선착순 100개 안에 들어갑니다.';

export const metadata: Metadata = {
  // 이 제목은 하루에 세 번 바뀌었다. 최종은 세 번째다.
  //   ① 「우리 지점 무료 등록 — 선착순 100개」      본문에 없는 "6개월 무료"가 제목에만 남아 있었다
  //   ② 「우리 지점 등록 — 6개월 0원, 선착순 100개」  가격 블록이 들어가며 「무료」가 거짓이 됐다
  //   ③ 「우리 지점 등록 — 지금 등록하면 0원, …」     오너 확정(2026-08-11): 「6개월」을 뺀다
  //
  // 제목이 담을 것은 "조건이 있다"는 신호이고 조건의 내용은 본문 가격 블록이 담는다.
  // 🔴 제목과 본문 2행이 같은 어순이다(「지금 등록하면 0원, 선착순 100개」) - 같은 사실을
  // 두 곳에서 다른 순서로 말하지 않는다(콘텐츠 확정). 한쪽만 고치지 말 것.
  // ⚠️ "무료"라는 낱말은 이 페이지에서 CTA·제목에는 안 쓴다. 다만 본문의
  //    "채용공고를 무료로 올릴 수 있습니다"는 조건 없이 참이라 그대로 둔다.
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: { canonical: '/register' },
  openGraph: pageOpenGraph({ title: META_TITLE, description: META_DESCRIPTION, path: '/register' }),
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
 * ⚠️ 「6개월」이라는 기간 표기는 이 페이지에서 제거됐다(오너 확정 2026-08-11).
 * 가격은 본문 가격 블록이 「지금 등록하면 0원 · 선착순 100개」로 말한다(1행의 취소선
 * 「월 4,900원」이 원래 가격을 계속 보여준다).
 * 다른 화면에는 「6개월 무료」가 그대로 남아 있고 그건 의도된 것이다 - 여기에
 * 다시 넣지 말 것.
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
  // 🔴 tagline과 다른 문구여야 한다. 예시가 같은 말을 두 번 하면 등록자가
  // "잘라서 쓰는 칸"으로 오해한다(오너 확정: 따로 받는 문구다).
  shortTagline: '신입 환영',
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
              {/* 🔴 두 소개는 서로 다른 문구다(오너 확정 2026-08-12).
                    지점명 오른쪽  short_tagline  작게 · 9자 이내 · 선택 입력
                    지점명 아래    tagline              원래 자리 · 길이 제한 그대로
                  자른 것이 아니라 따로 받는다 - 같은 말이 두 번 보이면 오른쪽에 넣을 이유가 없다.
                  🔴 short_tagline이 없으면 오른쪽을 그냥 비운다. 대체 텍스트·placeholder 금지 -
                  오너가 지적한 게 "오른쪽이 비어 보인다"였는데 빈 요소를 그리면 그대로 남는다.
                  ⚠️ 한 번 실패한 자리다: tagline을 오른쪽으로 옮겼더니 190px 카드에서 5글자만
                  보였다. 짧은 문구를 따로 받는 게 그 결론이다. */}
              {/* 🔴 지점명에 max-w를 걸지 않는다(CTO 판정). 짧은 소개 자리를 만들려고 지점명을
                    자르면 어느 지점인지 알 수 없게 된다 - 자리가 없으면 짧은 소개를 숨긴다.
                    ⚠️ 여기는 예시라 실제로 숨는 일이 없다(「○○지점」 4자라 항상 다 들어간다).
                    그래도 실제 목록 카드(NewBranchCard)와 같은 규칙으로 맞춰 둔다 - 두 곳이
                    다르면 "예시에선 이랬는데" 가 그대로 재발한다. 짧은 소개가 실제로 숨는
                    상황은 등록 폼 미리보기의 190px 목록 카드가 보여준다. */}
              <p className="flex items-baseline gap-1 text-base font-bold text-ink">
                <span className="min-w-0 truncate">{PREVIEW_EXAMPLE.branchName}</span>
                <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold text-[#8B95A8]">
                  {PREVIEW_EXAMPLE.shortTagline}
                </span>
              </p>
              {/* 🔴 한 줄 소개는 14px/500 회색(#6B7280)이다. 파란색(brand-600)을 쓰지 말 것 -
                  이 사이트에서 파랑은 「누를 수 있는 것」 전용이다(「1호 지점 등록」·「더보기」·
                  CTA가 전부 그 색). 부가정보가 그 색이면 링크로 보이고, 주정보인 지점명(검정)
                  보다 튀는 역전이 생긴다(디자인 실측 지적).
                  🔴 14px는 짧은 소개 11px의 전제다. 둘을 같은 크기로 두면 위계가 사라져
                  「서로 다른 두 문구」가 한 덩어리로 읽힌다 - 이 기능을 만든 이유가 없어진다.
                  확정 위계: 지점명 16/700 검정 → 한 줄 소개 14/500 #6B7280 →
                            지역 12/400 → 짧은 소개 11/600 #8B95A8 */}
              <p className="truncate text-[14px] font-medium text-[#6B7280]">✨ {PREVIEW_EXAMPLE.tagline}</p>
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

        {/* ─────────────────────────────────────────────────────────────
            SPEC-041 §③ 요금 표시 (디자인 v2 확정 · 랜딩 전용 규격 = 완료화면의 0.7배)

            2줄 구조이고 순서·문구가 고정이다:
              1행  월 4,900원(취소선)  0원            ← 「0원」만 펄스
              2행  지금 등록하면 0원 · 선착순 100개      ← 🔴 절대 움직이지 않는다

            🔴 2행의 「0원」을 지우지 말 것. 지우면 "지금 등록하면 · 선착순 100개"가 되어
               지금 등록하면 무엇인지가 사라진다.

            🔴 「가격을 안 알리게 됐다」로 읽지 말 것 - 사실이 아니다.
               **1행에 취소선 친 「월 4,900원」이 그대로 남아** 사용자는 「월 4,900원 → 0원」을
               본다. 없어진 것은 「언제부터 4,900원인가」이지 「얼마인가」가 아니다.
               이 구분을 안 적으면 다음 사람이 「가격 미고지」로 오독하고 되돌리려 한다.

            🔴 2행은 「선착순 100개 지점」이고 **18px**다(오너 직접 지시 2026-08-13).
               이력이 뒤집힌 자리라 그대로 적어 둔다:
                 8/12  「지점」을 뺐다 - 20px에서 331.4px/여유 3.6px라 폰트 폴백 한 번이면
                       경고 없이 잘린다는 판단이었다
                 8/13  오너가 /register 스크린샷을 짚어 「100개 뒤에 지점 붙이라고」 지시했다.
                       판단이 틀렸던 게 아니라 **전제(20px 고정)가 바뀐 것**이다.
               크기를 낮춰 수납한다(디자인 실측, 컨테이너 335px):
                 20px + 지점  330.8px  여유  4.2px (1.3%)   🔴 조용히 잘린다 - 불가
                 19px + 지점  314.3px  여유 20.7px (6.2%)   미달
                 18px + 지점  297.7px  여유 37.3px (11.1%)  ✅ 채택
               🔴 크기 외 규격은 그대로다(1행 28/700 취소선 3px · 「0원」 40/800 펄스 ·
                 transform-origin: left center · 2행 애니메이션 없음).
               🔴 2행의 「0원」을 지우지 않는 금지는 그대로 유효하다.
               ⚠️ metadata title은 여전히 「선착순 100개」다 - 제목은 폭 제약이 다른 자리라
                 같이 바꾸지 않았다(지시 범위도 본문이었다).
               ⚠️ 8/12에는 「폰트를 줄여 문구를 욱여넣지 않는다(CTO), 기간 줄은 20px 그대로」
               였다. 8/13 오너 지시로 문구가 고정값이 되면서 **줄일 수 있는 것이 크기뿐**이
               되어 18px로 내렸다. 순서가 바뀐 게 아니라 고정된 쪽이 바뀐 것이다.

            ⚠️ 문구 이력: 「6개월간 0원 · 이후 월 4,900원」 → (오너 2026-08-11) 「지금 등록하면
               0원 · 이후 월 4,900원」 → (오너 2026-08-12) 현재. 「6개월」이 빠지면서 「이후」가
               가리킬 것이 페이지에서 사라진 것을 디자인이 짚었고, 오너가 그 절을 통째로
               「선착순 100개」로 바꿔 닫았다.
               🔴 적용 범위는 **이 페이지 하나뿐이다.** 홈 히어로·설계사 게이트·지도
               카드는 여전히 「6개월 무료」라고 말한다(HomeRegisterHero.tsx:151,
               BranchPlannerGate.tsx:23·51, ExternalPoiPreviewCard.tsx:66).
               **이 불일치는 버그가 아니라 오너가 부작용을 알고 고른 결과다**(CTO가
               선택지에 명시해 확인받음). 일관성을 맞추겠다고 다른 파일을 고치지 말 것 -
               범위를 넓히려면 오너 확인이 다시 필요하다.
            🔴 같은 숫자 4,900의 위계를 3축으로 분리해 뒀다 - 크기(28 vs 20)·취소선(有 vs 無)·
               색(#98A2B3 vs #48546b). 1행은 "원래 값", 2행은 "6개월 뒤 실제 낼 값"이라
               같은 무게로 보이면 혼동된다. 하나만 달라도 구분이 약해진다.
            🔴 애니메이션은 「0원」 하나에만 건다. 2행까지 움직이면 가장 읽혀야 할 정보가
               가장 안 읽힌다. prefers-reduced-motion에서는 반드시 정지한다(멀미·전정기관).
            ───────────────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-1">
          <style>{`
@keyframes price-pulse { from { transform: scale(1.00); } to { transform: scale(1.06); } }
.price-free {
  /* inline 요소에는 transform이 안 걸린다 - inline-block을 빼면 애니메이션이 조용히 죽는다 */
  display: inline-block;
  /* 왼쪽 기준으로 커져야 취소선과의 정렬이 흔들리지 않는다(중앙 기준이면 좌우로 떤다) */
  transform-origin: left center;
  animation: price-pulse 2.4s ease-in-out infinite alternate;
}
@media (prefers-reduced-motion: reduce) { .price-free { animation: none; } }
          `}</style>
          <p className="flex items-baseline gap-2">
            <span className="text-[28px] font-bold leading-none text-[#98A2B3] [text-decoration-thickness:3px] line-through">
              월 4,900원
            </span>
            <span className="price-free text-[40px] font-extrabold leading-none text-[#2472EC]">0원</span>
          </p>
          <p className="text-[18px] font-semibold leading-snug text-[#48546b]">
            지금 등록하면 0원 · 선착순 100개 지점
          </p>
        </section>

        <section className={cn('sticky pt-2', STICKY_BOTTOM_SAFE)}>
          <HeroCtaButton
            href="/partner/register"
            // 🔴 「무료로 등록하기」 → 「지금 등록하기」(콘텐츠 확정). 바로 위 가격 블록이
            // 「0원」을 40px로 말하고 있어 버튼이 또 "무료"라고 하면 중복이고, 버튼은
            // 조건 없는 무료를, 블록은 조건부를 말해 서로 부딪힌다. CTA는 행동만 말한다.
            label="지금 등록하기"
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
