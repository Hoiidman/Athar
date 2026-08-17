import { getRandomBytes } from 'expo-crypto';
import type { User } from 'firebase/auth';
import { doc, getDoc, getDocs, runTransaction, updateDoc, writeBatch } from 'firebase/firestore';
import {
  FamilyCircleError,
  createFamilyCircle,
  joinFamilyCircle,
  leaveFamilyCircle,
  listFamilyCircleMembers,
  renameFamilyCircle,
  rotateInviteCode,
} from '../familyCircles';
import { ensureUserDocument } from '../users';

jest.mock('../firebase', () => ({ firestore: { __mockFirestore: true } }));

jest.mock('../users', () => ({
  defaultDisplayName: jest.fn(() => 'Layla'),
  ensureUserDocument: jest.fn(),
}));

jest.mock('expo-crypto', () => ({ getRandomBytes: jest.fn() }));

jest.mock('firebase/firestore', () => ({
  arrayRemove: jest.fn((value: string) => ({ __arrayRemove: value })),
  arrayUnion: jest.fn((value: string) => ({ __arrayUnion: value })),
  collection: jest.fn((_db: unknown, path: string) => ({ __collection: path })),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(() => '__ts'),
  updateDoc: jest.fn(),
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

function transactionSpy(
  existingCodes: string[] = [],
  circle: Record<string, unknown> | null = {},
) {
  const writes: {
    path: string;
    data?: Record<string, unknown>;
    kind: 'set' | 'update' | 'delete';
  }[] = [];
  mockRunTransaction.mockImplementation(async (_db, updateFn) => {
    await updateFn({
      get: async (ref: { __path: string }) => ({
        exists: () =>
          ref.__path.startsWith('familyCircles')
            ? circle !== null
            : existingCodes.some((code) => ref.__path.endsWith(code)),
        data: () => circle,
      }),
      set: (ref: { __path: string }, data: Record<string, unknown>) =>
        writes.push({ path: ref.__path, data, kind: 'set' }),
      update: (ref: { __path: string }, data: Record<string, unknown>) =>
        writes.push({ path: ref.__path, data, kind: 'update' }),
      delete: (ref: { __path: string }) => writes.push({ path: ref.__path, kind: 'delete' }),
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
  it('rejects an unusable name before touching Firestore', async () => {
    await expect(createFamilyCircle(user, '   ')).rejects.toThrow(FamilyCircleError);
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

  it('creates the user document first when it does not exist yet', async () => {
    mockGetRandomBytes.mockReturnValue(bytesFor(0));
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    const writes = transactionSpy();

    await createFamilyCircle(user, 'The Hennawis');

    expect(ensureUserDocument).toHaveBeenCalledWith(user);
    expect(writes).toContainEqual(
      expect.objectContaining({ kind: 'update', path: 'users/user-1' }),
    );
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
    const batch = {
      set: jest.fn(),
      update: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    };
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

});

describe('leaveFamilyCircle', () => {
  it('drops the member document, the list entry and the pointer together', async () => {
    const batch = {
      delete: jest.fn(),
      update: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    };
    mockWriteBatch.mockReturnValue(batch);

    await leaveFamilyCircle(user, 'circle-9');

    expect(batch.delete).toHaveBeenCalledWith(
      expect.objectContaining({ __path: 'familyCircles/circle-9/members/user-1' }),
    );
    expect(batch.update).toHaveBeenCalledWith(
      expect.objectContaining({ __path: 'familyCircles/circle-9' }),
      expect.objectContaining({ memberIds: { __arrayRemove: 'user-1' } }),
    );
    expect(batch.update).toHaveBeenCalledWith(
      expect.objectContaining({ __path: 'users/user-1' }),
      expect.objectContaining({ familyCircleId: null }),
    );
    expect(batch.commit).toHaveBeenCalled();
  });
});

describe('renameFamilyCircle', () => {
  it('rejects an unusable name before writing', async () => {
    await expect(renameFamilyCircle('circle-9', '   ')).rejects.toThrow(FamilyCircleError);
    await expect(renameFamilyCircle('circle-9', 'x'.repeat(61))).rejects.toThrow(FamilyCircleError);
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('trims the name it writes', async () => {
    await renameFamilyCircle('circle-9', '  The Hennawi Family  ');

    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ __path: 'familyCircles/circle-9' }),
      expect.objectContaining({ name: 'The Hennawi Family' }),
    );
  });
});

describe('rotateInviteCode', () => {
  it('registers the new code, repoints the circle and drops the old code', async () => {
    mockGetRandomBytes.mockReturnValue(bytesFor(0));
    const writes = transactionSpy([], { inviteCode: 'OLDCODE1' });

    const code = await rotateInviteCode(user, 'circle-9');

    expect(code).toBe(CODE_A);
    expect(writes).toEqual([
      expect.objectContaining({
        kind: 'set',
        path: `inviteCodes/${CODE_A}`,
        data: expect.objectContaining({ familyCircleId: 'circle-9', createdBy: 'user-1' }),
      }),
      expect.objectContaining({
        kind: 'update',
        path: 'familyCircles/circle-9',
        data: expect.objectContaining({ inviteCode: CODE_A }),
      }),
      { kind: 'delete', path: 'inviteCodes/OLDCODE1' },
    ]);
  });

  it('refuses to rotate a circle that is not there', async () => {
    mockGetRandomBytes.mockReturnValue(bytesFor(0));
    const writes = transactionSpy([], null);

    await expect(rotateInviteCode(user, 'circle-9')).rejects.toThrow(FamilyCircleError);
    expect(writes).toHaveLength(0);
  });
});

describe('listFamilyCircleMembers', () => {
  it('converts joinedAt to millis and sorts oldest first', async () => {
    const mockGetDocs = getDocs as jest.Mock;
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          data: () => ({
            userId: 'user-2',
            displayName: 'Sami',
            role: 'member',
            inviteCodeUsed: 'K7M2P9XR',
            joinedAt: { toMillis: () => 200 },
          }),
        },
        {
          data: () => ({
            userId: 'user-1',
            displayName: 'Layla',
            role: 'owner',
            inviteCodeUsed: null,
            joinedAt: { toMillis: () => 100 },
          }),
        },
      ],
    });

    const members = await listFamilyCircleMembers('circle-9');

    expect(members.map((m) => m.userId)).toEqual(['user-1', 'user-2']);
    expect(members[0]?.joinedAt).toBe(100);
  });
});
