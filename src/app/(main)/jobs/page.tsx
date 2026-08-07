import { notFound } from 'next/navigation';

/**
 * 지점 단위 채용공고 등록 자체는 실제로 동작한다(BranchRecruitTab → branch_recruit →
 * 지점 상세 페이지 노출, /register 랜딩의 "채용공고 등록" 카드가 약속하는 게 이거다).
 * 없는 건 여러 지점의 채용공고를 한 곳에 모아 보여주는 이 집계 페이지뿐이고,
 * branch_recruit가 아직 0행이라 지금 만들어도 빈 목록이다. "준비 중" 문구 대신
 * 라우트 자체를 숨긴다(오늘 세운 원칙 - 데이터 없으면 스텁 대신 404).
 * branch_recruit에 실제 데이터가 쌓이면 이 페이지를 진짜 집계 목록으로 교체한다.
 */
export default function JobsPage() {
  notFound();
}
