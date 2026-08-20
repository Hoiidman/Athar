import type { User } from 'firebase/auth';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { getFamilyCircleId } from '../../services/users';
import { useFamilyCircleMembership } from '../useFamilyCircleMembership';

jest.mock('../../services/users', () => ({ getFamilyCircleId: jest.fn() }));

const mockGetFamilyCircleId = getFamilyCircleId as jest.Mock;

function fakeUser(uid: string): User {
  return { uid } as User;
}

beforeEach(() => {
  mockGetFamilyCircleId.mockReset();
});

describe('useFamilyCircleMembership', () => {
  it('reports the circle a member belongs to', async () => {
    mockGetFamilyCircleId.mockResolvedValue('circle-9');

    const { result } = await renderHook(() => useFamilyCircleMembership(fakeUser('user-1')));

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'ready', circleId: 'circle-9' });
    });
  });

  it('separates a failed read from having no circle', async () => {
    mockGetFamilyCircleId.mockRejectedValueOnce(new Error('offline')).mockResolvedValue('circle-9');

    const { result } = await renderHook(() => useFamilyCircleMembership(fakeUser('user-1')));

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'error' });
    });

    await act(async () => result.current.retry());

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'ready', circleId: 'circle-9' });
    });
  });

  it('adopts a newly created circle without reading again', async () => {
    mockGetFamilyCircleId.mockResolvedValue(null);

    const { result } = await renderHook(() => useFamilyCircleMembership(fakeUser('user-1')));

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'ready', circleId: null });
    });

    await act(async () => result.current.adoptCircle('circle-9'));

    expect(result.current.state).toEqual({ status: 'ready', circleId: 'circle-9' });
    expect(mockGetFamilyCircleId).toHaveBeenCalledTimes(1);
  });
});
