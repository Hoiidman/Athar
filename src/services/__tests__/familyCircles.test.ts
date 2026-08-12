import { getRandomBytes } from 'expo-crypto';
import type { User } from 'firebase/auth';
import { arrayUnion, doc, getDoc, runTransaction, writeBatch } from 'firebase/firestore';
import { FamilyCircleError, createFamilyCircle, joinFamilyCircle } from '../familyCircles';

jest.mock('../firebase', () => ({ firestore: { __mockFirestore: true } }));

jest.mock('expo-crypto', () => ({ getRandomBytes: jest.fn() }));

jest.mock('firebase/firestore', () => ({
  arrayUnion: jest.fn((value: string) => ({ __arrayUnion: value })),
  collection: jest.fn((_db: unknown, path: string) => ({ __collection: path })),
  doc: jest.fn(),
  getDoc: jest.fn(),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(() => '__ts'),
  writeBatch: jest.fn(),
}));

function fakeDoc(...args: unknown[]) {
  const first = args[0] as { __collection?: string } | undefined;
  const path =
    args.length === 1 && first?.__collection ? first.__collection : args.slice(1).join('/');
  return { __path: path, id: 'new-circle-id' };
}

const mockGetRandomBytes = getRandomBytes as jest.Mock;
const mockRunTransaction = runTransaction as jest.Mock;

const CODE_A = '22222222';
const CODE_B = '33333333';

function bytesFor(index: number) {
  return Uint8Array.from(Array(8).fill(index));
}
const mockGetDoc = getDoc as jest.Mock;
const mockWriteBatch = writeBatch as jest.Mock;
const mockDoc = doc as jest.Mock;

const user = { uid: 'user-1', displayName: 'Layla', email: null, photoURL: null } as User;

function transactionSpy(existingCodes: string[] = []) {
  const writes: { path: string; data: Record<string, unknown>; kind: 'set' | 'update' }[] = [];
  mockRunTransaction.mockImplementation(async (_db, updateFn) => {
    await updateFn({
      get: async (ref: { __path: string }) => ({
        exists: () => existingCodes.some((code) => ref.__path.endsWith(code)),
      }),
      set: (ref: { __path: string }, data: Record<string, unknown>) =>
        writes.push({ path: ref.__path, data, kind: 'set' }),
      update: (ref: { __path: string }, data: Record<string, unknown>) =>
        writes.push({ path: ref.__path, data, kind: 'update' }),
    });
  });
  return writes;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDoc.mockImplementation(fakeDoc);
  mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ familyCircleId: null }) });
});

function userAlreadyInCircle() {
  mockGetDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({ familyCircleId: 'existing-circle' }),
  });
}

function joinReads(circleId = 'circle-9') {
  mockGetDoc
    .mockResolvedValueOnce({ exists: () => true, data: () => ({ familyCircleId: null }) })
    .mockResolvedValueOnce({ exists: () => true, data: () => ({ familyCircleId: circleId }) });
}

