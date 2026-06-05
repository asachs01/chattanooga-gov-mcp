# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- `search_news` now sources real news articles from the sitemap's
  `/stay-informed/latest-news/` section (newest first) instead of the RSS feed.
  The RSS feed (`rss.xml`) is actually the city's events/calendar feed, so it
  returned no news.

### Added
- `search_events` tool exposing the RSS events/calendar feed (the previous
  `search_news` behavior, correctly renamed).

## [0.1.0] - 2026-06-05

### Added
- Initial release of Chattanooga Government MCP server
- `search_news` tool for RSS feed parsing and news search
- `list_pages` tool for sitemap exploration with filtering
- `get_page` tool for web scraping with Firecrawl/fetch fallback
- TypeScript implementation with strict type safety
- Comprehensive error handling with explicit failure reporting
- Support for both Firecrawl API and plain fetch scraping
- Sitemap parser supporting both index and direct URL formats
- News ranking system with configurable query matching
- MIT licensed open source release

### Technical
- Built with @modelcontextprotocol/sdk for stdio transport
- Uses fast-xml-parser for RSS and sitemap processing
- Turndown library for HTML to markdown conversion
- Zod for runtime type validation
- Timeout-enabled HTTP client with clear error reporting