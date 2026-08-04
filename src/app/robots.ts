import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/admin/*',
        '/partner',
        '/partner/*',
        '/api/*',
        '/auth/*',
        '/login',
        '/my',
        '/my/*',
        '/write',
        '/post/*/edit',
        '/planner-market/register',
        '/planner-market/edit',
        '/planner-market/my',
        '/planner-market/purchase',
        '/planner-market/history',
        '/planner-market/notifications',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
