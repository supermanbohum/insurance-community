import type { Metadata } from 'next';
import { Mail, MessageCircle } from 'lucide-react';
import { LegalPageLayout, LegalSection, LegalList, LegalTable } from '@/components/legal/LegalPageLayout';
import { COMPANY_INFO } from '@/lib/config/site';

export const metadata: Metadata = {
  title: '데이터 삭제 요청',
  description: '보험맵 회원 탈퇴 및 개인정보 삭제를 요청하는 방법과 처리 절차, 삭제 항목을 안내합니다.',
  alternates: { canonical: '/delete-account' },
};

const EFFECTIVE_DATE = '2026년 8월 4일';

const DELETE_MAIL_HREF = `mailto:${COMPANY_INFO.email}?subject=${encodeURIComponent('[보험맵] 계정 삭제 요청')}&body=${encodeURIComponent(
  '가입 시 사용한 이메일 주소: \n삭제를 요청하는 계정/닉네임: \n\n※ 본인 확인을 위해 가입하신 이메일로 회신드릴 수 있습니다.'
)}`;

/** 데이터 삭제 요청 - Google Play "계정 및 데이터 삭제" 정책 대응 페이지. 앱 미설치/
 * 로그아웃 상태에서도 접근 가능한 웹 페이지로, 삭제 절차와 항목을 명시한다. 실제
 * 삭제는 현재 자동화된 self-service RPC가 아니라 운영자가 본인확인 후 수동 처리한다 -
 * 이메일 문의를 유일한 접수창구로 두어 처리 이력을 놓치지 않게 한다. */
