'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { CheckCircle2, MessageSquare, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { submitBranchInquiryAction, type SubmitBranchInquiryInput } from '@/lib/actions/branch-inquiry';

const MESSAGE_MAX = 200;

const ERROR_MESSAGES: Record<string, string> = {
  CONSENT_REQUIRED: '동의하지 않으실 수 있습니다. 다만 이 동의는 문의 전달에 꼭 필요해서, 동의 없이는 문의를 보낼 수 없습니다.',
  TOO_FAST: '잠시 후 다시 시도해주세요.',
  INVALID_INPUT: '입력하신 내용을 확인해주세요.',
  MESSAGE_TOO_LONG: `문의 내용은 ${MESSAGE_MAX}자 이내로 입력해주세요.`,
  BRANCH_NOT_FOUND: '문의를 보낼 수 없는 지점입니다.',
  RATE_LIMITED: '문의가 너무 많이 접수되었습니다. 잠시 후 다시 시도해주세요.',
  UNKNOWN: '문의 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
};

/**
 * W-059 - 비로그인 지점 문의 폼. 로그인을 요구하지 않는다(이게 이 기능 전부의
 * 핵심 - CTO 스펙). renderedAtRef는 마운트 시점 1회만 기록해 RPC의 3초 봇 필터
 * 기준으로 쓴다.
 */
export function BranchInquiryForm({ branchId, branchName }: { branchId: string; branchName: string }) {
  const renderedAtRef = useRef(new Date().toISOString());
  const [inquirerName, setInquirerName] = useState('');
  const [contactType, setContactType] = useState<'phone' | 'kakao'>('phone');
  const [contactValue, setContactValue] = useState('');
  const [career, setCareer] = useState('');
  const [message, setMessage] = useState('');
  const [consentCollection, setConsentCollection] = useState(false);
  const [consentThirdParty, setConsentThirdParty] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit =
    inquirerName.trim().length > 0 && contactValue.trim().length > 0 && message.trim().length > 0 && consentCollection && consentThirdParty;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || isPending) return;

    setIsPending(true);
    const input: SubmitBranchInquiryInput = {
      branchId,
      inquirerName: inquirerName.trim(),
      contactType,
      contactValue: contactValue.trim(),
      career,
      message: message.trim(),
      consentCollection,
      consentThirdParty,
      formRenderedAt: renderedAtRef.current,
    };
    const result = await submitBranchInquiryAction(input);
    setIsPending(false);

    if (!result.success) {
      toast.error(ERROR_MESSAGES[result.error] ?? ERROR_MESSAGES.UNKNOWN);
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-surface-sunken py-8 text-center">
        <CheckCircle2 className="h-6 w-6 text-brand-600" />
        <p className="text-sm font-bold text-ink">문의가 접수되었습니다</p>
        <p className="text-xs text-ink-faint">{branchName} 담당자에게 전달됩니다. 회신을 기다려주세요.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-dashed border-line bg-surface-sunken p-4">
      <div>
        <p className="text-sm font-semibold text-ink">이 지점에 관심이 있으신가요?</p>
        <p className="mt-0.5 text-xs text-ink-faint">
          이 문의는 <span className="font-semibold text-brand-600">{branchName}</span> 담당자에게 전달됩니다.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bi-name">이름</Label>
        <Input id="bi-name" value={inquirerName} onChange={(e) => setInquirerName(e.target.value)} maxLength={30} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>연락처</Label>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-line bg-white p-0.5">
            <button
              type="button"
              onClick={() => setContactType('phone')}
              className={cn(
                'flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors',
                contactType === 'phone' ? 'bg-brand-600 text-white' : 'text-ink-faint'
              )}
            >
              <Phone className="h-3.5 w-3.5" /> 휴대폰
            </button>
            <button
              type="button"
              onClick={() => setContactType('kakao')}
              className={cn(
                'flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors',
                contactType === 'kakao' ? 'bg-brand-600 text-white' : 'text-ink-faint'
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" /> 카카오톡 ID
            </button>
          </div>
          <Input
            value={contactValue}
            onChange={(e) => setContactValue(e.target.value)}
            placeholder={contactType === 'phone' ? '010-0000-0000' : '카카오톡 ID'}
            maxLength={40}
            required
            className="flex-1"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bi-career">
          경력 <span className="font-normal text-ink-faint">(선택)</span>
        </Label>
        <Input id="bi-career" value={career} onChange={(e) => setCareer(e.target.value)} placeholder="예: 5년차" maxLength={40} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bi-message">문의 내용</Label>
        <Textarea
          id="bi-message"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
          rows={3}
          maxLength={MESSAGE_MAX}
          required
        />
        <p className="text-right text-[11px] text-ink-faint">
          {message.length}/{MESSAGE_MAX}
        </p>
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <label className="flex items-start gap-2 text-xs text-ink-soft">
          <Checkbox checked={consentCollection} onCheckedChange={(v) => setConsentCollection(v === true)} className="mt-0.5" />
          <span>
            (필수) 개인정보 수집·이용 동의 — 이름·연락처·경력·문의 내용, 보유 6개월{' '}
            <Link href="/privacy#1" target="_blank" className="font-semibold text-brand-600 underline underline-offset-2">
              전문 보기
            </Link>
          </span>
        </label>
        <label className="flex items-start gap-2 text-xs text-ink-soft">
          <Checkbox checked={consentThirdParty} onCheckedChange={(v) => setConsentThirdParty(v === true)} className="mt-0.5" />
          <span>
            (필수) 제3자 제공 동의 — 문의한 지점의 담당자에게 위 정보가 전달됩니다{' '}
            <Link href="/privacy#4" target="_blank" className="font-semibold text-brand-600 underline underline-offset-2">
              전문 보기
            </Link>
          </span>
        </label>
      </div>

      <Button type="submit" disabled={!canSubmit || isPending}>
        {isPending ? '보내는 중...' : '문의 보내기'}
      </Button>
    </form>
  );
}
