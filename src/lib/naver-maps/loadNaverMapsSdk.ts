'use client';

const SDK_SCRIPT_ID = 'naver-maps-sdk';
const CLUSTER_SCRIPT_ID = 'naver-maps-marker-clustering';

let loadPromise: Promise<void> | null = null;

function loadScript(id: string, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error(`${id} 로드 실패`)));
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`${id} 로드 실패`));
    document.head.appendChild(script);
  });
}

/**
 * 네이버 지도 SDK + 클러스터링 스크립트를 순서대로, 페이지 전체에서 한 번만 로드한다.
 * `/map` 페이지와 지점상세 미니맵이 각각 독립적으로 마운트돼도 중복 삽입되지 않도록
 * 모듈 스코프에 로딩 프로미스를 캐싱한다. 클라이언트 ID가 없으면 즉시 실패시켜
 * 호출부가 "지도를 사용할 수 없습니다" 같은 안내로 대신 폴백할 수 있게 한다.
 */
export function loadNaverMapsSdk(): Promise<void> {
  if (loadPromise) return loadPromise;

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
  if (!clientId) {
    return Promise.reject(new Error('NEXT_PUBLIC_NAVER_MAP_CLIENT_ID가 설정되어 있지 않습니다.'));
  }

  loadPromise = loadScript(SDK_SCRIPT_ID, `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`)
    .then(() => loadScript(CLUSTER_SCRIPT_ID, '/vendor/naver-marker-clustering.js'))
    .catch((err) => {
      loadPromise = null; // 실패하면 다음 시도 때 다시 로드할 수 있게 캐시를 비운다.
      throw err;
    });

  return loadPromise;
}