describe('createFamilyCircle', () => {
  it('rejects an empty name before touching Firestore', async () => {
    await expect(createFamilyCircle(user, '   ')).rejects.toThrow(FamilyCircleError);
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('rejects a name longer than the rules allow', async () => {
    await expect(createFamilyCircle(user, 'x'.repeat(61))).rejects.toThrow(FamilyCircleError);
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('writes the circle, owner member doc and invite code together', async () => {
    mockGetRandomBytes.mockReturnValue(bytesFor(0));
    const sets = transactionSpy();

    const result = await createFamilyCircle(user, '  The Hennawis  ');

    expect(result).toEqual({ id: 'new-circle-id', inviteCode: CODE_A });
    expect(sets.filter((w) => w.kind === 'set')).toHaveLength(3);
    expect(sets).toContainEqual(
      expect.objectContaining({
        kind: 'update',
        path: 'users/user-1',
        data: expect.objectContaining({ familyCircleId: 'new-circle-id' }),
      }),
    );

    const circle = sets.find((s) => s.path === 'familyCircles');
    expect(circle?.data).toMatchObject({
      name: 'The Hennawis',
      inviteCode: CODE_A,
      ownerId: 'user-1',
      memberIds: ['user-1'],
    });

    const member = sets.find((s) => s.path.includes('members'));
    expect(member?.data).toMatchObject({
      userId: 'user-1',
      displayName: 'Layla',
      role: 'owner',
      inviteCodeUsed: null,
    });

    const code = sets.find((s) => s.path.startsWith('inviteCodes'));
    expect(code?.data).toMatchObject({ familyCircleId: 'new-circle-id', createdBy: 'user-1' });
  });

  it('retries with a new code when the first one is already taken', async () => {
    mockGetRandomBytes.mockReturnValueOnce(bytesFor(0)).mockReturnValueOnce(bytesFor(1));
    transactionSpy([CODE_A]);

    const result = await createFamilyCircle(user, 'The Hennawis');

    expect(result.inviteCode).toBe(CODE_B);
    expect(mockRunTransaction).toHaveBeenCalledTimes(2);
  });

  it('reports a dedicated error when every generated code collides', async () => {
    mockGetRandomBytes.mockReturnValue(bytesFor(0));
    transactionSpy([CODE_A]);

    await expect(createFamilyCircle(user, 'The Hennawis')).rejects.toMatchObject({
      code: 'code-generation-failed',
    });
  });

  it('does not swallow an unrelated Firestore failure as a collision', async () => {
    mockGetRandomBytes.mockReturnValue(bytesFor(0));
    mockRunTransaction.mockRejectedValue(new Error('permission-denied'));

    await expect(createFamilyCircle(user, 'The Hennawis')).rejects.toThrow('permission-denied');
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  });
});

describe('joinFamilyCircle', () => {
  it('rejects a malformed code without reading Firestore', async () => {
    await expect(joinFamilyCircle(user, 'nope')).rejects.toMatchObject({ code: 'invalid-code' });
    expect(mockGetDoc).not.toHaveBeenCalled();
  });

  it('reports an unknown code', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    await expect(joinFamilyCircle(user, 'K7M2P9XR')).rejects.toMatchObject({
      code: 'code-not-found',
    });
  });

  it('accepts a code typed in lowercase with separators', async () => {
    joinReads();
    const batch = { set: jest.fn(), update: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) };
    mockWriteBatch.mockReturnValue(batch);

    const circleId = await joinFamilyCircle(user, ' k7m2-p9xr ');

    expect(circleId).toBe('circle-9');
    expect(batch.set).toHaveBeenCalledWith(
      expect.objectContaining({ __path: 'familyCircles/circle-9/members/user-1' }),
      expect.objectContaining({
        userId: 'user-1',
        role: 'member',
        inviteCodeUsed: 'K7M2P9XR',
      }),
    );
    expect(batch.update).toHaveBeenCalledWith(
      expect.objectContaining({ __path: 'familyCircles/circle-9' }),
      expect.objectContaining({ memberIds: { __arrayUnion: 'user-1' } }),
    );
    expect(batch.commit).toHaveBeenCalled();
  });

  it('refuses to join a second circle while already in one', async () => {
    userAlreadyInCircle();

    await expect(joinFamilyCircle(user, 'K7M2P9XR')).rejects.toMatchObject({
      code: 'already-in-circle',
    });
    expect(mockWriteBatch).not.toHaveBeenCalled();
  });

  it('adds the member doc and the memberIds update in one batch', async () => {
    joinReads();
    const batch = { set: jest.fn(), update: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) };
    mockWriteBatch.mockReturnValue(batch);

    await joinFamilyCircle(user, 'K7M2P9XR');

    expect(mockWriteBatch).toHaveBeenCalledTimes(1);
    expect(batch.commit).toHaveBeenCalledTimes(1);
  });
});

describe('arrayUnion usage', () => {
  it('adds only the joining user to memberIds', async () => {
    joinReads();
    mockWriteBatch.mockReturnValue({
      set: jest.fn(),
      update: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    });

    await joinFamilyCircle(user, 'K7M2P9XR');

    expect(arrayUnion).toHaveBeenCalledWith('user-1');
  });
});
