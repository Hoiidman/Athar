import { getRandomBytes } from 'expo-crypto';

export const INVITE_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
export const INVITE_CODE_LENGTH = 8;

const UNBIASED_LIMIT =
  Math.floor(256 / INVITE_CODE_ALPHABET.length) * INVITE_CODE_ALPHABET.length;

export function generateInviteCode(): string {
  let code = '';

  while (code.length < INVITE_CODE_LENGTH) {
    for (const byte of getRandomBytes(INVITE_CODE_LENGTH)) {
      if (byte >= UNBIASED_LIMIT) continue;

      code += INVITE_CODE_ALPHABET[byte % INVITE_CODE_ALPHABET.length];
      if (code.length === INVITE_CODE_LENGTH) break;
    }
  }

  return code;
}

export function normalizeInviteCode(raw: string): string {
  return raw.replace(/[\s-]/g, '').toUpperCase();
}

export function isValidInviteCode(code: string): boolean {
  if (code.length !== INVITE_CODE_LENGTH) return false;
  return [...code].every((character) => INVITE_CODE_ALPHABET.includes(character));
}

export async function generateUniqueInviteCode(
  claim: (code: string) => Promise<boolean>,
  maxAttempts = 5,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = generateInviteCode();
    if (await claim(code)) return code;
  }

  throw new Error('Could not generate an unused invite code.');
}
