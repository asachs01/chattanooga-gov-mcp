import { XMLParser } from 'fast-xml-parser';
import { fetchText, FetchError } from './fetch-util.js';

export interface SitemapUrl {
  url: string;
  lastmod?: string;
  section: string;
}

/**
 * Extracts the section from a URL path (first path segment).
 */
function extractSection(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    return pathSegments[0] || 'root';
  } catch {
    return 'unknown';
  }
}

/**
 * Parses a sitemap XML and returns URL entries.
 */
async function parseSitemapXml(xmlText: string, baseUrl: string): Promise<SitemapUrl[]> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseTagValue: false,
  });

  const parsed = parser.parse(xmlText);

  // Check if this is a sitemap index
  if (parsed.sitemapindex) {
    const sitemapEntries = parsed.sitemapindex.sitemap || [];
    const sitemaps = Array.isArray(sitemapEntries) ? sitemapEntries : [sitemapEntries];

    const allUrls: SitemapUrl[] = [];

    // Fetch and parse each sub-sitemap
    for (const sitemap of sitemaps) {
      const sitemapUrl = sitemap.loc;
      if (sitemapUrl) {
        try {
          const subSitemapXml = await fetchText(sitemapUrl);
          const subUrls = await parseSitemapXml(subSitemapXml, baseUrl);
          allUrls.push(...subUrls);
        } catch (error) {
          console.warn(`Failed to fetch sub-sitemap ${sitemapUrl}:`, error);
        }
      }
    }

    return allUrls;
  }

  // Regular sitemap with URL entries
  if (parsed.urlset) {
    let urlEntries = parsed.urlset.url || [];
    if (!Array.isArray(urlEntries)) {
      urlEntries = [urlEntries];
    }

    return urlEntries.map((entry: any): SitemapUrl => {
      const url = entry.loc || '';
      const lastmod = entry.lastmod || '';
      const section = extractSection(url);

      return {
        url: typeof url === 'string' ? url.trim() : String(url).trim(),
        lastmod: lastmod ? (typeof lastmod === 'string' ? lastmod.trim() : String(lastmod).trim()) : undefined,
        section,
      };
    });
  }

  throw new FetchError(`Invalid sitemap format from ${baseUrl}: missing sitemapindex or urlset`);
}

/**
 * Fetches and parses a sitemap, handling both sitemap indexes and regular sitemaps.
 */
export async function parseSitemap(sitemapUrl: string): Promise<SitemapUrl[]> {
  try {
    const xmlText = await fetchText(sitemapUrl);
    return await parseSitemapXml(xmlText, sitemapUrl);
  } catch (error) {
    if (error instanceof FetchError) {
      throw error;
    }
    throw new FetchError(`Failed to parse sitemap from ${sitemapUrl}`, error instanceof Error ? error : undefined);
  }
}

/**
 * Filters sitemap URLs by section and/or query string.
 */
export function filterSitemapUrls(
  urls: SitemapUrl[],
  section?: string,
  query?: string,
  limit = 50
): SitemapUrl[] {
  let filtered = urls;

  if (section) {
    filtered = filtered.filter(url => url.section === section);
  }

  if (query) {
    const lowerQuery = query.toLowerCase();
    filtered = filtered.filter(url =>
      url.url.toLowerCase().includes(lowerQuery)
    );
  }

  return filtered.slice(0, limit);
}