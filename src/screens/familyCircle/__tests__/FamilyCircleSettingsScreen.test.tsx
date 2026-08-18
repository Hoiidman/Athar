import type { User } from 'firebase/auth';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  getFamilyCircle,
  leaveFamilyCircle,
  listFamilyCircleMembers,
  renameFamilyCircle,
} from '../../../services/familyCircles';
import { FamilyCircleSettingsScreen } from '../FamilyCircleSettingsScreen';

jest.mock('../../../services/auth', () => ({ signOut: jest.fn() }));

jest.mock('../../../services/familyCircles', () => ({
  getFamilyCircle: jest.fn(),
  listFamilyCircleMembers: jest.fn(),
  renameFamilyCircle: jest.fn(),
  leaveFamilyCircle: jest.fn(),
  MAX_CIRCLE_NAME_LENGTH: 60,
}));

const mockGetFamilyCircle = getFamilyCircle as jest.Mock;
const mockListMembers = listFamilyCircleMembers as jest.Mock;
const mockRename = renameFamilyCircle as jest.Mock;
const mockLeave = leaveFamilyCircle as jest.Mock;

const owner = { uid: 'user-1' } as User;
const member = { uid: 'user-2' } as User;
const onLeft = jest.fn();

beforeEach(() => {
  mockGetFamilyCircle.mockReset().mockResolvedValue({
    id: 'circle-9',
    name: 'Our family',
    inviteCode: 'K7M2P9XR',
    ownerId: 'user-1',
  });
  mockListMembers.mockReset().mockResolvedValue([]);
  mockRename.mockReset().mockResolvedValue(undefined);
  mockLeave.mockReset().mockResolvedValue(undefined);
  onLeft.mockReset();
});

describe('FamilyCircleSettingsScreen', () => {
  it('saves a new name for the owner', async () => {
    const { getByRole, getByLabelText } = await render(
      <FamilyCircleSettingsScreen circleId="circle-9" user={owner} onLeft={onLeft} />,
    );

    await waitFor(() => expect(getByLabelText('Circle name')).toBeTruthy());
    await fireEvent.changeText(getByLabelText('Circle name'), 'The Mohameds');
    await fireEvent.press(getByRole('button', { name: 'Save name' }));

    await waitFor(() => expect(mockRename).toHaveBeenCalledWith('circle-9', 'The Mohameds'));
  });

  it('shows a non-owner the name without a way to change it', async () => {
    const { getByText, queryByRole } = await render(
      <FamilyCircleSettingsScreen circleId="circle-9" user={member} onLeft={onLeft} />,
    );

    await waitFor(() => expect(getByText('Our family')).toBeTruthy());
    expect(getByText('Only the family owner can change the name.')).toBeTruthy();
    expect(queryByRole('button', { name: 'Save name' })).toBeFalsy();
  });

  it('keeps the save disabled until the name actually changes', async () => {
    const { getByRole, getByLabelText } = await render(
      <FamilyCircleSettingsScreen circleId="circle-9" user={owner} onLeft={onLeft} />,
    );

    await waitFor(() => expect(getByLabelText('Circle name')).toBeTruthy());
    await fireEvent.press(getByRole('button', { name: 'Save name' }));
    expect(mockRename).not.toHaveBeenCalled();

    await fireEvent.changeText(getByLabelText('Circle name'), '   ');
    await fireEvent.press(getByRole('button', { name: 'Save name' }));
    expect(mockRename).not.toHaveBeenCalled();
  });

  it('leaves the circle only after the confirmation is accepted', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByRole } = await render(
      <FamilyCircleSettingsScreen circleId="circle-9" user={member} onLeft={onLeft} />,
    );

    await waitFor(() => expect(getByRole('button', { name: 'Leave circle' })).toBeTruthy());
    await fireEvent.press(getByRole('button', { name: 'Leave circle' }));

    expect(mockLeave).not.toHaveBeenCalled();

    const buttons = alert.mock.calls[0]?.[2];
    await buttons?.find((button) => button.style === 'destructive')?.onPress?.();

    await waitFor(() => expect(mockLeave).toHaveBeenCalledWith(member, 'circle-9'));
    expect(onLeft).toHaveBeenCalled();

    alert.mockRestore();
  });

  it('explains to the owner why leaving is not offered', async () => {
    const { getByText, queryByRole } = await render(
      <FamilyCircleSettingsScreen circleId="circle-9" user={owner} onLeft={onLeft} />,
    );

    await waitFor(() => expect(getByText(/cannot leave it/)).toBeTruthy());
    expect(queryByRole('button', { name: 'Leave circle' })).toBeFalsy();
  });
  it('still offers sign out when there is no circle to configure', async () => {
    const { getByRole, queryByLabelText } = await render(
      <FamilyCircleSettingsScreen circleId={null} user={member} onLeft={onLeft} />,
    );

    expect(getByRole('button', { name: 'Sign out' })).toBeTruthy();
    expect(queryByLabelText('Circle name')).toBeFalsy();
    expect(mockGetFamilyCircle).not.toHaveBeenCalled();
  });
});
