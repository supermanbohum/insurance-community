'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Video as VideoIcon, ImageOff, Play, Expand, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { BranchMediaItem } from '@/components/branch/types';

/**
 * 지점 사진 갤러리.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 2026-08-13 이전에 무엇이 잘못돼 있었나 (같은 실수를 되돌리지 않기 위해 남긴다)
 * ─────────────────────────────────────────────────────────────────────────────
 *  ⓐ 사무실 사진을 `office.slice(0, 3)`으로 잘랐다. 일품지점은 사무실 사진이 9장인데
 *     **6장이 화면에 도달조차 못 했다.** 지점장이 올린 사진이 조용히 사라지는 것이라
 *     지금은 **자르지 않고 전부 보여준다.**
 *  ⓑ 배지의 `1 / {total}`에서 「1」이 **하드코딩된 고정 텍스트**였다. state도 클릭
 *     핸들러도 없었으니 캐러셀인 척하는 라벨이었을 뿐이다. 지금 배지는 "몇 장인지 +
 *     여기를 누르면 크게 본다"를 말하는 **버튼**이고, 실제 n/total은 뷰어 안에서 움직인다.
 *  ⓒ 확대·줌이 아예 없었다. 사무실 사진은 분위기를 보려고 올리는 것이라 썸네일만으로는
 *     쓸모가 없다. 전체화면 뷰어 + 줌(핀치/더블탭/휠)을 넣었다.
 *
 * ⚠️ 동영상은 뷰어에 넣지 않는다. 뷰어는 이미지 확대·스와이프 전용이고, 동영상은
 * 외부 링크(유튜브 등)로 나가는 성격이라 같은 인터랙션에 묶으면 스와이프 도중
 * 페이지를 이탈시키게 된다.
 */
