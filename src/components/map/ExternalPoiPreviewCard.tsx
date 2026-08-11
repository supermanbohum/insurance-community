import Link from 'next/link';
import { X } from 'lucide-react';
import { sourceLabel, type ExternalPoi } from '@/lib/public/external-poi.supabase';

/**
 * ⑪ 미등록(외부 수집) 지점 팝업 - 디자인 SPEC-037 확정본 + 콘텐츠 확정 문구.
 *
 * 🔴 등록 지점 팝업(BranchPreviewCard)과 레이아웃 자체를 다르게 둔다. 같은 틀에 색만
 * 다르면 "미등록도 우리 지점"으로 읽힌다 - 그래서 여기엔 브랜드 헤더도, 로고도,
 * 뱃지도, 브랜드색도 없다. 무채색 카드다.
 *
 * 🔴 주어 규칙(콘텐츠 확정, 이 화면 문구를 누가 고치든 지켜야 한다):
 *   ❌ "이 지점은 정보가 부족합니다"   - 실존 사업장을 깎아내린다
 *   ✅ "보험맵에는 아직 소개·사진이 없습니다" - 결손의 주어를 우리 데이터로 돌린다
 * 미등록은 인증처럼 말해서도("보험맵 지점"·"검증된 지점"), 결함처럼 말해서도
 * ("정보 부족"·"미완성") 안 된다. 그 지점은 아무 잘못이 없다.
 *
 * 🔴 소개글·사진·취급 보험사·채용공고는 "빈 자리"로만 보여준다(디자인 확정본) -
 * 등록하면 채울 수 있는 4가지가 무엇인지 보여주는 게 목적이라 가짜 내용은 넣지 않는다.
 * 평점·설계사 수는 이 목록에 없다 - 지점장이 채우는 항목이 아니라 우리가 산출하는
 * 값이라, 자리를 만들면 "곧 우리가 채울 데이터"로 읽히기 때문이다.
 */

/** 등록하면 지점장이 직접 채울 수 있는 항목 - 유도 문구의 4가지와 정확히 일치시킨다. */
const EMPTY_SLOTS = ['소개글', '사진', '취급 보험사', '채용공고'];

export function ExternalPoiPreviewCard({ poi, onClose }: { poi: ExternalPoi; onClose: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#E6EAF2] bg-[#F8FAFC] p-4 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-md bg-[#E6EAF2] px-2 py-1 text-[11px] font-bold text-[#5C6678]">
          📍 아직 등록되지 않은 지점
        </span>
        <button type="button" onClick={onClose} aria-label="닫기" className="shrink-0 text-[#98A2B3] hover:text-[#5C6678]">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 수집한 사실만 - 없는 항목은 행 자체를 만들지 않는다(주소). 연락처는 "없음"을
          명시해야 사용자가 "안 보여주는 건가?"로 오해하지 않으므로 행을 유지한다. */}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold text-[#1F2937]">{poi.name}</p>
        {poi.address && <p className="text-xs leading-relaxed text-[#5C6678]">{poi.address}</p>}
        <p className="text-xs text-[#5C6678]">{poi.phone ?? '공개된 연락처 없음'}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {EMPTY_SLOTS.map((slot) => (
          <span
            key={slot}
            className="rounded-md border border-dashed border-[#cfd6e0] bg-[#fbfcfe] px-2 py-1 text-[11px] text-[#aab2bf]"
          >
            {slot}
          </span>
        ))}
      </div>

      <p className="text-[11px] leading-relaxed text-[#8A93A3]">
        {sourceLabel(poi.source)}를 기준으로 표시하고 있습니다. 보험맵에 등록된 지점이 아니라, 소개·사진·채용 정보는 아직
        없습니다
      </p>

      <div className="flex flex-col gap-2 border-t border-[#E6EAF2] pt-3">
        <p className="text-xs font-bold text-[#1F2937]">이 지점의 담당자이신가요?</p>
        <p className="text-[11px] leading-relaxed text-[#5C6678]">
          등록하시면 소개글·사진·취급 보험사·채용공고를 직접 채우실 수 있습니다. 지금은 오픈 이벤트로 6개월
          무료입니다(선착순 100개 지점).
        </p>
        {/* 🔴 장소 URL을 수집하지 못한 건은 네이버 버튼을 아예 렌더하지 않는다(디자인 확정) -
            없는 링크를 버튼으로 만들면 "눌렀는데 없더라"가 된다. 그때는 등록 CTA 하나가 전폭. */}
        <div className="flex gap-2">
          {poi.placeUrl && (
            <a
              href={poi.placeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center rounded-lg border border-[#cfd6e0] bg-white px-3 py-2 text-xs font-bold text-[#5C6678] transition-colors hover:bg-[#F8FAFC]"
            >
              네이버 지도에서 보기
            </a>
          )}
          <Link
            href="/register"
            className="flex flex-1 items-center justify-center rounded-lg border border-brand-600 bg-white px-3 py-2 text-xs font-bold text-brand-600 transition-colors hover:bg-[#F0F6FF]"
          >
            이 지점 등록하기
          </Link>
        </div>
      </div>
    </div>
  );
}
