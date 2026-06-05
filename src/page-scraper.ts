import TurndownService from 'turndown';
import { fetchText, fetchJson, FetchError } from './fetch-util.js';

export interface ScrapedPage {
  url: string;
  title: string;
  markdown: string;
  source: 'firecrawl' | 'fetch';
}

/**
 * Validates that a URL is on the chattanooga.gov domain.
 */
function validateChattanoogaUrl(url: string): void {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname !== 'chattanooga.gov') {
      throw new Error(`Invalid URL: ${url} is not on chattanooga.gov domain`);
    }
  } catch (error) {
    throw new Error(`Invalid URL: ${url}`);
  }
}

/**
 * Scrapes a page using Firecrawl API.
 */
async function scrapeWithFirecrawl(url: string): Promise<ScrapedPage> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY environment variable not set');
  }

  try {
    const response = await fetchJson('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
      }),
    });

    if (!response.success) {
      throw new FetchError(`Firecrawl API error: ${response.error || 'Unknown error'}`);
    }

    const markdown = response.data?.markdown || '';
    const title = response.data?.metadata?.title || 'Untitled';

    return {
      url,
      title,
      markdown,
      source: 'firecrawl',
    };
  } catch (error) {
    if (error instanceof FetchError) {
      throw error;
    }
    throw new FetchError(`Firecrawl scraping failed for ${url}`, error instanceof Error ? error : undefined);
  }
}

/**
 * Scrapes a page using plain fetch and HTML to markdown conversion.
 */
async function scrapeWithFetch(url: string): Promise<ScrapedPage> {
  try {
    const html = await fetchText(url);

    // Create a basic DOM-like structure to extract title and clean content
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

    // Remove scripts, styles, navigation, header, footer
    const cleanedHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    // Convert to markdown
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '-',
    });

    // Remove empty links and clean up
    turndownService.addRule('removeEmptyLinks', {
      filter: (node) => node.nodeName === 'A' && !node.textContent?.trim(),
      replacement: () => '',
    });

    const markdown = turndownService.turndown(cleanedHtml);

    return {
      url,
      title,
      markdown,
      source: 'fetch',
    };
  } catch (error) {
    if (error instanceof FetchError) {
      throw error;
    }
    throw new FetchError(`Fetch scraping failed for ${url}`, error instanceof Error ? error : undefined);
  }
}

/**
 * Scrapes a page from chattanooga.gov using Firecrawl if available, falling back to fetch.
 */
export async function scrapePage(url: string): Promise<ScrapedPage> {
  validateChattanoogaUrl(url);

  // Try Firecrawl first if API key is available
  if (process.env.FIRECRAWL_API_KEY) {
    try {
      return await scrapeWithFirecrawl(url);
    } catch (error) {
      console.warn('Firecrawl failed, falling back to fetch:', error);
    }
  }

  // Fallback to plain fetch
  return await scrapeWithFetch(url);
}