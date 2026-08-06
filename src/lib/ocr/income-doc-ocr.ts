import 'server-only';

export interface IncomeDocOcrResult {
  incomeKrw: number | null;
  confidence: number | null;
  raw: unknown;
}

/**
 * 원천징수영수증 OCR 자동인식 - 구조만 설계된 스텁이다. TOP설계사 인증/연봉랭킹
 * 신청 업로드 직후 호출되며, 지금은 항상 미인식으로 응답한다. 관리자는 이 결과와
 * 무관하게 항상 금액/등급을 직접 입력·확정할 수 있다(OCR은 참고용 보조 수단).
 * 향후 Claude/OpenAI Vision API 호출로 이 함수 내부만 교체하면 자동 입력이
 * 활성화된다 - 호출부(top-designer.ts/salary-ranking.ts)는 변경할 필요 없다.
 */
export async function runIncomeDocOcr(_docPath: string): Promise<IncomeDocOcrResult> {
  // TODO: Claude/OpenAI Vision API로 원천징수영수증에서 연봉을 추출하도록 교체.
  return { incomeKrw: null, confidence: null, raw: null };
}
