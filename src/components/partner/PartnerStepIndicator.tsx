import { Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GaApprovalStatus } from '@/types/database';

const STEP_LABELS = ['회원가입', 'GA 등록', '지점 등록', '승인 대기', '승인 완료'] as const;

export type PartnerStepStatus = 'signup' | 'onboarding' | GaApprovalStatus;

/**
 * status로부터 완료된 단계 수(1~5)를 계산한다.
 * GA/지점 등록은 온보딩 한 화면에서 함께 제출되므로 2·3단계는 항상 같이 완료 처리된다.
 */
function resolveStepIndex(status: PartnerStepStatus): { completed: number; hasError: boolean } {
  switch (status) {
    case 'signup':
      return { completed: 1, hasError: false };
    case 'onboarding':
      return { completed: 1, hasError: false };
    case 'pending':
      return { completed: 3, hasError: false };
    case 'approved':
      return { completed: 5, hasError: false };
    case 'rejected':
    case 'suspended':
      return { completed: 3, hasError: true };
    default:
      return { completed: 1, hasError: false };
  }
}

export function PartnerStepIndicator({ status }: { status: PartnerStepStatus }) {
  const { completed, hasError } = resolveStepIndex(status);
  const currentStep = hasError ? 4 : Math.min(completed + 1, 5);

  return (
    <div className="flex items-center" role="list" aria-label="파트너 등록 진행 단계">
      {STEP_LABELS.map((label, i) => {
        const stepNumber = i + 1;
        const isDone = stepNumber <= completed;
        const isCurrent = stepNumber === currentStep;
        const isErrorStep = hasError && stepNumber === 4;

        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <span
                role="listitem"
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                  isErrorStep
                    ? 'bg-destructive/10 text-destructive ring-2 ring-destructive/30'
                    : isDone
                      ? 'bg-brand-600 text-white'
                      : isCurrent
                        ? 'bg-brand-50 text-brand-600 ring-2 ring-brand-300'
                        : 'bg-surface-sunken text-ink-faint'
                )}
              >
                {isErrorStep ? <AlertTriangle className="h-3.5 w-3.5" /> : isDone ? <Check className="h-3.5 w-3.5" /> : stepNumber}
              </span>
              <span
                className={cn(
                  'whitespace-nowrap text-[10px] font-medium',
                  isErrorStep ? 'text-destructive' : isDone || isCurrent ? 'text-ink' : 'text-ink-faint'
                )}
              >
                {label}
              </span>
            </div>
            {stepNumber < STEP_LABELS.length && (
              <div className={cn('mx-1.5 h-0.5 flex-1 rounded-full', stepNumber < completed ? 'bg-brand-600' : 'bg-surface-sunken')} />
            )}
          </div>
        );
      })}
    </div>
  );
}
