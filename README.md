# Chattanooga Government MCP Server

A local **stdio** MCP server providing natural-language access to the City of Chattanooga's main website (**chattanooga.gov**). This is a **PROTOTYPE scraper**, not an API wrapper—the city's Drupal 10 site has no JSON API enabled.

## What it does

This server provides access to Chattanooga government information through three main tools:
- **News/announcements** via RSS feed parsing
- **Site navigation** via sitemap exploration  
- **Page content** via web scraping (Firecrawl or fallback fetch)

## Available Tools

### `search_news`
Search news and announcements from the official RSS feed.
- `query` (optional): Filter results by keyword
- `limit` (default: 15): Maximum results to return

### `list_pages` 
Browse all pages on the site with optional filtering.
- `section` (optional): Filter by site section like "services", "government", "departments"
- `query` (optional): Filter URLs by substring match
- `limit` (default: 50): Maximum results to return

### `get_page`
Scrape and convert any chattanooga.gov page to clean markdown.
- `url` (required): Full URL on chattanooga.gov domain

## Installation

```bash
npm install
npm run build
```

## Running

### Standalone
```bash
npm start
# or
node dist/index.js
```

### With Claude Desktop
Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "chattanooga-gov": {
      "command": "node",
      "args": ["/Users/asachs/Documents/projects/chattanooga-gov-mcp/dist/index.js"],
      "env": {
        "FIRECRAWL_API_KEY": "your-key-here-optional"
      }
    }
  }
}
```

### With Claude Code
Add to your project's `.claude/settings.json`:

```json
{
  "mcp": {
    "servers": {
      "chattanooga-gov": {
        "command": "node",
        "args": ["/Users/asachs/Documents/projects/chattanooga-gov-mcp/dist/index.js"],
        "env": {
          "FIRECRAWL_API_KEY": "your-key-here-optional"
        }
      }
    }
  }
}
```

## Configuration

### Environment Variables

- `FIRECRAWL_API_KEY` (optional): API key for enhanced page scraping via Firecrawl. If not provided, falls back to plain fetch + HTML→markdown conversion.

## Technical Details

### Data Sources
- **RSS Feed**: `https://chattanooga.gov/rss.xml` for news/announcements
- **Sitemap**: `https://chattanooga.gov/sitemap.xml` for comprehensive page discovery (handles both sitemap indexes and direct URL sets)
- **Page Scraping**: Direct HTTP requests with DOM cleaning and markdown conversion

### Scraping Strategy
1. **Primary**: Firecrawl API (if `FIRECRAWL_API_KEY` provided) for high-quality markdown conversion
2. **Fallback**: Plain `fetch` + `turndown` library with basic DOM cleaning (removes nav, scripts, styles)

### URL Structure
The site follows a path taxonomy:
- `/services/...` - City services
- `/government/...` - Government information
- `/departments/...` - Department pages
- `/stay-informed/...` - News and updates

## Future Improvements

If the City of Chattanooga enables Drupal's JSON:API module, this scraper could be upgraded to a proper CMS API wrapper with structured data access, better performance, and more reliable content extraction.

## Development

```bash
npm run dev    # Watch mode
npm run build  # Production build
```

## License

MIT License - Copyright (c) 2026 Aaron Sachs / Wyre Technology