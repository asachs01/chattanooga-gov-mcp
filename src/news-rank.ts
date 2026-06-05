// ★ DESIGN DECISION (owner: you) ───────────────────────────────
// How should news results be ranked/filtered for a query? Current
// default is naive substring match. Consider: token overlap scoring,
// recency weighting, fuzzy match, or fetching full article text for
// better relevance. Tradeoff: simplicity/speed vs result quality.
// ───────────────────────────────────────────────────────────────

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  summary: string;
}

/**
 * Ranks and filters news items based on a query string.
 * Current implementation: case-insensitive substring match on title and summary,
 * preserving original feed order for matched items.
 */
export function rankNewsItems(items: NewsItem[], query: string): NewsItem[] {
  if (!query.trim()) {
    return items;
  }

  const lowerQuery = query.toLowerCase();

  return items.filter(item => {
    const titleMatch = item.title.toLowerCase().includes(lowerQuery);
    const summaryMatch = item.summary.toLowerCase().includes(lowerQuery);
    return titleMatch || summaryMatch;
  });
}