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
    logo: `${SITE_URL}/icon.svg`,
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