export function BranchGallery({ media }: { media: BranchMediaItem[] }) {
  const main = media.find((m) => m.type === 'image_main');
  const office = media.filter((m) => m.type === 'image_office');
  const video = media.find((m) => m.type === 'video');

  // 뷰어가 다루는 것은 **이미지뿐**이다. 대표사진이 맨 앞, 그 뒤로 사무실 사진 전부.
  // total도 여기서 나온다 - 예전처럼 `media.length`(동영상 포함)를 쓰면 뷰어에서
  // 도달할 수 없는 장수가 배지에 찍힌다.
  const photos = [...(main ? [main] : []), ...office];

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const open = useCallback((index: number) => setViewerIndex(index), []);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-surface-sunken sm:aspect-video">
        {main ? (
          <button
            type="button"
            onClick={() => open(0)}
            className="absolute inset-0 h-full w-full cursor-zoom-in"
            aria-label={`대표사진 크게 보기 (사진 ${photos.length}장)`}
          >
            {main.source === 'storage' ? (
              // Supabase Storage 호스팅 사진만 next/image로 최적화한다 - source가 external인
              // 경우 파트너가 임의 도메인 URL을 입력할 수 있어 next.config의 remotePatterns에
              // 없는 도메인이면 최적화 요청이 그대로 실패하므로 원본 <img>를 그대로 쓴다.
              <Image src={main.url} alt="대표사진" fill sizes="(min-width: 640px) 672px, 100vw" className="object-cover" priority />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={main.url} alt="대표사진" className="h-full w-full object-cover" />
            )}
          </button>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-ink-faint">
            <ImageOff className="h-8 w-8" strokeWidth={1.5} />
            <span className="text-sm">등록된 대표사진이 없습니다</span>
          </div>
        )}
        {main && photos.length > 1 && (
          // 배지는 이제 라벨이 아니라 **뷰어 입구**다. 돋보기 아이콘과 "전체보기"로
          // 누를 수 있다는 것을 드러낸다(예전에는 눌러도 아무 일이 없었다).
          <button
            type="button"
            onClick={() => open(0)}
            className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-ink/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur transition-colors hover:bg-ink/80"
          >
            <Expand className="h-3 w-3" />
            사진 {photos.length}장 전체보기
          </button>
        )}
      </div>

      {(office.length > 0 || video) && (
        <div className="grid grid-cols-4 gap-2">
          {/* 🔴 자르지 않는다. slice로 3장만 남기던 자리다. */}
          {office.map((item, i) => (
            <button
              type="button"
              key={item.id}
              onClick={() => open((main ? 1 : 0) + i)}
              className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-xl bg-surface-sunken"
              aria-label={`사무실사진 ${i + 1} 크게 보기`}
            >
              {item.source === 'storage' ? (
                // 🔴 raw <img>를 쓰면 안 되는 자리다(2026-08-14 실측). SSR에 나간 raw <img>는
                // **장당 <link rel="preload" href=원본> 이 자동으로 붙어서**(홈 1·포항 5·일품 9로
                // img 수와 정확히 일치 확인) 5712px 원본 ~1.3MB × 9장이 첫 로드에 전부 내려갔다.
                // 88px 칸에 그리면서다. next/image는 priority가 없으면 preload도 없고 lazy가
                // 기본이라, 이 전환이 「썸네일 축소 + 원본 preload 제거」를 동시에 잡는다.
                //
                // 🔴 `fill`이 아니라 **고정 width/height**다(2026-08-14 라이브 실측 후 교체).
                // fill + sizes로 하면 srcset이 deviceSizes 전체(256w~3840w)가 되는데,
                // lazy 이미지의 하이드레이션 타이밍에서 브라우저가 sizes 적용 전에 후보를
                // 골라 **1920px 화면에서 9장 전부 w=3840을 내려받는 것**을 확인했다(같은
                // srcset을 새 Image()로 주면 256을 고른다 - DOM 하이드레이션 경로만 어긋난다).
                // 고정 width면 srcset이 320/640 두 개뿐이라 **최악의 선택도 640이 상한**이다.
                <Image
                  src={item.url}
                  alt={`사무실사진 ${i + 1}`}
                  width={320}
                  height={320}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              ) : (
                // external은 remotePatterns에 없는 도메인이면 최적화 요청이 실패하므로 원본을 쓴다.
                // lazy를 명시해 화면 밖 썸네일이 첫 로드에 끼어들지 않게 한다.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.url}
                  alt={`사무실사진 ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              )}
            </button>
          ))}
          {video &&
            // 🔴 storage 동영상은 링크가 아니라 **오버레이 재생**이다. 예전에는 storage면
            // href가 undefined인 <a>라서 재생 아이콘이 떠 있는데 **눌러도 무반응**이었다
            // (맵그룹 3본부 - 운영에 storage 동영상이 실제로 1건 있다). external(유튜브 등)은
            // 우리가 플레이어를 제어할 수 없으니 기존대로 새 탭으로 나간다.
            (video.source === 'storage' ? (
              <button
                type="button"
                onClick={() => setVideoOpen(true)}
                aria-label="지점 동영상 재생"
                className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-ink text-white"
              >
                {/* preload=none: 썸네일 단계에서 동영상 데이터를 미리 내리지 않는다 -
                    첫 로드 전송량을 지키는 것이 이 파일의 핵심 수리였다(위 preload 참사 참고). */}
                <video src={video.url} className="absolute inset-0 h-full w-full object-cover opacity-50" muted preload="none" />
                <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur transition-transform group-hover:scale-110">
                  <Play className="h-4 w-4 fill-white" strokeWidth={0} />
                </span>
                <VideoIcon className="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 text-white/80" />
              </button>
            ) : (
              <a
                href={video.url}
                target="_blank"
                rel="noreferrer"
                className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-ink text-white"
              >
                <span className="absolute inset-0 bg-gradient-to-br from-ink to-ink/70" />
                <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur transition-transform group-hover:scale-110">
                  <Play className="h-4 w-4 fill-white" strokeWidth={0} />
                </span>
                <VideoIcon className="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 text-white/80" />
              </a>
            ))}
        </div>
      )}

      {viewerIndex !== null && photos.length > 0 && (
        <PhotoViewer photos={photos} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
      )}

      {videoOpen && video && <VideoOverlay url={video.url} onClose={() => setVideoOpen(false)} />}
    </div>
  );
}

/**
 * storage 동영상 전용 전체화면 재생 오버레이.
 * 사진 뷰어에 편입하지 않은 이유: 뷰어의 스와이프/줌 제스처가 <video controls>의
 * 시크바·볼륨 조작과 충돌한다(가로 드래그가 시크인지 다음 사진인지 구분 불가).
 * 동영상은 소리·재생 위치가 있는 매체라 사진과 같은 인터랙션에 묶지 않는다.
 */
function VideoOverlay({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="지점 동영상 재생"
    >
      <div className="flex items-center justify-end px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-6">
        {/* autoPlay: 사용자가 재생 버튼을 눌러 연 화면이라 자동재생이 기대 동작이다.
            playsInline: iOS가 자체 전체화면으로 뺏어가지 않게 한다. */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video src={url} controls autoPlay playsInline className="max-h-full max-w-full rounded-lg" />
      </div>
    </div>
  );
}

const MAX_SCALE = 4;
/** 스와이프로 인정할 최소 가로 이동(px). 세로 스크롤 의도와 구분하려고 세로 이동도 함께 본다. */
const SWIPE_THRESHOLD = 45;

function PhotoViewer({
  photos,
  startIndex,
  onClose,
}: {
  photos: BranchMediaItem[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // 제스처 계산용 값은 렌더링에 쓰이지 않으므로 ref에 둔다(터치 한 번마다 리렌더 방지).
  const gesture = useRef({
    startX: 0,
    startY: 0,
    pinchStartDist: 0,
    pinchStartScale: 1,
    panStart: { x: 0, y: 0 },
    lastTapAt: 0,
    moved: false,
  });

  const resetZoom = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const go = useCallback(
    (delta: number) => {
      setIndex((prev) => {
        const next = prev + delta;
        if (next < 0 || next > photos.length - 1) return prev;
        return next;
      });
      resetZoom();
    },
    [photos.length, resetZoom]
  );

  // 뷰어가 열린 동안 뒤 페이지가 스크롤되면 안 된다(모바일에서 특히 티가 난다).
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  function onTouchStart(e: React.TouchEvent) {
    const g = gesture.current;
    g.moved = false;
    if (e.touches.length === 2) {
      g.pinchStartDist = touchDistance(e.touches);
      g.pinchStartScale = scale;
      return;
    }
    g.startX = e.touches[0].clientX;
    g.startY = e.touches[0].clientY;
    g.panStart = { ...offset };
  }

  function onTouchMove(e: React.TouchEvent) {
    const g = gesture.current;
    if (e.touches.length === 2 && g.pinchStartDist > 0) {
      const next = clamp((touchDistance(e.touches) / g.pinchStartDist) * g.pinchStartScale, 1, MAX_SCALE);
      setScale(next);
      if (next === 1) setOffset({ x: 0, y: 0 });
      g.moved = true;
      return;
    }
    if (scale > 1) {
      // 확대 상태에서 한 손가락은 스와이프가 아니라 **패닝**이다. 확대해 놓고 옆으로
      // 끌었을 때 사진이 넘어가 버리면 확대한 의미가 없다.
      setOffset({
        x: g.panStart.x + (e.touches[0].clientX - g.startX),
        y: g.panStart.y + (e.touches[0].clientY - g.startY),
      });
      g.moved = true;
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    const g = gesture.current;
    if (g.pinchStartDist > 0 && e.touches.length === 0) {
      g.pinchStartDist = 0;
      return;
    }
    const touch = e.changedTouches[0];
    if (!touch) return;

    if (g.moved) return;

    // 스와이프는 **확대되지 않은 상태에서만** 본다(확대 중 한 손가락은 패닝이다).
    if (scale === 1) {
      const dx = touch.clientX - g.startX;
      const dy = touch.clientY - g.startY;
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        go(dx < 0 ? 1 : -1);
        return;
      }
    }

    // 더블탭 = 줌 토글. 확대 상태에서도 받아야 **되돌릴 수단**이 생긴다
    // (확대해 놓고 원래대로 돌아갈 방법이 없으면 닫았다 다시 여는 수밖에 없다).
    const now = Date.now();
    if (now - g.lastTapAt < 300) {
      if (scale > 1) resetZoom();
      else setScale(2);
      g.lastTapAt = 0;
      return;
    }
    g.lastTapAt = now;
  }

  function onWheel(e: React.WheelEvent) {
    // 데스크톱 줌. preventDefault를 부르지 않는다 - React의 wheel 리스너는 passive라
    // 경고만 나고 막히지 않는다. 대신 아래 컨테이너에 overscroll-none을 줬다.
    const next = clamp(scale - e.deltaY * 0.005, 1, MAX_SCALE);
    setScale(next);
    if (next === 1) setOffset({ x: 0, y: 0 });
  }

  const photo = photos[index];
  // 대표사진이 없는 지점도 있으므로 index로 번호를 매기지 않는다(그 경우 "사무실사진 0"이 나온다).
  const photoLabel =
    photo.type === 'image_main'
      ? '대표사진'
      : `사무실사진 ${photos.filter((p) => p.type === 'image_office').indexOf(photo) + 1}`;

  return (
    <div
      className="fixed inset-0 z-[100] flex touch-none select-none flex-col overscroll-none bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="지점 사진 크게 보기"
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        {/* 🔴 진짜 n/total이다. 예전 화면의 「1」은 고정 텍스트였다. */}
        <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold tabular-nums">
          {index + 1} / {photos.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/*
        🔴 `min-h-0`이 없으면 이 뷰어는 통째로 무너진다 (2026-08-14 CTO 라이브 실측: 화면
        954×918인데 화살표가 y=1652 - 아래로 734px 밖). flex 자식의 min-height 기본값은
        auto(=콘텐츠 크기)라, 원본 사진의 자연 높이가 flex-1을 뷰포트 밖까지 밀어냈고
        이미지의 max-h-full도 그 부풀어난 높이 기준이 되어 화면을 꽉 채웠다.
        min-h-0을 주면 flex가 남은 공간으로 확정 높이를 주고, 그 높이 기준으로
        max-h가 동작한다. 화살표는 정적 흐름 위치에 기대지 않고 top-1/2로 세로 중앙에 박는다.
        패딩(p-3/sm:p-6)은 「기본 배율에서 이미지가 화면을 꽉 채우지 않을 것」 조건이다.
      */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-6"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onWheel={onWheel}
        onDoubleClick={() => (scale > 1 ? resetZoom() : setScale(2))}
      >
        <div
          key={photo.id}
          className="relative h-full w-full transition-transform duration-100"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
        >
          {photo.source === 'storage' ? (
            // 원본(~1.3MB, 5712px)을 그대로 내리지 않는다 - 뷰어도 next/image를 거쳐
            // 화면 폭 기준으로 받는다. MAX_SCALE(4배) 줌 극단에서는 원본보다 소프트해질 수
            // 있는데, 사진마다 1MB+를 내리는 비용보다 그 트레이드오프가 낫다고 판단했다.
            <Image
              src={photo.url}
              alt={photoLabel}
              fill
              sizes="100vw"
              className="object-contain"
              draggable={false}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.url}
              alt={photoLabel}
              className="absolute inset-0 h-full w-full object-contain"
              draggable={false}
            />
          )}
        </div>

        {index > 0 && (
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30"
            aria-label="이전 사진"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {index < photos.length - 1 && (
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30"
            aria-label="다음 사진"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      <p className="pb-5 pt-2 text-center text-[11px] text-white/50">
        좌우로 밀거나 화살표로 이동 · 두 손가락/더블탭으로 확대
      </p>
    </div>
  );
}

function touchDistance(touches: React.TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
