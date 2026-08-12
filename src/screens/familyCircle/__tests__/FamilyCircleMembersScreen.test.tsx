import { fireEvent, render } from '@testing-library/react-native';
import { listFamilyCircleMembers } from '../../../services/familyCircles';
import { getFamilyCircleId } from '../../../services/users';
import type { FamilyCircleMember } from '../../../types/familyCircle';
import { FamilyCircleMembersScreen } from '../FamilyCircleMembersScreen';

jest.mock('../../../services/familyCircles', () => ({ listFamilyCircleMembers: jest.fn() }));
jest.mock('../../../services/users', () => ({ getFamilyCircleId: jest.fn() }));

const mockGetFamilyCircleId = getFamilyCircleId as jest.Mock;
const mockListMembers = listFamilyCircleMembers as jest.Mock;

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

beforeEach(() => {
  mockGetFamilyCircleId.mockReset();
  mockListMembers.mockReset();
});

describe('FamilyCircleMembersScreen', () => {
  it('lists the members of the circle the user belongs to', async () => {
    mockGetFamilyCircleId.mockResolvedValue('circle-9');
    mockListMembers.mockResolvedValue([owner, joiner]);

    const { findByText, getByText } = await render(<FamilyCircleMembersScreen uid="user-1" />);

    expect(await findByText('Layla')).toBeTruthy();
    expect(getByText('Sami')).toBeTruthy();
    expect(mockListMembers).toHaveBeenCalledWith('circle-9');
  });

  it('says so when the user has no circle, without asking for members', async () => {
    mockGetFamilyCircleId.mockResolvedValue(null);

    const { findByText } = await render(<FamilyCircleMembersScreen uid="user-1" />);

    expect(await findByText(/not in a family circle yet/)).toBeTruthy();
    expect(mockListMembers).not.toHaveBeenCalled();
  });

  it('retries the read after a failure', async () => {
    mockGetFamilyCircleId.mockRejectedValueOnce(new Error('offline')).mockResolvedValue('circle-9');
    mockListMembers.mockResolvedValue([owner]);

    const { findByText, getByRole } = await render(<FamilyCircleMembersScreen uid="user-1" />);

    expect(await findByText(/Could not load your family circle/)).toBeTruthy();

    await fireEvent.press(getByRole('button', { name: 'Try again' }));

    expect(await findByText('Layla')).toBeTruthy();
  });
});
