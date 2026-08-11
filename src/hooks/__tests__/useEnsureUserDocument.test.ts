import type { User } from 'firebase/auth';
import { renderHook, waitFor } from '@testing-library/react-native';
import { ensureUserDocument } from '../../services/users';
import { useEnsureUserDocument } from '../useEnsureUserDocument';

jest.mock('../../services/users', () => ({ ensureUserDocument: jest.fn() }));

const mockEnsureUserDocument = ensureUserDocument as jest.Mock;

function fakeUser(uid: string): User {
  return { uid } as User;
}

beforeEach(() => {
  mockEnsureUserDocument.mockReset();
});

describe('useEnsureUserDocument', () => {
  it('does nothing while there is no signed-in user', async () => {
    await renderHook(() => useEnsureUserDocument(null));

    expect(mockEnsureUserDocument).not.toHaveBeenCalled();
  });

  it('creates the document once a user is present', async () => {
    mockEnsureUserDocument.mockResolvedValue(undefined);
    const user = fakeUser('abc123');

    await renderHook(() => useEnsureUserDocument(user));

    await waitFor(() => {
      expect(mockEnsureUserDocument).toHaveBeenCalledWith(user);
    });
  });

  it('does not write again when the same user is re-emitted', async () => {
    mockEnsureUserDocument.mockResolvedValue(undefined);
    const user = fakeUser('abc123');

    const { rerender } = await renderHook(() => useEnsureUserDocument(user));
    await rerender(undefined);
    await rerender(undefined);

    expect(mockEnsureUserDocument).toHaveBeenCalledTimes(1);
  });

  it('reports a failure and allows a later retry', async () => {
    mockEnsureUserDocument.mockRejectedValue(new Error('offline'));
    const user = fakeUser('abc123');

    const { result } = await renderHook(() => useEnsureUserDocument(user));

    await waitFor(() => {
      expect(result.current.failed).toBe(true);
    });
  });
});
