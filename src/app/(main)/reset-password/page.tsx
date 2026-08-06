import type { Metadata } from 'next';
import { BrandMark } from '@/components/brand/BrandMark';
import { ResetPasswordRequestForm } from '@/components/auth/ResetPasswordRequestForm';

export const metadata: Metadata = {
  title: '비밀번호 찾기',
  description: '아이디 또는 이메일 인증으로 보험맵 비밀번호를 재설정하세요.',
  alternates: { canonical: '/reset-password' },
};

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-pop">
          <BrandMark className="h-6 w-6" />
        </span>
        <h1 className="text-xl font-extrabold tracking-tight text-ink">비밀번호 찾기</h1>
        <p className="text-sm text-ink-faint">아이디 또는 이메일로 재설정 링크를 보내드립니다.</p>
      </div>

      <div className="w-full max-w-sm">
        <ResetPasswordRequestForm />
      </div>
    </div>
  );
}
