import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { User } from 'firebase/auth';
import { Alert, Share } from 'react-native';
import {
  getFamilyCircle,
  listFamilyCircleMembers,
  rotateInviteCode,
} from '../../../services/familyCircles';
import { InviteScreen } from '../InviteScreen';

jest.mock('expo-linking', () => ({
  createURL: (path: string) => `exp://127.0.0.1:8081/--/${path}`,
}));

jest.mock('../../../services/familyCircles', () => ({
  getFamilyCircle: jest.fn(),
  listFamilyCircleMembers: jest.fn(),
  rotateInviteCode: jest.fn(),
}));

const mockGetFamilyCircle = getFamilyCircle as jest.Mock;
const mockListMembers = listFamilyCircleMembers as jest.Mock;
const mockRotate = rotateInviteCode as jest.Mock;

const owner = { uid: 'user-1' } as User;
const member = { uid: 'user-2' } as User;

beforeEach(() => {
  mockRotate.mockReset().mockResolvedValue('N3W4C5D6');
  mockGetFamilyCircle.mockReset().mockResolvedValue({
    id: 'circle-9',
    name: 'The Hennawis',
    inviteCode: 'K7M2P9XR',
    ownerId: 'user-1',
  });
  mockListMembers.mockReset().mockResolvedValue([]);
});

describe('InviteScreen', () => {
  it('shares both a link and the bare code', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });

    const { findByRole } = await render(<InviteScreen circleId="circle-9" user={owner} />);

    await fireEvent.press(await findByRole('button', { name: 'Share invite' }));

    await waitFor(() => expect(share).toHaveBeenCalled());

    const { message } = share.mock.calls[0]?.[0] as { message: string };
    expect(message).toContain('exp://127.0.0.1:8081/--/join/K7M2P9XR');
    expect(message).toContain('enter the code K7M2P9XR');

    share.mockRestore();
  });

  it('offers a retry instead of a code when the circle cannot be read', async () => {
    mockGetFamilyCircle.mockRejectedValue(new Error('offline'));

    const { findByRole, queryByText } = await render(<InviteScreen circleId="circle-9" user={owner} />);

    expect(await findByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(queryByText('K7M2P9XR')).toBeFalsy();
  });

  it('rotates the code only after the owner confirms', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { findByRole } = await render(<InviteScreen circleId="circle-9" user={owner} />);

    await fireEvent.press(await findByRole('button', { name: 'Change code' }));
    expect(mockRotate).not.toHaveBeenCalled();

    const confirm = alert.mock.calls[0]?.[2]?.find((button) => button.text === 'Change code');
    await confirm?.onPress?.();

    await waitFor(() => expect(mockRotate).toHaveBeenCalledWith(owner, 'circle-9'));
    await waitFor(() => expect(mockGetFamilyCircle).toHaveBeenCalledTimes(2));

    alert.mockRestore();
  });

  it('does not offer the change to anyone but the owner', async () => {
    const { findByText, queryByRole } = await render(
      <InviteScreen circleId="circle-9" user={member} />,
    );

    expect(await findByText('K7M2P9XR')).toBeTruthy();
    expect(queryByRole('button', { name: 'Change code' })).toBeFalsy();
  });
});
