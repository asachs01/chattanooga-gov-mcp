#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { parseRssFeed } from './rss-parser.js';
import { rankNewsItems, NewsItem } from './news-rank.js';
import { parseSitemap, filterSitemapUrls, SitemapUrl } from './sitemap-parser.js';
import { scrapePage, ScrapedPage } from './page-scraper.js';
import { FetchError } from './fetch-util.js';

const RSS_URL = 'https://chattanooga.gov/rss.xml';
const SITEMAP_URL = 'https://chattanooga.gov/sitemap.xml';

// Tool schemas
const SearchNewsSchema = z.object({
  query: z.string().optional(),
  limit: z.number().default(15),
});

const ListPagesSchema = z.object({
  section: z.string().optional(),
  query: z.string().optional(),
  limit: z.number().default(50),
});

const GetPageSchema = z.object({
  url: z.string(),
});

class ChattanoogaGovServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'chattanooga-gov-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_news',
            description: 'Search news and announcements from chattanooga.gov RSS feed',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Optional search query to filter news items',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results to return (default: 15)',
                  default: 15,
                },
              },
            },
          },
          {
            name: 'list_pages',
            description: 'List pages from chattanooga.gov sitemap with optional filtering',
            inputSchema: {
              type: 'object',
              properties: {
                section: {
                  type: 'string',
                  description: 'Filter by site section (e.g., "services", "government", "departments", "stay-informed")',
                },
                query: {
                  type: 'string',
                  description: 'Filter by substring match on URL',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results to return (default: 50)',
                  default: 50,
                },
              },
            },
          },
          {
            name: 'get_page',
            description: 'Scrape content from a specific chattanooga.gov page and convert to markdown',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'Full URL to scrape (must be on chattanooga.gov domain)',
                },
              },
              required: ['url'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'search_news':
            return await this.handleSearchNews(request.params.arguments);

          case 'list_pages':
            return await this.handleListPages(request.params.arguments);

          case 'get_page':
            return await this.handleGetPage(request.params.arguments);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }

        if (error instanceof FetchError) {
          throw new McpError(ErrorCode.InternalError, error.message);
        }

        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }

  private async handleSearchNews(args: any) {
    const { query, limit } = SearchNewsSchema.parse(args);

    try {
      const newsItems = await parseRssFeed(RSS_URL);
      const filteredItems = query
        ? rankNewsItems(newsItems, query).slice(0, limit)
        : newsItems.slice(0, limit);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query,
              count: filteredItems.length,
              items: filteredItems,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching news: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleListPages(args: any) {
    const { section, query, limit } = ListPagesSchema.parse(args);

    try {
      const allUrls = await parseSitemap(SITEMAP_URL);
      const filteredUrls = filterSitemapUrls(allUrls, section, query, limit);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              section,
              query,
              count: filteredUrls.length,
              total: allUrls.length,
              pages: filteredUrls,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching sitemap: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetPage(args: any) {
    const { url } = GetPageSchema.parse(args);

    try {
      const scrapedPage = await scrapePage(url);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              url: scrapedPage.url,
              title: scrapedPage.title,
              source: scrapedPage.source,
              markdown: scrapedPage.markdown,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error scraping page: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Chattanooga Government MCP server running on stdio');
  }
}

const server = new ChattanoogaGovServer();
server.run().catch((error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});