import { getRandomBytes } from 'expo-crypto';
import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  generateInviteCode,
  generateUniqueInviteCode,
  isValidInviteCode,
  normalizeInviteCode,
} from '../inviteCode';

jest.mock('expo-crypto', () => ({ getRandomBytes: jest.fn() }));

const mockGetRandomBytes = getRandomBytes as jest.Mock;

function bytes(...values: number[]) {
  return Uint8Array.from(values);
}

beforeEach(() => {
  mockGetRandomBytes.mockReset();
});

describe('generateInviteCode', () => {
  it('maps each byte to its alphabet character', () => {
    mockGetRandomBytes.mockReturnValue(bytes(0, 1, 2, 3, 4, 5, 6, 7));

    expect(generateInviteCode()).toBe('23456789');
  });

  it('produces a code of the expected length from the alphabet', () => {
    mockGetRandomBytes.mockReturnValue(bytes(10, 20, 30, 40, 50, 60, 70, 80));

    const code = generateInviteCode();

    expect(code).toHaveLength(INVITE_CODE_LENGTH);
    expect(isValidInviteCode(code)).toBe(true);
  });

  it('rejects bytes that would bias the distribution', () => {
    mockGetRandomBytes
      .mockReturnValueOnce(bytes(240, 250, 255, 245, 241, 254, 252, 249))
      .mockReturnValueOnce(bytes(0, 0, 0, 0, 0, 0, 0, 0));

    expect(generateInviteCode()).toBe('22222222');
    expect(mockGetRandomBytes).toHaveBeenCalledTimes(2);
  });

  it('never emits characters that are easy to misread', () => {
    mockGetRandomBytes.mockReturnValue(bytes(0, 1, 2, 3, 4, 5, 6, 7));

    generateInviteCode();

    for (const confusable of ['0', '1', 'I', 'L', 'O', 'U']) {
      expect(INVITE_CODE_ALPHABET).not.toContain(confusable);
    }
  });
});

describe('normalizeInviteCode', () => {
  it('accepts a code typed in lowercase with separators', () => {
    expect(normalizeInviteCode('k7m2-p9xr')).toBe('K7M2P9XR');
  });

  it('strips surrounding and internal whitespace', () => {
    expect(normalizeInviteCode('  K7M2 P9XR ')).toBe('K7M2P9XR');
  });
});

describe('isValidInviteCode', () => {
  it('accepts a well-formed code', () => {
    expect(isValidInviteCode('K7M2P9XR')).toBe(true);
  });

  it('rejects the wrong length', () => {
    expect(isValidInviteCode('K7M2P9X')).toBe(false);
  });

  it('rejects characters outside the alphabet', () => {
    expect(isValidInviteCode('K7M2P9X0')).toBe(false);
    expect(isValidInviteCode('K7M2P9XI')).toBe(false);
  });
});

describe('generateUniqueInviteCode', () => {
  it('returns the first code the claim accepts', async () => {
    mockGetRandomBytes.mockReturnValue(bytes(0, 1, 2, 3, 4, 5, 6, 7));
    const claim = jest.fn().mockResolvedValue(true);

    await expect(generateUniqueInviteCode(claim)).resolves.toBe('23456789');
    expect(claim).toHaveBeenCalledTimes(1);
  });

  it('retries with a fresh code when one is already taken', async () => {
    mockGetRandomBytes
      .mockReturnValueOnce(bytes(0, 0, 0, 0, 0, 0, 0, 0))
      .mockReturnValueOnce(bytes(1, 1, 1, 1, 1, 1, 1, 1));
    const claim = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await expect(generateUniqueInviteCode(claim)).resolves.toBe('33333333');
    expect(claim).toHaveBeenCalledTimes(2);
  });

  it('gives up rather than looping forever when every code collides', async () => {
    mockGetRandomBytes.mockReturnValue(bytes(0, 1, 2, 3, 4, 5, 6, 7));
    const claim = jest.fn().mockResolvedValue(false);

    await expect(generateUniqueInviteCode(claim, 3)).rejects.toThrow(
      'Could not generate an unused invite code.',
    );
    expect(claim).toHaveBeenCalledTimes(3);
  });
});
