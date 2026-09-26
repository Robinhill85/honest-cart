'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AskScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('Noise-cancelling headphones under £300, mainly for flights');
  const [researching, setResearching] = useState(false);
  const [researchStage, setResearchStage] = useState<'search' | 'reviews' | 'done'>('search');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviewTags, setReviewTags] = useState<string[]>([]);
  const [searchCached, setSearchCached] = useState(true);

  const chips = ['flights', 'comfort', 'battery', 'budget'];

  const addChip = (chip: string) => {
    if (!query.toLowerCase().includes(chip)) {
      setQuery(prev => `${prev} ${chip}`);
    }
  };

  const startResearch = async () => {
    setResearching(true);
    setResearchStage('search');
    setSearchResults([]);
    setReviewCount(0);
    setReviewTags([]);

    // Phase 1: Search
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      setSearchCached(data.cached !== false);
      
      // Stream in search results
      for (let i = 0; i < data.searchResults.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 150));
        setSearchResults(prev => [...prev, data.searchResults[i]]);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      setResearchStage('reviews');

      // Phase 2: Reviews
      const tags = data.reviewTags || [];
      const totalReviews = data.reviewCount || 173;

      // Animate counter
      const counterDuration = 2000;
      const steps = 20;
      const increment = totalReviews / steps;
      
      for (let i = 0; i <= steps; i++) {
        await new Promise(resolve => setTimeout(resolve, counterDuration / steps));
        setReviewCount(Math.min(Math.round(increment * i), totalReviews));
      }

      // Stream in tags
      for (let i = 0; i < tags.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setReviewTags(prev => [...prev, tags[i]]);
      }

      await new Promise(resolve => setTimeout(resolve, 800));
      setResearchStage('done');

      // Transition to comparison
      await new Promise(resolve => setTimeout(resolve, 1000));
      router.push('/compare');
    } catch (error) {
      console.error('Research error:', error);
      // Silent fallback - still transition
      setTimeout(() => router.push('/compare'), 1000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      {!researching ? (
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-4">
              Honest Cart
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400">
              Trust-aware shopping powered by AI
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
            <label className="block text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4">
              What are you buying?
            </label>
            
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-4 py-3 text-lg border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="e.g., Wireless headphones for long flights under £300"
            />

            <div className="flex flex-wrap gap-2 mt-4 mb-6">
              {chips.map(chip => (
                <button
                  key={chip}
                  onClick={() => addChip(chip)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full transition-colors"
                >
                  + {chip}
                </button>
              ))}
            </div>

            <button
              onClick={startResearch}
              disabled={!query.trim()}
              className="w-full py-4 text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 rounded-xl transition-colors disabled:cursor-not-allowed"
            >
              Research & Compare
            </button>
          </div>

          <div className="mt-8 text-center">
            <a
              href="/catalog"
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 underline"
            >
              Browse catalog directly
            </a>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl w-full">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-6">
              Researching...
            </h2>

            {/* Search stage */}
            {researchStage === 'search' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-slate-700 dark:text-slate-300">
                    {searchCached ? 'Replaying a saved search sample...' : 'Searching the web...'}
                  </span>
                </div>
                {searchResults.map((result, i) => (
                  <div
                    key={i}
                    className="ml-9 text-sm text-slate-600 dark:text-slate-400 animate-fade-in"
                  >
                    {result}
                  </div>
                ))}
              </div>
            )}

            {/* Reviews stage */}
            {researchStage === 'reviews' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-slate-700 dark:text-slate-300">
                    Web search complete
                  </span>
                </div>

                <div className="ml-9 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-slate-700 dark:text-slate-300">
                      Replaying seeded review judgments...
                    </span>
                  </div>
                  
                  <div className="text-4xl font-bold text-slate-900 dark:text-slate-50">
                    {reviewCount}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {reviewTags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 animate-fade-in"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Done stage */}
            {researchStage === 'done' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-slate-700 dark:text-slate-300">
                    Analysis complete
                  </span>
                </div>
                <div className="ml-9 text-sm text-slate-600 dark:text-slate-400">
                  Preparing comparison board...
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
