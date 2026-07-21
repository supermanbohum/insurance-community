const STORAGE_KEY = 'bohommap:recent-searches';
const MAX_ITEMS = 6;

export function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(keyword: string): string[] {
  if (typeof window === 'undefined') return [];
  const trimmed = keyword.trim();
  if (!trimmed) return getRecentSearches();

  const next = [trimmed, ...getRecentSearches().filter((k) => k !== trimmed)].slice(0, MAX_ITEMS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function removeRecentSearch(keyword: string): string[] {
  if (typeof window === 'undefined') return [];
  const next = getRecentSearches().filter((k) => k !== keyword);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
