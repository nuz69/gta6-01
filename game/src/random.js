/**
 * Solmarina: Neon Heat - Seeded Pseudo-Random Number Generator (SeederRNG)
 * Mulberry32-based PRNG ensuring deterministic world generation and simulation.
 */

export class SeederRNG {
  constructor(seed = 1337) {
    this.seed = Math.floor(seed);
  }

  /**
   * Generates the next pseudo-random float between 0 (inclusive) and 1 (exclusive).
   */
  next() {
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  /**
   * Returns a random float between min (inclusive) and max (exclusive).
   */
  range(min, max) {
    return min + this.next() * (max - min);
  }

  /**
   * Returns a random integer between min and max (both inclusive).
   */
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Picks a random element from an array.
   */
  pick(arr) {
    if (!arr || arr.length === 0) return undefined;
    return arr[this.int(0, arr.length - 1)];
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
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
