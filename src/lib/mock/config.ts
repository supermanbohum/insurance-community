/**
 * Mock 데이터 모드 스위치.
 *
 * 현재는 실제 Supabase 마이그레이션(0006~0010)을 적용하지 않은 상태로 개발을
 * 진행하기 위해 true로 고정한다. DB가 준비되면 이 값을 false로 바꾸면
 * lib/public/*, lib/admin/*가 즉시 실제 Supabase 구현(*.supabase.ts)으로
 * 전환된다 - 페이지/컴포넌트 쪽 import는 전혀 바꿀 필요가 없다.
 */
export const IS_MOCK_MODE = true;
