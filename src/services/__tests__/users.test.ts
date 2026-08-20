import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { ensureUserDocument, getFamilyCircleId } from '../users';

jest.mock('../firebase', () => ({ firestore: { __mockFirestore: true } }));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ __mockDocRef: true })),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(() => '__mockServerTimestamp'),
}));

const mockDoc = doc as jest.Mock;
const mockGetDoc = getDoc as jest.Mock;
const mockSetDoc = setDoc as jest.Mock;

function fakeUser(overrides: Partial<User> = {}): User {
  return { uid: 'abc123', displayName: null, email: null, photoURL: null, ...overrides } as User;
}

beforeEach(() => {
  mockDoc.mockClear();
  mockGetDoc.mockReset();
  mockSetDoc.mockReset();
});

describe('ensureUserDocument', () => {
  it('does nothing if the document already exists', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true });

    await ensureUserDocument(fakeUser());

    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('references the doc by the user uid', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockSetDoc.mockResolvedValue(undefined);

    await ensureUserDocument(fakeUser({ uid: 'xyz789' }));

    expect(mockDoc).toHaveBeenCalledWith({ __mockFirestore: true }, 'users', 'xyz789');
  });

  it('uses the Firebase display name when one is set', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockSetDoc.mockResolvedValue(undefined);

    await ensureUserDocument(fakeUser({ displayName: 'Layla' }));

    expect(mockSetDoc).toHaveBeenCalledWith(
      { __mockDocRef: true },
      expect.objectContaining({ displayName: 'Layla' }),
    );
  });

  it('falls back to the email local part when there is no display name', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockSetDoc.mockResolvedValue(undefined);

    await ensureUserDocument(fakeUser({ email: 'layla@example.com' }));

    expect(mockSetDoc).toHaveBeenCalledWith(
      { __mockDocRef: true },
      expect.objectContaining({ displayName: 'layla' }),
    );
  });

  it('falls back to "Guest" for an anonymous user with neither', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockSetDoc.mockResolvedValue(undefined);

    await ensureUserDocument(fakeUser());

    expect(mockSetDoc).toHaveBeenCalledWith(
      { __mockDocRef: true },
      expect.objectContaining({ displayName: 'Guest' }),
    );
  });

  it('writes exactly the fields the security rules expect, using server timestamps', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockSetDoc.mockResolvedValue(undefined);

    await ensureUserDocument(
      fakeUser({ displayName: 'Layla', photoURL: 'https://example.com/p.jpg' }),
    );

    expect(mockSetDoc).toHaveBeenCalledWith(
      { __mockDocRef: true },
      {
        displayName: 'Layla',
        photoUrl: 'https://example.com/p.jpg',
        familyCircleId: null,
        createdAt: '__mockServerTimestamp',
        updatedAt: '__mockServerTimestamp',
      },
    );
  });
});

describe('getFamilyCircleId', () => {
  it('returns the id from the user document', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ familyCircleId: 'circle-1' }),
    });

    await expect(getFamilyCircleId('abc123')).resolves.toBe('circle-1');
  });

  it('returns null when the user has no circle, or no document at all', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ familyCircleId: null }),
    });
    await expect(getFamilyCircleId('abc123')).resolves.toBeNull();

    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    await expect(getFamilyCircleId('abc123')).resolves.toBeNull();
  });
});
