import type { Metadata } from 'next';
import { BrandMark } from '@/components/brand/BrandMark';
import { FindIdForm } from '@/components/auth/FindIdForm';

export const metadata: Metadata = {
  title: '아이디 찾기',
  description: '가입 시 등록한 이메일로 인증 후 보험맵 아이디를 확인하세요.',
  alternates: { canonical: '/find-id' },
};

export default function FindIdPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-pop">
          <BrandMark className="h-6 w-6" />
        </span>
        <h1 className="text-xl font-extrabold tracking-tight text-ink">아이디 찾기</h1>
        <p className="text-sm text-ink-faint">가입 시 등록한 이메일 인증으로 아이디를 확인합니다.</p>
      </div>

      <div className="w-full max-w-sm">
        <FindIdForm />
      </div>
    </div>
  );
}
