import type { ChatMessage } from './deals';
import { DEMO_SELLER_LABEL, groupPriceForCount } from './policy';

export function formatGbp(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

export function asChatLog(value: unknown): ChatMessage[] {
  let raw = value;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is ChatMessage =>
      Boolean(item) &&
      typeof item === 'object' &&
      typeof (item as ChatMessage).content === 'string' &&
      typeof (item as ChatMessage).role === 'string'
  );
}

/** The solo price the seller agreed before any group tier. */
export function agreedPriceFromChat(messages: unknown, fallback: number): number {
  const agreed = asChatLog(messages).find(
    (message) => message.role === 'system' && message.content.includes('Deal agreed at £')
  );
  const match = agreed?.content.match(/£([\d.]+)/);
  const parsed = match ? Number(match[1]) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Unit price for one buyer at this group size.
 * The ladder is applied to the original matched price, not a stale approval row.
 */
export function chargeableUnitPrice(
  memberCount: number,
  messages: unknown,
  matchedPrice: number | null | undefined
): number {
  const fallback = Number(matchedPrice);
  const solo = agreedPriceFromChat(messages, Number.isFinite(fallback) ? fallback : 0);
  return groupPriceForCount(Math.max(1, memberCount), solo);
}

export function groupPricePhrase(unitPrice: number, groupSize: number): string {
  const buyers = Math.max(1, groupSize);
  return `${formatGbp(unitPrice)} each, group of ${buyers}, your unit`;
}

export function formatLondonTimestamp(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

const ROLE_LABEL: Record<string, string> = {
  buyer: 'Buyer Bot',
  seller: DEMO_SELLER_LABEL,
  system: 'System',
  status: 'Group',
};

export interface DealEvent {
  at: string;
  label: string;
  role: string;
  action: string;
}

export function dealEvents(input: {
  chatLog: unknown;
  approvedAt?: string | null;
  paidAt?: string | null;
  paidAmount?: number | null;
}): DealEvent[] {
  const events: DealEvent[] = [];

  for (const message of asChatLog(input.chatLog)) {
    const action = message.content.trim();
    if (!action) continue;
    events.push({
      at: message.timestamp || '',
      label: formatLondonTimestamp(message.timestamp),
      role: ROLE_LABEL[message.role] || message.role,
      action,
    });
  }

  if (input.approvedAt) {
    events.push({
      at: input.approvedAt,
      label: formatLondonTimestamp(input.approvedAt),
      role: 'You',
      action: 'Approved the purchase on your phone',
    });
  }

  if (input.paidAt) {
    const already = events.some((event) => event.action.startsWith('Stripe test payment confirmed'));
    if (!already) {
      const amount =
        input.paidAmount != null && Number.isFinite(input.paidAmount)
          ? ` for ${formatGbp(input.paidAmount)}`
          : '';
      events.push({
        at: input.paidAt,
        label: formatLondonTimestamp(input.paidAt),
        role: 'System',
        action: `Stripe test payment confirmed${amount}`,
      });
    }
  }

  return events.sort((a, b) => {
    const left = Date.parse(a.at);
    const right = Date.parse(b.at);
    if (Number.isNaN(left) && Number.isNaN(right)) return 0;
    if (Number.isNaN(left)) return 1;
    if (Number.isNaN(right)) return -1;
    return left - right;
  });
}
