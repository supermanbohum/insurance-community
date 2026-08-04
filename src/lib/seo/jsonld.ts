import { SITE_URL } from '@/lib/seo/config';
import { SITE_CONFIG } from '@/lib/config/site';

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: SITE_URL,
    name: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_CONFIG.name,
    url: SITE_URL,
    // /icon은 src/app/icon.tsx가 만드는 동적 PNG 파비콘 라우트다 - 정적 /icon.svg 파일은
    // 실제로 존재하지 않아 그 경로를 쓰면 이 URL이 항상 404난다.
    logo: `${SITE_URL}/icon`,
  };
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${SITE_URL}${item.href}` } : {}),
    })),
  };
}

/**
 * 지점 상세 페이지용 LocalBusiness(InsuranceAgency) 구조화 데이터.
 * InsuranceAgency는 schema.org에서 LocalBusiness/FinancialService를 확장하는 타입이라
 * 일반 LocalBusiness보다 검색엔진에 업종을 더 정확히 전달한다.
 */
export function localBusinessJsonLd(branch: {
  name: string;
  slug: string;
  address: string;
  sidoName: string | null;
  sigunguName: string | null;
  lat: number | null;
  lng: number | null;
  imageUrl: string | null;
  tagline: string | null;
  gaCompanyName: string;
  gaCompanyLogoUrl: string | null;
  phone?: string | null;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'InsuranceAgency'],
    name: branch.name,
    url: `${SITE_URL}/branch/${branch.slug}`,
    ...(branch.imageUrl ? { image: branch.imageUrl } : {}),
    ...(branch.tagline ? { description: branch.tagline } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: branch.address,
      addressRegion: branch.sidoName ?? undefined,
      addressLocality: branch.sigunguName ?? undefined,
      addressCountry: 'KR',
    },
    ...(branch.lat != null && branch.lng != null
      ? { geo: { '@type': 'GeoCoordinates', latitude: branch.lat, longitude: branch.lng } }
      : {}),
    ...(branch.phone ? { telephone: branch.phone } : {}),
    brand: {
      '@type': 'Organization',
      name: branch.gaCompanyName,
      ...(branch.gaCompanyLogoUrl ? { logo: branch.gaCompanyLogoUrl } : {}),
    },
  };
}

/** 커뮤니티 게시글 상세 페이지용 - 익명 게시판 특성상 DiscussionForumPosting이 Article보다 정확하다. */
export function discussionPostJsonLd(post: {
  id: string;
  title: string;
  content: string;
  authorDisplayName: string;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    headline: post.title,
    text: post.content,
    url: `${SITE_URL}/post/${post.id}`,
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    author: { '@type': 'Person', name: post.authorDisplayName },
  };
}

/**
 * 설계사 마켓 상세 페이지용 - 이름/연락처는 GA가 열람권을 써야만 보이는 비공개
 * 정보라 여기 절대 포함하지 않는다. 페이지에 이미 공개돼 있는 필드(활동지역/경력/
 * 전문분야)만 그대로 구조화 데이터로 옮긴다.
 */
export function plannerProfileJsonLd(planner: {
  id: string;
  activeRegionLabel: string | null;
  careerYears: number;
  specialties: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: `${SITE_URL}/planner-market/${planner.id}`,
    about: {
      '@type': 'Person',
      jobTitle: '보험설계사',
      ...(planner.activeRegionLabel ? { homeLocation: { '@type': 'Place', name: planner.activeRegionLabel } } : {}),
      ...(planner.specialties.length > 0 ? { knowsAbout: planner.specialties } : {}),
    },
  };
}
