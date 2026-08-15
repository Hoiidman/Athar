import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import { getFamilyCircle, listFamilyCircleMembers } from '../../../services/familyCircles';
import { InviteScreen } from '../InviteScreen';

jest.mock('../../../services/familyCircles', () => ({
  getFamilyCircle: jest.fn(),
  listFamilyCircleMembers: jest.fn(),
}));

const mockGetFamilyCircle = getFamilyCircle as jest.Mock;
const mockListMembers = listFamilyCircleMembers as jest.Mock;

beforeEach(() => {
  mockGetFamilyCircle.mockReset().mockResolvedValue({
    id: 'circle-9',
    name: 'The Hennawis',
    inviteCode: 'K7M2P9XR',
    ownerId: 'user-1',
  });
  mockListMembers.mockReset().mockResolvedValue([]);
});

describe('InviteScreen', () => {
  it('shares the invite code as plain text', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });

    const { findByRole } = await render(<InviteScreen circleId="circle-9" />);

    await fireEvent.press(await findByRole('button', { name: 'Share invite' }));

    await waitFor(() =>
      expect(share).toHaveBeenCalledWith({ message: expect.stringContaining('K7M2P9XR') }),
    );

    share.mockRestore();
  });

  it('offers a retry instead of a code when the circle cannot be read', async () => {
    mockGetFamilyCircle.mockRejectedValue(new Error('offline'));

    const { findByRole, queryByText } = await render(<InviteScreen circleId="circle-9" />);

    expect(await findByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(queryByText('K7M2P9XR')).toBeFalsy();
  });
});
