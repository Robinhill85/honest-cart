/** Client prices are never applied. A present price must still be a sane number. */
export function invalidPriceField(value: unknown): boolean {
  if (value === undefined) return false;
  return typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 100_000;
}

/** Quantity is not used to price a deal. Reject values outside 1..10. */
export function invalidQuantity(value: unknown): boolean {
  if (value === undefined) return false;
  return typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 10;
}
