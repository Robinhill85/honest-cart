import { TypeSafeClient, choice, score, noul } from '@typesafe-ai/sdk';

const TYPESAFE_API_KEY = process.env.TYPESAFE_API_KEY || '';

const client = TYPESAFE_API_KEY ? new TypeSafeClient({ apiKey: TYPESAFE_API_KEY }) : null;

export { choice, score, noul };

export interface JudgmentResult {
  answer: any;
  confidence: number;
  from_cache: boolean;
}

export async function judgeWithJev(
  state: any,
  questions: any
): Promise<{ answers: Record<string, JudgmentResult>; from_cache: boolean }> {
  if (!client) {
    console.warn('⚠️  TypeSafe API key not configured, returning cached fallback');
    return getFallbackJudgment(questions);
  }

  try {
    const response = await client.systemOne({
      state,
      questions,
    });

    return {
      answers: Object.entries(response.answers).reduce((acc, [key, answer]: [string, any]) => {
        acc[key] = {
          answer,
          confidence: answer.confidence || 0,
          from_cache: false,
        };
        return acc;
      }, {} as Record<string, JudgmentResult>),
      from_cache: false,
    };
  } catch (error) {
    console.error('TypeSafe Jev error:', error);
    return getFallbackJudgment(questions);
  }
}

function getFallbackJudgment(questions: any): {
  answers: Record<string, JudgmentResult>;
  from_cache: boolean;
} {
  const answers: Record<string, JudgmentResult> = {};
  
  for (const [key] of Object.entries(questions)) {
    answers[key] = {
      answer: { note: 'Offline mode - TypeSafe not available' },
      confidence: 0,
      from_cache: true,
    };
  }

  return { answers, from_cache: true };
}
