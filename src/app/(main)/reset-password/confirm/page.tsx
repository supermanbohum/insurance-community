import type { Metadata } from 'next';
import { BrandMark } from '@/components/brand/BrandMark';
import { ResetPasswordConfirmForm } from '@/components/auth/ResetPasswordConfirmForm';

export const metadata: Metadata = {
  title: '새 비밀번호 설정',
  robots: { index: false },
};

export default function ResetPasswordConfirmPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-pop">
          <BrandMark className="h-6 w-6" />
        </span>
        <h1 className="text-xl font-extrabold tracking-tight text-ink">새 비밀번호 설정</h1>
        <p className="text-sm text-ink-faint">새로 사용할 비밀번호를 입력해주세요.</p>
      </div>

      <div className="w-full max-w-sm">
        <ResetPasswordConfirmForm />
      </div>
    </div>
  );
}
