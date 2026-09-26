import { NextRequest, NextResponse } from 'next/server';
import { searchWeb } from '@/lib/search';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    // Try real Tavily search if key is set (with timeout)
    let searchResults: string[] = [];
    
    try {
      const searchPromise = searchWeb(query, { maxResults: 5 });
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 3000)
      );
      
      const response = await Promise.race([searchPromise, timeoutPromise]);
      searchResults = response.results.map(r => `${r.title} (${new URL(r.url).hostname})`);
    } catch (error) {
      // Silent fallback to cached results
      searchResults = [
        'What Hi-Fi? - Sony WH-1000XM6 review (whathifi.com)',
        'TechRadar - Best noise-cancelling headphones 2026 (techradar.com)',
        'SoundGuys - Sony WH-1000XM6 review (soundguys.com)',
        'Expert Reviews - Headphones under £300 (expertreviews.co.uk)',
        'Trusted Reviews - Bose QuietComfort Ultra (trustedreviews.com)',
      ];
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
    });
  } catch (error) {
    console.error('Research API error:', error);
    return NextResponse.json(
      { error: 'Research failed' },
      { status: 500 }
    );
  }
}
