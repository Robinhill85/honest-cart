import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { agreedPriceFromChat, chargeableUnitPrice } from '../../lib/charge';
import {
  CURRYS_POLICY,
  groupFloorLabel,
  groupLadder,
  groupPriceForCount,
  priceAtOrAboveFloor,
  tierFloor,
} from '../../lib/policy';

describe('groupPriceForCount', () => {
  test('uses the matched price for fewer than 3 buyers', () => {
    assert.equal(groupPriceForCount(0, 299), 299);
    assert.equal(groupPriceForCount(1, 299), 299);
    assert.equal(groupPriceForCount(2, 299), 299);
  });

  test('drops to the coded group floors at 3 and 5 buyers', () => {
    assert.equal(groupPriceForCount(3, 279.99), 264.99);
    assert.equal(groupPriceForCount(4, 279.99), 264.99);
    assert.equal(groupPriceForCount(5, 279.99), 249.99);
    assert.equal(groupPriceForCount(12, 279.99), 249.99);
  });

  test('never raises the price above the matched price', () => {
    assert.equal(groupPriceForCount(3, 250), 250);
    assert.equal(groupPriceForCount(5, 240), 240);
  });
});

describe('groupLadder', () => {
  test('lists the 1/3/5 tiers for the matched price', () => {
    assert.deepEqual(groupLadder(279.99), [
      { qty: 1, price: 279.99 },
      { qty: 3, price: 264.99 },
      { qty: 5, price: 249.99 },
    ]);
  });

  test('caps every tier at a matched price below the floors', () => {
    assert.deepEqual(groupLadder(200), [
      { qty: 1, price: 200 },
      { qty: 3, price: 200 },
      { qty: 5, price: 200 },
    ]);
  });
});

describe('tierFloor and groupFloorLabel', () => {
  test('pick the floor for the tier the group has reached', () => {
    const cases: Array<[number, number, '1' | '3' | '5']> = [
      [1, CURRYS_POLICY.floor_price, '1'],
      [2, CURRYS_POLICY.floor_price, '1'],
      [3, CURRYS_POLICY.group_floors.buyers_3, '3'],
      [4, CURRYS_POLICY.group_floors.buyers_3, '3'],
      [5, CURRYS_POLICY.group_floors.buyers_5, '5'],
      [9, CURRYS_POLICY.group_floors.buyers_5, '5'],
    ];
    for (const [members, floor, label] of cases) {
      assert.equal(tierFloor(members), floor, `floor for ${members}`);
      assert.equal(groupFloorLabel(members), label, `label for ${members}`);
    }
  });
});

describe('priceAtOrAboveFloor', () => {
  test('clamps prices below the tier floor up to the floor', () => {
    assert.equal(priceAtOrAboveFloor(1, 1), 279.99);
    assert.equal(priceAtOrAboveFloor(3, 200), 264.99);
    assert.equal(priceAtOrAboveFloor(5, 0), 249.99);
    assert.equal(priceAtOrAboveFloor(1, -50), 279.99);
  });

  test('keeps prices at or above the floor', () => {
    assert.equal(priceAtOrAboveFloor(1, 279.99), 279.99);
    assert.equal(priceAtOrAboveFloor(1, 349), 349);
  });

  test('falls back to the floor for non-finite prices', () => {
    assert.equal(priceAtOrAboveFloor(1, Number.NaN), 279.99);
    assert.equal(priceAtOrAboveFloor(3, Number.POSITIVE_INFINITY), 264.99);
    assert.equal(priceAtOrAboveFloor(5, Number.NEGATIVE_INFINITY), 249.99);
  });
});

describe('chargeableUnitPrice', () => {
  test('applies the group ladder to the matched price', () => {
    assert.equal(chargeableUnitPrice(1, [], 279.99), 279.99);
    assert.equal(chargeableUnitPrice(3, [], 279.99), 264.99);
    assert.equal(chargeableUnitPrice(5, [], 279.99), 249.99);
  });

  test('treats a group size below 1 as a single buyer', () => {
    assert.equal(chargeableUnitPrice(0, [], 279.99), 279.99);
    assert.equal(chargeableUnitPrice(-3, [], 279.99), 279.99);
  });

  test('ignores malformed chat logs', () => {
    assert.equal(chargeableUnitPrice(3, 'not json', 279.99), 264.99);
    assert.equal(chargeableUnitPrice(3, { role: 'system' }, 279.99), 264.99);
    assert.equal(chargeableUnitPrice(3, [null, 42, { role: 'system' }], 279.99), 264.99);
  });
});

describe('agreedPriceFromChat', () => {
  const agreedAt = (price: string) => [
    { role: 'buyer', content: `I'll accept £${price}.` },
    { role: 'system', content: `Deal agreed at £${price}. Creating approval request...` },
  ];

  test('reads the price from the negotiation system message', () => {
    assert.equal(agreedPriceFromChat(agreedAt('279.99'), 999), 279.99);
    assert.equal(agreedPriceFromChat(agreedAt('280'), 999), 280);
    assert.equal(agreedPriceFromChat(agreedAt('280.00'), 999), 280);
  });

  test('accepts the chat log as a JSON string', () => {
    assert.equal(agreedPriceFromChat(JSON.stringify(agreedAt('264.50')), 999), 264.5);
  });

  test('falls back when there is no agreed-price message', () => {
    assert.equal(agreedPriceFromChat([], 999), 999);
    assert.equal(agreedPriceFromChat([{ role: 'buyer', content: 'Deal agreed at £100.' }], 999), 999);
    assert.equal(agreedPriceFromChat([{ role: 'system', content: 'Deal agreed at £' }], 999), 999);
  });

  test('falls back instead of charging a partial price for malformed amounts', () => {
    assert.equal(agreedPriceFromChat(agreedAt('279..99'), 299), 299);
    assert.equal(agreedPriceFromChat(agreedAt('279.99.99'), 299), 299);
    assert.equal(agreedPriceFromChat(agreedAt('1.2.3'), 299), 299);
  });

  test('drives the group ladder in chargeableUnitPrice', () => {
    assert.equal(chargeableUnitPrice(1, agreedAt('299.00'), 349), 299);
    assert.equal(chargeableUnitPrice(3, agreedAt('299.00'), 349), 264.99);
    assert.equal(chargeableUnitPrice(3, agreedAt('250.00'), 349), 250);
  });
});
