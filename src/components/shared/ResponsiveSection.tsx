import type { Device, SectionConfig } from '@/lib/design/sections';
import { cn } from '@/lib/utils';

/**
 * 홈/지점상세 공개 페이지에서 디자인 편집모드의 저장된 설정(순서는 호출부의
 * 배열 정렬로 이미 반영됨, 여기서는 가시성+여백만)을 실제로 적용하는 래퍼.
 * Tailwind JIT는 런타임 임의값을 클래스로 만들 수 없으므로 여백은 섹션별
 * scoped <style> 미디어쿼리로 적용한다.
 */
export function ResponsiveSection({
  sectionKey,
  config,
  children,
}: {
  sectionKey: string;
  config: Record<Device, SectionConfig | undefined>;
  children: React.ReactNode;
}) {
  const { mobile, tablet, desktop } = config;

  if (!mobile?.visible && !tablet?.visible && !desktop?.visible) {
    return null;
  }

  const visibilityClass = cn(
    mobile?.visible ? 'block' : 'hidden',
    tablet?.visible ? 'md:block' : 'md:hidden',
    desktop?.visible ? 'lg:block' : 'lg:hidden'
  );

  const id = `section-${sectionKey}`;
  const mobileTop = mobile?.marginTop ?? 0;
  const mobileBottom = mobile?.marginBottom ?? 0;
  const tabletTop = tablet?.marginTop ?? mobileTop;
  const tabletBottom = tablet?.marginBottom ?? mobileBottom;
  const desktopTop = desktop?.marginTop ?? tabletTop;
  const desktopBottom = desktop?.marginBottom ?? tabletBottom;

  // 순서는 DOM을 재배치하지 않고 flex order로만 기기별로 다르게 적용한다 -
  // 기기마다 순서가 달라도 서버는 하나의 DOM만 렌더하면 된다.
  const mobileOrder = mobile?.order ?? 0;
  const tabletOrder = tablet?.order ?? mobileOrder;
  const desktopOrder = desktop?.order ?? tabletOrder;

  return (
    <>
      <style>{`
#${id} { margin-top: ${mobileTop}px; margin-bottom: ${mobileBottom}px; order: ${mobileOrder}; }
@media (min-width: 768px) { #${id} { margin-top: ${tabletTop}px; margin-bottom: ${tabletBottom}px; order: ${tabletOrder}; } }
@media (min-width: 1024px) { #${id} { margin-top: ${desktopTop}px; margin-bottom: ${desktopBottom}px; order: ${desktopOrder}; } }
      `}</style>
      <div id={id} className={visibilityClass}>
        {children}
      </div>
    </>
  );
}
