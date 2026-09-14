/**
 * OTP Generation & Hashing Utilities
 * Supports Beta mode (deterministic based on mobile number formula)
 * and Production mode (cryptographically secure random 6-digit code).
 */

export function isBetaMode(): boolean {
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.IS_BETA === 'false' || process.env.VITE_IS_BETA === 'false') return false;
      if (process.env.IS_BETA === 'true' || process.env.VITE_IS_BETA === 'true') return true;
    }
  } catch {}

  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const v = (import.meta as any).env.VITE_IS_BETA || (import.meta as any).env.IS_BETA;
      if (v === 'false') return false;
      if (v === 'true') return true;
    }
  } catch {}

  // Default to beta mode when no SMS provider is active
  return true;
}

/**
 * Calculates the deterministic base 6-digit number from a 10-digit mobile number.
 */
export function calculateBaseOTP(mobileNumber: string | number): number {
  const numStr = String(mobileNumber).replace(/\D/g, '').slice(-10).padStart(10, '0');

  const getDigit = (index: number): number => {
    const char = numStr.charAt(index - 1);
    return char ? parseInt(char, 10) : 0;
  };

  // --- Calculate 'a' (using 2nd digit) ---
  const d2 = getDigit(2);
  let a = d2 < 9 ? d2 - 2 : 4;
  if (a <= 0) {
    a = d2 === 0 ? 7 : Math.min(9, d2 + 3);
  }

  // --- Calculate 'b' (using 4th digit) ---
  const d4 = getDigit(4);
  let b = d4 < 9 ? d4 - 3 : 5;
  if (b < 0) b = 1;

  // --- Calculate 'c' (using 6th digit) ---
  const d6 = getDigit(6);
  let c = d6 < 9 ? d6 - 4 : 6;
  if (c < 0) c = 2;

  // --- Calculate 'd' (using 7th digit) ---
  const d7 = getDigit(7);
  let d = d7 < 9 ? d7 - 2 : 7;
  if (d < 0) d = 2;

  // --- Calculate 'e' (using 8th digit) ---
  const d8 = getDigit(8);
  let e = d8 < 9 ? d8 - 3 : 5;
  if (e < 0) e = 7;

  // --- Calculate 'f' (Condition uses 10th digit, Formula uses 8th digit) ---
  const d10 = getDigit(10);
  let f = d10 < 9 ? d8 - 1 : 4;
  if (f < 0) f = 5;

  const otpString = `${a}${b}${c}${d}${e}${f}`;
  return parseInt(otpString, 10);
}

/**
 * Extracts the raw UTC HHMM number from a timestamp (e.g. 14:25 UTC -> 1425, 08:05 UTC -> 805)
 */
export function getUtcHHMM(timestamp?: Date | string | number): number {
  const date = timestamp ? new Date(timestamp) : new Date();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  return hours * 100 + minutes;
}

/**
 * Generates a 6-digit OTP.
 * In Beta mode:
 *   1. Calculates base OTP from mobile number.
 *   2. Adds raw UTC HHMM from the creation timestamp.
 *   3. If 7 digits (sum >= 1,000,000), drops the first digit (takes last 6 digits: sum % 1,000,000).
 *   4. Zero-padded to 6 digits.
 *
 * In Production mode:
 *   Generates cryptographically random 6-digit number (100000..999999).
 */
export function generateOTP(mobileNumber: string | number, timestamp?: Date | string | number): number {
  if (isBetaMode()) {
    const baseOtp = calculateBaseOTP(mobileNumber);
    const hhmm = getUtcHHMM(timestamp);
    const sum = baseOtp + hhmm;
    // If it reaches 7 digits, drop the first digit (keep last 6 digits)
    return sum % 1000000;
  } else {
    // Production route: cryptographic random 6-digit number (100000..999999)
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      return 100000 + (array[0] % 900000);
    }
    return Math.floor(100000 + Math.random() * 900000);
  }
}

/**
 * Returns the 6-character string representation of an OTP (zero-padded if needed)
 */
export function formatOtpString(otp: number | string): string {
  return String(otp).trim().padStart(6, '0').slice(-6);
}

/**
 * Computes standard SHA-256 hex string (64 characters).
 * Pure JavaScript implementation: zero dependencies, completely synchronous,
 * works identically across browser, Vite bundle, Node.js ESM and CJS.
 */
export function sha256Hex(ascii: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i: number, j: number;
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, number> = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  hash = hash.slice(0, 8);
  ascii += '\x80';
  while (ascii.length % 64 - 56) ascii += '\x00';

  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15],
        w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 =
        hash[7] +
        (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) +
        ch +
        k[i] +
        ((w[i] = i < 16 ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0));
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj;
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

/**
 * Computes SHA-256 hex string for an OTP code.
 */
export async function hashOTP(otp: string | number): Promise<string> {
  const clean = formatOtpString(otp);
  return sha256Hex(clean);
}

/**
 * Synchronous SHA-256 for Node.js server and client usage
 */
export function hashOTPSync(otp: string | number): string {
  const clean = formatOtpString(otp);
  return sha256Hex(clean);
}
