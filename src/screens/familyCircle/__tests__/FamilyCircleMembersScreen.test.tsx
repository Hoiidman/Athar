import { fireEvent, render } from '@testing-library/react-native';
import { getFamilyCircle, listFamilyCircleMembers } from '../../../services/familyCircles';
import type { FamilyCircleMember } from '../../../types/familyCircle';
import { FamilyCircleMembersScreen } from '../FamilyCircleMembersScreen';

jest.mock('../../../services/familyCircles', () => ({
  getFamilyCircle: jest.fn(),
  listFamilyCircleMembers: jest.fn(),
}));

const mockGetFamilyCircle = getFamilyCircle as jest.Mock;
const mockListMembers = listFamilyCircleMembers as jest.Mock;

const circle = { id: 'circle-9', name: 'The Hennawis', inviteCode: 'K7M2P9XR' };

const owner: FamilyCircleMember = {
  userId: 'user-1',
  displayName: 'Layla',
  role: 'owner',
  inviteCodeUsed: null,
  joinedAt: 1_000,
};

const joiner: FamilyCircleMember = {
  userId: 'user-2',
  displayName: 'Sami',
  role: 'member',
  inviteCodeUsed: 'K7M2P9XR',
  joinedAt: 2_000,
};

const onOpenMember = jest.fn();
const onInvite = jest.fn();

beforeEach(() => {
  mockGetFamilyCircle.mockReset();
  mockListMembers.mockReset();
  onOpenMember.mockReset();
  onInvite.mockReset();
  mockGetFamilyCircle.mockResolvedValue(circle);
});

describe('FamilyCircleMembersScreen', () => {
  it('lists the members of the circle the user belongs to', async () => {
    mockListMembers.mockResolvedValue([owner, joiner]);

    const { findByText, getByText, queryByText } = await render(
      <FamilyCircleMembersScreen
        circleId="circle-9"
        onOpenMember={onOpenMember}
        onInvite={onInvite}
      />,
    );

    expect(await findByText('Layla')).toBeTruthy();
    expect(getByText('Sami')).toBeTruthy();
    expect(mockListMembers).toHaveBeenCalledWith('circle-9');

    expect(getByText('2 members')).toBeTruthy();
    expect(queryByText('K7M2P9XR')).toBeFalsy();
  });

  it('leads to the invite page from the end of the list', async () => {
    mockListMembers.mockResolvedValue([owner]);

    const { findByRole } = await render(
      <FamilyCircleMembersScreen
        circleId="circle-9"
        onOpenMember={onOpenMember}
        onInvite={onInvite}
      />,
    );

    await fireEvent.press(await findByRole('button', { name: 'Invite family member' }));

    expect(onInvite).toHaveBeenCalled();
  });

  it('says so when the user has no circle, without asking for members', async () => {
    const { findByText } = await render(
      <FamilyCircleMembersScreen circleId={null} onOpenMember={onOpenMember} onInvite={onInvite} />,
    );

    expect(await findByText(/not in a family circle yet/)).toBeTruthy();
    expect(mockListMembers).not.toHaveBeenCalled();
  });

  it('opens the member behind the row that was tapped', async () => {
    mockListMembers.mockResolvedValue([owner, joiner]);

    const { findByRole } = await render(
      <FamilyCircleMembersScreen
        circleId="circle-9"
        onOpenMember={onOpenMember}
        onInvite={onInvite}
      />,
    );

    await fireEvent.press(await findByRole('button', { name: /^Sami/ }));

    expect(onOpenMember).toHaveBeenCalledWith('user-2');
  });

  it('retries the read after a failure', async () => {
    mockGetFamilyCircle.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(circle);
    mockListMembers.mockResolvedValue([owner]);

    const { findByText, getByRole } = await render(
      <FamilyCircleMembersScreen
        circleId="circle-9"
        onOpenMember={onOpenMember}
        onInvite={onInvite}
      />,
    );

    expect(await findByText(/Could not load your family circle/)).toBeTruthy();

    await fireEvent.press(getByRole('button', { name: 'Try again' }));

    expect(await findByText('Layla')).toBeTruthy();
  });
});
