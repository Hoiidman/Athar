import { act, renderHook, waitFor } from '@testing-library/react-native';
import { getFamilyCircle, listFamilyCircleMembers } from '../../services/familyCircles';
import { useFamilyCircleOverview } from '../useFamilyCircleOverview';

jest.mock('../../services/familyCircles', () => ({
  getFamilyCircle: jest.fn(),
  listFamilyCircleMembers: jest.fn(),
}));

const mockGetFamilyCircle = getFamilyCircle as jest.Mock;
const mockListMembers = listFamilyCircleMembers as jest.Mock;

const circle = { id: 'circle-9', name: 'The Mohameds', inviteCode: 'K7M2P9XR' };
const members = [
  { userId: 'user-1', displayName: 'Ahmed', role: 'owner', inviteCodeUsed: null, joinedAt: 1 },
];

beforeEach(() => {
  mockGetFamilyCircle.mockReset();
  mockListMembers.mockReset();
});

describe('useFamilyCircleOverview', () => {
  it('reads the circle and its members together', async () => {
    mockGetFamilyCircle.mockResolvedValue(circle);
    mockListMembers.mockResolvedValue(members);

    const { result } = await renderHook(() => useFamilyCircleOverview('circle-9'));

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'ready', circle, members });
    });
  });

  it('separates a failed read from a circle that is gone', async () => {
    mockGetFamilyCircle.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(circle);
    mockListMembers.mockResolvedValue(members);

    const { result } = await renderHook(() => useFamilyCircleOverview('circle-9'));

    await waitFor(() => expect(result.current.state).toEqual({ status: 'error' }));

    await act(async () => result.current.reload());

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'ready', circle, members });
    });
  });

  it('reports a missing circle without reading', async () => {
    const { result } = await renderHook(() => useFamilyCircleOverview(null));

    expect(result.current.state).toEqual({ status: 'missing' });
    expect(mockGetFamilyCircle).not.toHaveBeenCalled();
  });
});
