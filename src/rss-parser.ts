import { XMLParser } from 'fast-xml-parser';
import { fetchText, FetchError } from './fetch-util.js';
import { NewsItem } from './news-rank.js';

/**
 * Parses RSS XML content and returns news items.
 */
export async function parseRssFeed(rssUrl: string): Promise<NewsItem[]> {
  try {
    const xmlText = await fetchText(rssUrl);

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseTagValue: false,
    });

    const parsed = parser.parse(xmlText);

    if (!parsed.rss || !parsed.rss.channel) {
      throw new FetchError(`Invalid RSS format from ${rssUrl}: missing rss.channel`);
    }

    const channel = parsed.rss.channel;
    let items = channel.item || [];

    // Ensure items is an array (single item becomes object in XML parser)
    if (!Array.isArray(items)) {
      items = [items];
    }

    return items.map((item: any): NewsItem => {
      const title = item.title || 'Untitled';
      const link = item.link || '';
      const pubDate = item.pubDate || '';
      const summary = item.description || '';

      return {
        title: typeof title === 'string' ? title.trim() : String(title).trim(),
        link: typeof link === 'string' ? link.trim() : String(link).trim(),
        pubDate: typeof pubDate === 'string' ? pubDate.trim() : String(pubDate).trim(),
        summary: typeof summary === 'string' ? summary.trim() : String(summary).trim(),
      };
    });
  } catch (error) {
    if (error instanceof FetchError) {
      throw error;
    }
    throw new FetchError(`Failed to parse RSS feed from ${rssUrl}`, error instanceof Error ? error : undefined);
  }
}