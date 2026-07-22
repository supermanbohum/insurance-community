import { Phone, MessageCircle, Globe, Camera, Clapperboard, BookOpen, Link as LinkIcon, type LucideIcon } from 'lucide-react';

export const CONTACT_TYPE_LABEL: Record<string, string> = {
  phone: '전화',
  phone_recruit: '채용문의 전화',
  kakao: '카카오톡',
  kakao_open_chat: '카카오 오픈채팅',
  homepage: '홈페이지',
  instagram: '인스타그램',
  youtube: '유튜브',
  blog: '블로그',
};

export const CONTACT_TYPE_ICON: Record<string, LucideIcon> = {
  phone: Phone,
  phone_recruit: Phone,
  kakao: MessageCircle,
  kakao_open_chat: MessageCircle,
  homepage: Globe,
  instagram: Camera,
  youtube: Clapperboard,
  blog: BookOpen,
};

export function contactTypeLabel(type: string): string {
  return CONTACT_TYPE_LABEL[type] ?? type;
}

export function contactTypeIcon(type: string): LucideIcon {
  return CONTACT_TYPE_ICON[type] ?? LinkIcon;
}

/** 연락처 값을 클릭 가능한 href로 변환한다 (전화=tel:, 그 외=URL 그대로/https 보정). */
export function contactHref(type: string, value: string): string {
  if (type === 'phone' || type === 'phone_recruit') {
    return `tel:${value.replace(/[^0-9+]/g, '')}`;
  }
  if (/^https?:\/\//.test(value)) {
    return value;
  }
  return `https://${value}`;
}
