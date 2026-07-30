'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { MailCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { GaSearchSelect } from '@/components/auth/GaSearchSelect';
import type { GaFilterOption } from '@/lib/public/ga-directory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken';

export function SignupForm({ gaOptions }: { gaOptions: GaFilterOption[] }) {
  const { signUpWithEmail, isPending } = useAuth();
  const [submitted, setSubmitted] = useState(false);

  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [gaCompanyId, setGaCompanyId] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = username.trim();
    if (trimmed.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    debounceRef.current = setTimeout(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('check_username_available', { p_username: trimmed });
      setUsernameStatus(error ? 'idle' : data ? 'available' : 'taken');
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username]);

  const passwordsMatch = password.length > 0 && password === passwordConfirm;
  const canSubmit =
    username.trim().length >= 3 &&
    usernameStatus === 'available' &&
    password.length >= 8 &&
    passwordsMatch &&
    name.trim() &&
    email.trim() &&
    contact.trim() &&
    gaCompanyId;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // 버튼을 disabled로만 막으면 "눌러도 반응이 없다"는 인상을 주므로, 어떤 항목이
    // 비어있는지 항상 토스트로 알려준다 - 클릭이 아무 피드백 없이 사라지지 않게 한다.
    if (!canSubmit || !gaCompanyId) {
      const reason =
        username.trim().length < 3
          ? '아이디를 3자 이상 입력해주세요.'
          : usernameStatus === 'checking'
            ? '아이디 중복 확인이 끝날 때까지 잠시만 기다려주세요.'
            : usernameStatus === 'taken'
              ? '이미 사용 중인 아이디입니다.'
              : password.length < 8
                ? '비밀번호를 8자 이상 입력해주세요.'
                : !passwordsMatch
                  ? '비밀번호가 일치하지 않습니다.'
                  : !name.trim()
                    ? '이름을 입력해주세요.'
                    : !email.trim()
                      ? '이메일을 입력해주세요.'
                      : !contact.trim()
                        ? '연락처를 입력해주세요.'
                        : !gaCompanyId
                          ? '소속 GA를 검색해서 선택해주세요.'
                          : '입력값을 확인해주세요.';
      toast.error(reason);
      return;
    }

    signUpWithEmail({ username: username.trim(), password, name: name.trim(), email: email.trim(), contact: contact.trim(), gaCompanyId })
      .then((result) => {
        if (!result.success) {
          toast.error(result.error ?? '가입에 실패했습니다.');
          return;
        }
        toast.success('인증 메일을 발송했습니다. 이메일을 확인해주세요.');
        setSubmitted(true);
      })
      .catch((err) => {
        console.error('[SignupForm] signUpWithEmail 처리 중 오류:', err);
        toast.error('가입 처리 중 예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      });
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-white p-8 text-center shadow-card">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <MailCheck className="h-6 w-6" />
        </span>
        <p className="text-sm font-bold text-ink">이메일을 확인해주세요</p>
        <p className="text-xs text-ink-faint">
          {email}로 인증 메일을 보내드렸습니다. 메일의 인증 링크를 클릭하면 가입이 완료됩니다.
        </p>
        <Link href="/login" className="text-xs font-semibold text-brand-600 hover:underline">
          로그인 화면으로
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="su-username">아이디</Label>
        <Input id="su-username" value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} required />
        {usernameStatus === 'checking' && <p className="text-xs text-ink-faint">확인 중...</p>}
        {usernameStatus === 'available' && <p className="text-xs text-brand-600">사용 가능한 아이디입니다.</p>}
        {usernameStatus === 'taken' && <p className="text-xs text-destructive">이미 사용 중인 아이디입니다.</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="su-password">비밀번호</Label>
        <Input id="su-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        <p className="text-xs text-ink-faint">8자 이상</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="su-password-confirm">비밀번호 확인</Label>
        <Input
          id="su-password-confirm"
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          required
        />
        {passwordConfirm.length > 0 && !passwordsMatch && <p className="text-xs text-destructive">비밀번호가 일치하지 않습니다.</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="su-name">이름</Label>
        <Input id="su-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="su-email">이메일</Label>
        <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <p className="text-xs text-ink-faint">인증 메일을 받을 주소입니다.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="su-contact">연락처</Label>
        <Input id="su-contact" value={contact} onChange={(e) => setContact(e.target.value)} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="su-ga">소속 GA</Label>
        <GaSearchSelect options={gaOptions} value={gaCompanyId} onChange={setGaCompanyId} />
      </div>

      <Button type="submit" disabled={isPending} size="lg">
        {isPending ? '가입 처리 중...' : '회원가입'}
      </Button>
      <p className="text-center text-xs text-ink-faint">
        이미 계정이 있으신가요? <Link href="/login" className="font-semibold text-brand-600 hover:underline">로그인</Link>
      </p>
    </form>
  );
}
