import { onAuthStateChanged, type User } from 'firebase/auth';
import { renderHook, waitFor } from '@testing-library/react-native';
import { act } from 'react-test-renderer';
import { useAuth } from '../useAuth';

jest.mock('../../services/firebase', () => ({ auth: { __mockAuth: true } }));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
}));

const mockOnAuthStateChanged = onAuthStateChanged as jest.Mock;

describe('useAuth', () => {
  it('starts with no user while initializing', async () => {
    mockOnAuthStateChanged.mockReturnValue(jest.fn());

    const { result } = await renderHook(() => useAuth());

    expect(result.current).toEqual({ user: null, initializing: true });
  });

  it('reflects the signed-in user once Firebase reports one', async () => {
    let emit: (user: User | null) => void = () => {};
    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      emit = callback;
      return jest.fn();
    });

    const { result } = await renderHook(() => useAuth());
    const fakeUser = { uid: 'abc123' } as User;
    act(() => emit(fakeUser));

    await waitFor(() => {
      expect(result.current).toEqual({ user: fakeUser, initializing: false });
    });
  });

  it('unsubscribes from onAuthStateChanged when unmounted', async () => {
    const unsubscribe = jest.fn();
    mockOnAuthStateChanged.mockReturnValue(unsubscribe);

    const { unmount } = await renderHook(() => useAuth());
    await unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
