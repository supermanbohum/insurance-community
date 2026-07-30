import { SITE_CONFIG } from '@/lib/config/site';
import { BrandMark } from '@/components/brand/BrandMark';

/**
 * 사이트 기본 OG/Twitter 카드 이미지(1200x630). satori(ImageResponse 엔진)는 한글
 * 글리프를 포함한 폰트를 별도로 로드하지 않으면 한글을 렌더링하지 못하므로(빈 박스로
 * 깨짐), 이미지 안에는 라틴 문자(영문 브랜드명)만 사용한다 - 실제 공유 카드에 보이는
 * "보험맵" 제목/설명 텍스트는 og:title/og:description 메타 태그가 그대로 담당한다.
 */
export function DefaultOgImage() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        background: 'linear-gradient(135deg, #152d70 0%, #0a1230 100%)',
        fontFamily: 'Roboto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div
          style={{
            display: 'flex',
            width: 84,
            height: 84,
            borderRadius: 20,
            background: 'rgba(255,255,255,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          <BrandMark width={48} height={48} />
        </div>
        <span style={{ fontSize: 80, fontWeight: 800, color: 'white', letterSpacing: -2 }}>{SITE_CONFIG.englishName}</span>
      </div>
      <span style={{ fontSize: 28, color: 'rgba(255,255,255,0.65)', fontWeight: 500, letterSpacing: 1 }}>
        Insurance Agency Directory, Korea
      </span>
    </div>
  );
}

/** 지점 상세 페이지 - 실제 대표사진 위에 브랜드 마크만 얹는다(지점명/GA명은 한글이라
 * 이미지 자체에는 넣지 않고, og:title/og:description으로만 노출). */
export function BranchOgImage({ photoUrl }: { photoUrl: string | null }) {
  if (!photoUrl) return <DefaultOgImage />;
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', fontFamily: 'Roboto' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoUrl} width={1200} height={630} style={{ objectFit: 'cover' }} alt="" />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(10,18,48,0) 45%, rgba(10,18,48,0.85) 100%)',
          display: 'flex',
        }}
      />
      <div style={{ position: 'absolute', left: 40, bottom: 36, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            display: 'flex',
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          <BrandMark width={24} height={24} />
        </div>
        <span style={{ fontSize: 30, fontWeight: 800, color: 'white' }}>{SITE_CONFIG.englishName}</span>
      </div>
    </div>
  );
}
