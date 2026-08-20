import type { User } from 'firebase/auth';
import { upgradeGuestAccount } from '../accountUpgrade';
import { linkGuestAccount } from '../auth';
import { setMemberDisplayName } from '../familyCircles';
import { getFamilyCircleId, setUserDisplayName } from '../users';

jest.mock('../auth', () => ({ linkGuestAccount: jest.fn() }));
jest.mock('../familyCircles', () => ({ setMemberDisplayName: jest.fn() }));
jest.mock('../users', () => ({
  defaultDisplayName: (user: { email: string | null }) => user.email?.split('@')[0] ?? 'Guest',
  getFamilyCircleId: jest.fn(),
  setUserDisplayName: jest.fn(),
}));

const mockLink = linkGuestAccount as jest.Mock;
const mockGetFamilyCircleId = getFamilyCircleId as jest.Mock;
const mockSetUserDisplayName = setUserDisplayName as jest.Mock;
const mockSetMemberDisplayName = setMemberDisplayName as jest.Mock;

const guest = { uid: 'guest-1', displayName: null, email: null } as unknown as User;

beforeEach(() => {
  jest.clearAllMocks();
  mockLink.mockResolvedValue({
    user: { uid: 'guest-1', displayName: null, email: 'layla@example.com' },
  });
  mockGetFamilyCircleId.mockResolvedValue('circle-9');
});

describe('upgradeGuestAccount', () => {
  it('replaces the guest name everywhere it was denormalized', async () => {
    await upgradeGuestAccount(guest, 'layla@example.com', 'password123');

    expect(mockLink).toHaveBeenCalledWith(guest, 'layla@example.com', 'password123');
    expect(mockSetUserDisplayName).toHaveBeenCalledWith('guest-1', 'layla');
    expect(mockSetMemberDisplayName).toHaveBeenCalledWith('circle-9', 'guest-1', 'layla');
  });

  it('still counts as upgraded when the rename fails', async () => {
    mockSetUserDisplayName.mockRejectedValue(new Error('permission-denied'));

    await expect(
      upgradeGuestAccount(guest, 'layla@example.com', 'password123'),
    ).resolves.toBeUndefined();
  });

  it('skips the member write for someone with no circle', async () => {
    mockGetFamilyCircleId.mockResolvedValue(null);

    await upgradeGuestAccount(guest, 'layla@example.com', 'password123');

    expect(mockSetUserDisplayName).toHaveBeenCalled();
    expect(mockSetMemberDisplayName).not.toHaveBeenCalled();
  });
});
