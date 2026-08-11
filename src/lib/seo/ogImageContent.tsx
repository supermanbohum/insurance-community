import { SITE_CONFIG } from '@/lib/config/site';
import {
  OG_BRAND_DATA_URI,
  OG_BRAND_SIZE,
  OG_TEXT_DATA_URI,
  OG_TEXT_SIZE,
} from '@/lib/seo/ogAssets';
import { BrandMark } from '@/components/brand/BrandMark';

/**
 * 사이트 기본 OG/Twitter 카드 이미지(1200x630). SPEC-039 A2안.
 *
 * 🔴 문구를 텍스트가 아니라 PNG로 얹는다. satori는 한글 글리프가 든 폰트를 따로
 * 로드해야 한글을 그리는데, 문구가 고정이면 폰트를 넣는 것보다 미리 렌더한 이미지를
 * 얹는 게 낫다 - subset 생성·woff2 호환·엣지 번들 크기 문제가 전부 없어진다.
 * 대신 문구를 바꾸려면 디자인이 PNG를 다시 만들어야 한다.
 *
 * 🔴 ogFonts.ts의 Roboto를 지우지 말 것. 이 이미지에 글자가 한 자도 없어졌지만
 * ImageResponse에 fonts를 안 넘기면 Windows 빌드가 깨진다(#77164). 폰트는 표시용이
 * 아니라 그 버그의 우회 수단이다.
 *
 * 🔴 두 이미지 모두 1:1로 넣는다. 2x를 50%로 줄이면 보조 문구가 리샘플링으로
 * 뭉개진다(디자인 실측). width/height를 자산 원본 크기 그대로 쓰고, 퍼센트나
 * 자동 크기로 바꾸지 말 것 - 바꿔놓으면 뭉개진 결과를 아무도 다시 안 본다.
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
        gap: 44,
        background: 'linear-gradient(135deg, #152d70 0%, #0a1230 100%)',
        fontFamily: 'Roboto',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={OG_BRAND_DATA_URI}
        width={OG_BRAND_SIZE.width}
        height={OG_BRAND_SIZE.height}
        alt=""
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={OG_TEXT_DATA_URI}
        width={OG_TEXT_SIZE.width}
        height={OG_TEXT_SIZE.height}
        alt=""
      />
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
