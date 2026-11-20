/**
 * Solmarina: Neon Heat - Seeded Pseudo-Random Number Generator (SeederRNG)
 * Mulberry32-based PRNG ensuring deterministic world generation and simulation.
 *
 * The mixing step lives in a private static scrambler so the public methods
 * read as thin wrappers over one shared core; the produced sequence is
 * bit-for-bit identical to the original implementation.
 */

export class SeederRNG {
  constructor(seed = 1337) {
    this.seed = Math.floor(seed);
  }

  /**
   * One mulberry32 mixing step over the running state.
   * Advances nothing by itself; callers feed it the incremented seed.
   */
  static #scramble(t) {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates the next pseudo-random float between 0 (inclusive) and 1 (exclusive).
   */
  next() {
    this.seed += 0x6D2B79F5;
    return SeederRNG.#scramble(this.seed);
  }

  /**
   * Returns a random float between min (inclusive) and max (exclusive).
   */
  range(min, max) {
    return min + this.next() * (max - min);
  }

  /**
   * Returns a random integer between min and max (both inclusive).
   * floor(next() * span) + min === floor(min + next() * span) for integer
   * bounds, so this matches the original range-based formulation exactly.
   */
  int(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Picks a random element from an array.
   */
  pick(arr) {
    if (!arr || arr.length === 0) return undefined;
    return arr[Math.floor(this.next() * arr.length)];
  }

  /**
   * Returns true with the given probability (0 to 1).
   */
  chance(probability) {
    return this.next() < probability;
  }

  /**
   * Shuffles an array in place using Fisher-Yates algorithm.
   */
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }
}
