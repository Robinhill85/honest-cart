import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { approvalTokenMatches, hashApprovalToken, mintApprovalToken } from '../../lib/approval-token';
import { invalidPriceField, invalidQuantity } from '../../lib/request-guards';

describe('approval tokens', () => {
  test('mint an unguessable token and store only its sha256 hex hash', () => {
    const { token, token_hash } = mintApprovalToken();
    assert.match(token, /^[A-Za-z0-9_-]{43}$/);
    assert.match(token_hash, /^[0-9a-f]{64}$/);
    assert.equal(token_hash, hashApprovalToken(token));
    assert.notEqual(token_hash, token);
  });

  test('mint a different token each time', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => mintApprovalToken().token));
    assert.equal(tokens.size, 50);
  });

  test('accept the raw token that matches the stored hash', () => {
    const { token, token_hash } = mintApprovalToken();
    assert.equal(approvalTokenMatches(token_hash, token), true);
  });

  test('reject a different token, or the stored hash itself', () => {
    const { token_hash } = mintApprovalToken();
    assert.equal(approvalTokenMatches(token_hash, mintApprovalToken().token), false);
    assert.equal(approvalTokenMatches(token_hash, token_hash), false);
  });

  test('reject when no hash is stored', () => {
    const { token } = mintApprovalToken();
    assert.equal(approvalTokenMatches(null, token), false);
    assert.equal(approvalTokenMatches(undefined, token), false);
    assert.equal(approvalTokenMatches('', token), false);
  });

  test('reject missing, non-string, too short, or too long tokens', () => {
    const shortToken = 'a'.repeat(19);
    const longToken = 'a'.repeat(201);
    for (const presented of [undefined, null, 123, {}, [], '', shortToken, longToken]) {
      const stored = typeof presented === 'string' ? hashApprovalToken(presented) : mintApprovalToken().token_hash;
      assert.equal(approvalTokenMatches(stored, presented), false, `presented ${JSON.stringify(presented)}`);
    }
  });

  test('reject a malformed stored hash without throwing', () => {
    const { token } = mintApprovalToken();
    assert.equal(approvalTokenMatches('abc', token), false);
    assert.equal(approvalTokenMatches(hashApprovalToken(token).toUpperCase(), token), false);
  });
});

describe('invalidPriceField', () => {
  test('allows an absent price', () => {
    assert.equal(invalidPriceField(undefined), false);
  });

  test('allows sane positive prices', () => {
    for (const value of [0.01, 249.99, 100_000]) {
      assert.equal(invalidPriceField(value), false, `price ${value}`);
    }
  });

  test('rejects non-numbers, non-finite, non-positive, and huge prices', () => {
    for (const value of [null, '249.99', {}, Number.NaN, Number.POSITIVE_INFINITY, 0, -1, 100_000.01]) {
      assert.equal(invalidPriceField(value), true, `price ${String(value)}`);
    }
  });
});

describe('invalidQuantity', () => {
  test('allows an absent quantity and integers from 1 to 10', () => {
    assert.equal(invalidQuantity(undefined), false);
    for (let value = 1; value <= 10; value += 1) {
      assert.equal(invalidQuantity(value), false, `quantity ${value}`);
    }
  });

  test('rejects non-integers and values outside 1..10', () => {
    for (const value of [null, '3', 0, 11, -1, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.equal(invalidQuantity(value), true, `quantity ${String(value)}`);
    }
  });
});
