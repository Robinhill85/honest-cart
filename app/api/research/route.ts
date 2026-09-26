import { NextRequest, NextResponse } from 'next/server';
import { searchWeb } from '@/lib/search';
import fs from 'fs';
import path from 'path';

export const maxDuration = 60;

const SAVED_SEARCH = [
  'Saved sample: What Hi-Fi? — Sony WH-1000XM6 review (whathifi.com)',
  'Saved sample: TechRadar — Best noise-cancelling headphones (techradar.com)',
  'Saved sample: SoundGuys — Sony WH-1000XM6 review (soundguys.com)',
  'Saved sample: Expert Reviews — Headphones under £300 (expertreviews.co.uk)',
  'Saved sample: Trusted Reviews — Bose QuietComfort Ultra (trustedreviews.com)',
];

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    let searchResults: string[] = [];
    let cached = true;

    try {
      const searchPromise = searchWeb(query, { maxResults: 5 });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 3000)
      );

      const response = await Promise.race([searchPromise, timeoutPromise]);
      cached = response.from_cache;
      searchResults = cached
        ? SAVED_SEARCH
        : response.results.map(r => `${r.title} (${new URL(r.url).hostname})`);
    } catch {
      cached = true;
      searchResults = SAVED_SEARCH;
    }

    // Load review judgments for tags
    const judgmentsPath = path.join(process.cwd(), 'data', 'judgments_9e10.json');
    const judgmentsData = JSON.parse(fs.readFileSync(judgmentsPath, 'utf-8'));
    
    // Extract unique tags
    const tagCounts: Record<string, number> = {};
    for (const judgment of judgmentsData.judgments) {
      const tag = judgment.reason_tag;
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }

    // Get top tags
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => {
        // Apply display rules
        if (tag === 'looks paid for') {
          return `Incentivised (${count})`;
        }
        return `${tag} (${count})`;
      });

    return NextResponse.json({
      searchResults,
      reviewCount: judgmentsData.judgments.length,
      reviewTags: topTags,
      cached,
    });
  } catch (error) {
    console.error('Research API error:', error);
    return NextResponse.json(
      { error: 'Research failed' },
      { status: 500 }
    );
  }
}
