import type { User } from 'firebase/auth';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  getFamilyCircle,
  listFamilyCircleMembers,
  renameFamilyCircle,
} from '../../../services/familyCircles';
import { FamilyCircleSettingsScreen } from '../FamilyCircleSettingsScreen';

jest.mock('../../../services/familyCircles', () => ({
  getFamilyCircle: jest.fn(),
  listFamilyCircleMembers: jest.fn(),
  renameFamilyCircle: jest.fn(),
  MAX_CIRCLE_NAME_LENGTH: 60,
}));

const mockGetFamilyCircle = getFamilyCircle as jest.Mock;
const mockListMembers = listFamilyCircleMembers as jest.Mock;
const mockRename = renameFamilyCircle as jest.Mock;

const owner = { uid: 'user-1' } as User;
const member = { uid: 'user-2' } as User;

beforeEach(() => {
  mockGetFamilyCircle.mockReset().mockResolvedValue({
    id: 'circle-9',
    name: 'Our family',
    inviteCode: 'K7M2P9XR',
    ownerId: 'user-1',
  });
  mockListMembers.mockReset().mockResolvedValue([]);
  mockRename.mockReset().mockResolvedValue(undefined);
});

describe('FamilyCircleSettingsScreen', () => {
  it('saves a new name for the owner', async () => {
    const { getByRole, getByLabelText } = await render(
      <FamilyCircleSettingsScreen circleId="circle-9" user={owner} />,
    );

    await waitFor(() => expect(getByLabelText('Circle name')).toBeTruthy());
    await fireEvent.changeText(getByLabelText('Circle name'), 'The Mohameds');
    await fireEvent.press(getByRole('button', { name: 'Save name' }));

    await waitFor(() => expect(mockRename).toHaveBeenCalledWith('circle-9', 'The Mohameds'));
  });

  it('shows a non-owner the name without a way to change it', async () => {
    const { getByText, queryByRole } = await render(
      <FamilyCircleSettingsScreen circleId="circle-9" user={member} />,
    );

    await waitFor(() => expect(getByText('Our family')).toBeTruthy());
    expect(getByText('Only the family owner can change the name.')).toBeTruthy();
    expect(queryByRole('button', { name: 'Save name' })).toBeFalsy();
  });

  it('keeps the save disabled until the name actually changes', async () => {
    const { getByRole, getByLabelText } = await render(
      <FamilyCircleSettingsScreen circleId="circle-9" user={owner} />,
    );

    await waitFor(() => expect(getByLabelText('Circle name')).toBeTruthy());
    await fireEvent.press(getByRole('button', { name: 'Save name' }));
    expect(mockRename).not.toHaveBeenCalled();

    await fireEvent.changeText(getByLabelText('Circle name'), '   ');
    await fireEvent.press(getByRole('button', { name: 'Save name' }));
    expect(mockRename).not.toHaveBeenCalled();
  });
});

