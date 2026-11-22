/**
 * Pure deterministic math utilities for DeepTier's simulation engine.
 * Zero randomness from Math.random(); every run is reproducible.
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function roundTo(value: number, decimals = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Deterministic 32-bit hash for string seeds.
 */
export function hashString(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Deterministic Mulberry32 PRNG returning [0, 1).
 */
export function createSeededRng(seedKey: string): () => number {
  let state = hashString(seedKey) || 1;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Haversine great-circle distance in kilometers.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return roundTo(R * c, 1);
}

/**
 * Proximity score [0.05, 1.0] expressing how close trouble is to a supplier.
 */
export function computeProximityScore(distanceKm: number, regionMatched: boolean): number {
  if (regionMatched || distanceKm <= 25) {
    return 1.0;
  }
  return roundTo(clamp(Math.exp(-distanceKm / 190), 0.05, 1.0), 3);
}

/**
 * Format Indian Rupee values cleanly (e.g. ₹12,500 or ₹1.45L).
 */
export function formatInr(amount: number): string {
  const rounded = Math.round(Math.max(0, amount));
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rounded);
}
