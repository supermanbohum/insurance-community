import Link from 'next/link';
import { X } from 'lucide-react';
import { sourceLabel, type ExternalPoi } from '@/lib/public/external-poi.supabase';

/**
 * ⑪ 미등록(외부 수집) 지점 팝업 - 디자인 SPEC-037 최종본 + 콘텐츠 확정 문구.
 *
 * 🔴 등록 지점 팝업(BranchPreviewCard)과 레이아웃 자체가 다르다. 같은 틀에 색만 다르면
 * "미등록도 우리 지점"으로 읽힌다 - 그래서 브랜드 헤더·로고·뱃지·브랜드색이 전부 없는
 * 무채색 카드다. 네이버 로고·심볼도 쓰지 않고 "제휴·협력·파트너" 뉘앙스도 금지다.
 *
 * 🔴 주어 규칙(콘텐츠 확정 - 이 화면 문구를 누가 고치든 지켜야 한다):
 *   ❌ "이 지점은 정보가 부족합니다"        - 실존 사업장을 깎아내린다
 *   ✅ "보험맵에 아직 등록되지 않은 지점"    - 결손의 주어를 우리 데이터로 돌린다
 * 미등록은 인증처럼 말해서도("보험맵 지점"·"검증된 지점"), 결함처럼 말해서도
 * ("정보 부족"·"미완성") 안 된다. 그 지점은 아무 잘못이 없다.
 *
 * 🔴 비활성 라벨 4개는 반드시 유도 박스 "안"에 있어야 한다(디자인 A/B 실측 결과).
 * 독립 배치하면 잘라 봤을 때 "이 지점은 소개·사진이 없다"(결함)로 읽히고, 박스 안에
 * 있으면 구조상 분리가 불가능해 항상 "등록하면 채울 수 있다"(기회)로만 읽힌다.
 * 좁은 화면이나 스크롤로 잘려도 안 무너진다 - 밖으로 빼지 말 것.
 */

/** 등록하면 지점장이 직접 채우는 항목 - 유도 문구의 "아래 항목"이 이걸 가리킨다.
 * 평점·설계사 수는 넣지 않는다: 우리가 산출하는 값이라 자리를 만들면 "곧 우리가 채울
 * 데이터"로 읽힌다(디자인이 빈 슬롯을 경계한 이유가 정확히 그것이다). */
const FILLABLE_BY_OWNER = ['소개글', '사진', '취급 보험사', '채용공고'];

export function ExternalPoiPreviewCard({ poi, onClose }: { poi: ExternalPoi; onClose: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#E6EAF2] bg-[#F8FAFC] p-4 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-md bg-[#E6EAF2] px-2 py-1 text-[11px] font-bold text-[#5C6678]">
          📍 보험맵에 아직 등록되지 않은 지점
        </span>
        <button type="button" onClick={onClose} aria-label="닫기" className="shrink-0 text-[#98A2B3] hover:text-[#5C6678]">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 수집한 사실만. 주소는 없으면 행 자체를 만들지 않고, 연락처는 "없음"을 밝혀야
          "안 보여주는 건가?"로 오해되지 않으므로 행을 유지한다. */}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold text-[#1F2937]">{poi.name}</p>
        {poi.address && <p className="text-xs leading-relaxed text-[#5C6678]">{poi.address}</p>}
        <p className="text-xs text-[#5C6678]">{poi.phone ?? '공개된 연락처 없음'}</p>
      </div>

      <p className="text-[11px] text-[#8A93A3]">출처: {sourceLabel(poi.source)}</p>

      {/* 유도 박스 - 라벨 4개가 이 안에 있다(위 주석의 B안). */}
      <div className="flex flex-col gap-2 rounded-xl border border-[#E6EAF2] bg-white p-3">
        <p className="text-xs font-bold text-[#1F2937]">이 지점의 담당자이신가요?</p>
        <p className="text-[11px] leading-relaxed text-[#5C6678]">등록하시면 아래 항목을 직접 채우실 수 있습니다.</p>
        <div className="flex flex-wrap gap-1.5">
          {FILLABLE_BY_OWNER.map((slot) => (
            <span
              key={slot}
              className="rounded-md border border-dashed border-[#cfd6e0] bg-[#fbfcfe] px-2 py-1 text-[11px] text-[#aab2bf]"
            >
              {slot}
            </span>
          ))}
        </div>
        <p className="text-[11px] leading-relaxed text-[#5C6678]">
          지금은 오픈 이벤트로 6개월 무료입니다(선착순 100개 지점).
        </p>
        {/* 🔴 장소 URL을 수집 못 한 건은 네이버 버튼을 아예 렌더하지 않는다 - 없는 링크를
            버튼으로 만들면 "눌렀는데 없더라"가 된다. 그때는 등록 CTA가 전폭이 된다. */}
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
            우리 지점 등록하기
          </Link>
        </div>
      </div>

      {/* 이의제기 창구 - 제3자 정보를 동의 없이 게시하는 구조라 이게 없으면 이의가 곧장
          외부로 간다. 삭제 요청은 사유를 묻지 않고 즉시 처리하는 게 정책이라(오너 확정),
          문구도 "확인 후 삭제"가 아니라 "요청하시면 바로 내려드리고"로 쓴다 - 화면이
          약속하는 것과 실제 운영이 어긋나면 안 된다. */}
      <p className="border-t border-[#E6EAF2] pt-3 text-[11px] leading-relaxed text-[#8A93A3]">
        정보가 사실과 다르거나 표시를 원하지 않으시면 알려주세요 — 요청하시면 바로 내려드리고, 정정은 확인 후 반영해
        드립니다.{' '}
        <Link href="/contact" className="font-bold text-brand-600 underline underline-offset-2">
          문의하기
        </Link>
      </p>
    </div>
  );
}
