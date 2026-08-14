import { render } from '@testing-library/react-native';
import { getFamilyCircle, listFamilyCircleMembers } from '../../../services/familyCircles';
import type { FamilyCircleMember } from '../../../types/familyCircle';
import { MemberDetailScreen } from '../MemberDetailScreen';

jest.mock('../../../services/familyCircles', () => ({
  getFamilyCircle: jest.fn(),
  listFamilyCircleMembers: jest.fn(),
}));

const mockGetFamilyCircle = getFamilyCircle as jest.Mock;
const mockListMembers = listFamilyCircleMembers as jest.Mock;

const owner: FamilyCircleMember = {
  userId: 'user-1',
  displayName: 'Layla',
  role: 'owner',
  inviteCodeUsed: null,
  joinedAt: 1_000,
};

beforeEach(() => {
  mockGetFamilyCircle.mockReset().mockResolvedValue({
    id: 'circle-9',
    name: 'The Hennawis',
    inviteCode: 'K7M2P9XR',
  });
  mockListMembers.mockReset().mockResolvedValue([owner]);
});

describe('MemberDetailScreen', () => {
  it('shows the member and marks the row that is you', async () => {
    const { findByText, getByText } = await render(
      <MemberDetailScreen circleId="circle-9" userId="user-1" currentUid="user-1" />,
    );

    expect(await findByText('Layla')).toBeTruthy();
    expect(getByText('Family owner')).toBeTruthy();
    expect(getByText('This is you')).toBeTruthy();
  });

  it('says so when the member is no longer in the circle', async () => {
    const { findByText, queryByText } = await render(
      <MemberDetailScreen circleId="circle-9" userId="user-gone" currentUid="user-1" />,
    );

    expect(await findByText('No longer a member')).toBeTruthy();
    expect(queryByText('This is you')).toBeFalsy();
  });
});
