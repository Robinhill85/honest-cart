import { tavily } from '@tavily/core';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';

const client = TAVILY_API_KEY ? tavily({ apiKey: TAVILY_API_KEY }) : null;

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  from_cache: boolean;
}

export async function searchWeb(query: string, options?: {
  maxResults?: number;
  searchDepth?: 'basic' | 'advanced';
  includeDomains?: string[];
}): Promise<SearchResponse> {
  if (!client) {
    console.warn('⚠️  Tavily API key not configured, returning cached fallback');
    return getFallbackResults(query);
  }

  try {
    const response = await client.search(query, {
      maxResults: options?.maxResults || 5,
      searchDepth: options?.searchDepth || 'basic',
      includeDomains: options?.includeDomains,
    });

    return {
      results: response.results.map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
      })),
      query,
      from_cache: false,
    };
  } catch (error) {
    console.error('Tavily search error:', error);
    return getFallbackResults(query);
  }
}

function getFallbackResults(query: string): SearchResponse {
  return {
    results: [
      {
        title: 'Offline mode - using cached data',
        url: 'https://example.com',
        content: `Search for "${query}" is not available in offline mode. The app is using local data from /data directory.`,
        score: 1.0,
      },
    ],
    query,
    from_cache: true,
  };
}