export default function DeleteAccountPage() {
  return (
    <LegalPageLayout title="데이터 삭제 요청" effectiveDate={EFFECTIVE_DATE}>
      <LegalSection title="개요">
        <p>
          보험맵 회원은 언제든지 계정 탈퇴와 함께 회사가 보유한 본인의 개인정보 삭제를 요청할 수 있습니다. 이 페이지는
          앱을 삭제했거나 로그인할 수 없는 경우에도 삭제를 요청할 수 있도록 별도로 제공됩니다.
        </p>
      </LegalSection>

      <LegalSection title="1. 삭제 요청 방법">
        <p>아래 이메일 버튼을 눌러 양식에 맞게 보내주시면, 본인 확인 후 처리해 드립니다.</p>
        <a
          href={DELETE_MAIL_HREF}
          className="mt-1 flex w-fit items-center gap-2 rounded-xl bg-[var(--lp-brand)] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          <Mail className="h-4 w-4" />
          이메일로 삭제 요청하기
        </a>
        <p className="mt-1 flex items-center gap-1.5 text-[13px] text-[var(--lp-ink-faint)]">
          <MessageCircle className="h-3.5 w-3.5 shrink-0" />
          카카오톡 문의로도 요청 가능합니다 (
          <a href={COMPANY_INFO.kakaoChannelUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            카카오톡 채널 열기
          </a>
          )
        </p>
        <LegalList
          items={[
            '가입 시 사용한 이메일 주소(또는 카카오 로그인 계정)',
            '삭제를 요청하는 닉네임 또는 회원 정보',
            '(선택) 삭제를 요청하는 사유',
          ]}
        />
      </LegalSection>

      {/* 🔴 카카오 가입자는 이 이메일 요청 경로 말고도 스스로 탈퇴할 수 있다 -
          카카오 쪽에서 연결을 끊으면 그 자체가 탈퇴로 처리된다(0103·0106 웹훅).
          그 사실을 여기 안 적으면 카카오 사용자는 "이메일을 보내야만 탈퇴된다"고 읽는다.
          🔴 「탈퇴한 회원」은 DB에 실제로 박히는 문자열과 같아야 한다(/privacy와 동일 규칙). */}
      <div className="flex flex-col gap-2 rounded-xl border border-[var(--lp-line)] bg-[var(--lp-surface-sunken)] p-4">
        <p className="text-[14px] font-bold text-[var(--lp-ink)]">카카오 계정으로 가입하셨다면</p>
        <p className="text-[13px] leading-relaxed text-[var(--lp-ink-soft)]">
          카카오 계정 설정에서 보험맵 연결을 해제하셔도 <strong className="font-bold">탈퇴로 처리</strong>됩니다.
          이 경우에도 개인정보는 즉시 파기되며,{' '}
          <strong className="font-bold">
            작성하신 게시글과 댓글은 남고 작성자 이름만 「탈퇴한 회원」으로 바뀝니다.
          </strong>
        </p>
        <p className="text-[13px] leading-relaxed text-[var(--lp-ink-soft)]">
          연결 해제는 <strong className="font-bold">되돌릴 수 없으니</strong> 신중히 결정해 주세요.
        </p>
      </div>

      <LegalSection title="2. 처리 절차 및 기간">
        <p>
          회사는 요청인이 본인임을 확인한 뒤, 접수일로부터 영업일 기준 7일 이내에 계정 및 개인정보를 삭제 처리합니다.
          처리가 완료되면 요청하신 이메일로 완료 안내를 드립니다.
        </p>
      </LegalSection>

      <LegalSection title="3. 삭제되는 데이터">
        <p>계정 삭제 요청이 처리되면 아래 정보가 삭제되거나 식별할 수 없도록 처리됩니다.</p>
        <LegalList
          items={[
            '계정 정보: 이메일, 비밀번호, 닉네임, 프로필 사진, 로그인 연동 정보(카카오)',
            '설계사 마켓 프로필: 활동지역, 경력, 자기소개, 연락처, 인증 서류, 배지 신청 내역',
            'GA·지점 파트너 정보: 담당자 연락처, 사업자 등록 서류 등 개인 식별 정보',
            '서비스 이용 기록: 즐겨찾기, 게시글·댓글 작성자 정보(게시물 자체는 익명 처리되어 존치될 수 있습니다), 채팅 메시지, 열람권 구매·언락 이력의 개인 식별 정보',
          ]}
        />
      </LegalSection>

      <LegalSection title="4. 법령에 따라 일정 기간 보관되는 데이터">
        <p>
          아래 정보는 관계 법령에 따라 계정 삭제 후에도 명시된 기간 동안 별도 분리 보관되며, 보관 목적 외에는
          사용되지 않고 기간 경과 후 즉시 파기됩니다. (
          <a href="/privacy#3" className="underline underline-offset-2">
            개인정보처리방침 제3조
          </a>
          와 동일한 기준입니다.)
        </p>
        <LegalTable
          head={['보존 항목', '보존 기간', '근거 법령']}
          rows={[
            ['계약 또는 청약철회 등에 관한 기록', '5년', '전자상거래 등에서의 소비자보호에 관한 법률'],
            ['대금결제 및 재화 등의 공급에 관한 기록', '5년', '전자상거래 등에서의 소비자보호에 관한 법률'],
            ['소비자의 불만 또는 분쟁처리에 관한 기록', '3년', '전자상거래 등에서의 소비자보호에 관한 법률'],
            ['서비스 부정이용 방지를 위한 접속 기록', '3개월', '통신비밀보호법'],
          ]}
        />
      </LegalSection>

      <LegalSection title="5. 유의사항">
        <LegalList
          items={[
            '계정 삭제는 되돌릴 수 없으며, 삭제 후에는 열람권 잔여 수량, 등록된 프로필·지점 정보 등을 복구할 수 없습니다.',
            'GA·지점 관리자(파트너) 계정을 삭제하는 경우, 소속 지점의 공개 정보는 계속 노출될 수 있습니다 — 지점 정보 자체를 함께 비공개 처리하려면 요청 시 함께 말씀해 주세요.',
            '진행 중인 결제·정산 건이 있는 경우, 관련 처리가 완료된 이후 삭제가 진행될 수 있습니다.',
          ]}
        />
      </LegalSection>
    </LegalPageLayout>
  );
}
