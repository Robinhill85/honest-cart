import { ChatMessage, SellerPolicy } from './deals';
import { groupPriceForCount } from './policy';

export async function* negotiateDeal(
  productName: string,
  cheaperSeller: string,
  cheaperPrice: number,
  cheaperFlags: string[],
  trustedSeller: string,
  trustedPrice: number,
  sellerPolicy: SellerPolicy
): AsyncGenerator<ChatMessage> {
  // Buyer bot introduces the request
  yield {
    role: 'buyer',
    content: `I found ${productName} at ${cheaperSeller} for £${cheaperPrice}, but they have some trust concerns: ${cheaperFlags.join(', ')}. Can you match their price?`,
    timestamp: new Date().toISOString(),
  };

  await delay(1000);

  // Seller bot acknowledges
  yield {
    role: 'seller',
    content: `Thank you for reaching out. Let me review the competitor offer and our pricing policy.`,
    timestamp: new Date().toISOString(),
  };

  await delay(1500);

  // Seller bot evaluates
  const discount = trustedPrice - cheaperPrice;
  const discountPercent = (discount / trustedPrice) * 100;
  const floorPrice = sellerPolicy.floor_price;

  yield {
    role: 'seller',
    content: `Our current price is £${trustedPrice}. The competitor's price of £${cheaperPrice} represents a ${discountPercent.toFixed(1)}% discount. My floor price for this model is £${floorPrice}.`,
    timestamp: new Date().toISOString(),
  };

  await delay(1500);

  // Decision logic
  if (cheaperPrice < floorPrice) {
    yield {
      role: 'seller',
      content: `Unfortunately, £${cheaperPrice} is below my authorized floor price. However, I can offer £${floorPrice} - that's a £${(trustedPrice - floorPrice).toFixed(2)} saving and includes our 30-day returns, UK warranty, and genuine UK stock.`,
      timestamp: new Date().toISOString(),
    };

    await delay(1000);

    yield {
      role: 'buyer',
      content: `That's a great offer. The trust signals matter - genuine UK stock with proper warranty. I'll accept £${floorPrice}.`,
      timestamp: new Date().toISOString(),
    };

    await delay(800);

    yield {
      role: 'system',
      content: `Deal agreed at £${floorPrice}. Creating approval request...`,
      timestamp: new Date().toISOString(),
    };

    return { matched: true, price: floorPrice };
  } else if (discountPercent <= sellerPolicy.max_discount_percent) {
    yield {
      role: 'seller',
      content: `I can match £${cheaperPrice}. You'll get genuine UK stock with full warranty and our hassle-free 30-day returns. This offer is valid for individual purchase.`,
      timestamp: new Date().toISOString(),
    };

    await delay(1000);

    yield {
      role: 'buyer',
      content: `Perfect! That eliminates the grey import risk while matching the price. I accept.`,
      timestamp: new Date().toISOString(),
    };

    await delay(800);

    yield {
      role: 'system',
      content: `Deal agreed at £${cheaperPrice}. Creating approval request...`,
      timestamp: new Date().toISOString(),
    };

    return { matched: true, price: cheaperPrice };
  } else {
    const bestOffer = Math.max(floorPrice, trustedPrice * (1 - sellerPolicy.max_discount_percent / 100));
    
    yield {
      role: 'seller',
      content: `The requested discount exceeds my authorized limit of ${sellerPolicy.max_discount_percent}%. The best I can offer is £${bestOffer.toFixed(2)}.`,
      timestamp: new Date().toISOString(),
    };

    await delay(1000);

    yield {
      role: 'buyer',
      content: `I understand. The trust benefits are worth the difference. I'll proceed with £${bestOffer.toFixed(2)}.`,
      timestamp: new Date().toISOString(),
    };

    await delay(800);

    yield {
      role: 'system',
      content: `Deal agreed at £${bestOffer.toFixed(2)}. Creating approval request...`,
      timestamp: new Date().toISOString(),
    };

    return { matched: true, price: parseFloat(bestOffer.toFixed(2)) };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Phrases for a tier crossing. The price is the group ladder, not a model guess. */
export function groupTierExchange(
  memberCount: number,
  productName: string,
  matchedPrice: number
): { price: number; buyer: string; seller: string } {
  const price = groupPriceForCount(memberCount, matchedPrice);
  return {
    price,
    buyer: `We now have ${memberCount} buyers for the ${productName}. What's your group price?`,
    seller: `Group of ${memberCount} approved: £${price.toFixed(2)} each, within my floor for multi-unit orders. Each buyer still buys their own unit.`,
  };
}
