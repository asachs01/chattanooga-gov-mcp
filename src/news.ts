import { parseSitemap } from './sitemap-parser.js';

// chattanooga.gov's RSS feed (rss.xml) is actually an events/calendar feed.
// Real news articles live under this path in the sitemap.
const NEWS_PATH = '/stay-informed/latest-news/';

export interface NewsArticle {
  title: string;
  url: string;
  lastmod?: string;
}

/**
 * Derives a human-readable title from a news URL slug.
 * e.g. ".../city-council-passes-budget" -> "City Council Passes Budget".
 * For the exact published headline, fetch the page with get_page.
 */
function slugToTitle(url: string): string {
  try {
    const slug = new URL(url).pathname.split('/').filter(Boolean).pop() ?? '';
    return slug
      .split('-')
      .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ');
  } catch {
    return url;
  }
}

/**
 * Fetches city news articles from the sitemap's latest-news section,
 * newest first, optionally filtered by a query substring on title or URL.
 */
export async function fetchNewsArticles(
  sitemapUrl: string,
  query?: string,
  limit = 15
): Promise<NewsArticle[]> {
  const urls = await parseSitemap(sitemapUrl);

  let articles = urls
    .filter((u) => {
      try {
        return new URL(u.url).pathname.startsWith(NEWS_PATH);
      } catch {
        return false;
      }
    })
    .map((u): NewsArticle => ({
      title: slugToTitle(u.url),
      url: u.url,
      lastmod: u.lastmod,
    }));

  // Newest first when lastmod is present (ISO dates sort lexically).
  articles.sort((a, b) => (b.lastmod ?? '').localeCompare(a.lastmod ?? ''));

  if (query && query.trim()) {
    const q = query.toLowerCase();
    articles = articles.filter(
      (a) => a.title.toLowerCase().includes(q) || a.url.toLowerCase().includes(q)
    );
  }

  return articles.slice(0, limit);
}
