import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export function mintApprovalToken(): { token: string; token_hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, token_hash: hashApprovalToken(token) };
}

export function hashApprovalToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Compare a presented QR token with the stored sha256 hex digest. */
export function approvalTokenMatches(stored: string | null | undefined, presented: unknown): boolean {
  if (!stored || typeof presented !== 'string' || presented.length < 20 || presented.length > 200) {
    return false;
  }
  const actual = Buffer.from(hashApprovalToken(presented));
  const expected = Buffer.from(stored);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
