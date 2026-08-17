import { NavigationContainer } from '@react-navigation/native';
import type { User } from 'firebase/auth';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { getFamilyCircle, listFamilyCircleMembers } from '../../../services/familyCircles';
import { getFamilyCircleId } from '../../../services/users';
import { FamilyPulseScreen } from '../FamilyPulseScreen';

jest.mock('../../../services/auth', () => ({ signOut: jest.fn() }));
jest.mock('../../../services/users', () => ({ getFamilyCircleId: jest.fn() }));
jest.mock('../../../services/familyCircles', () => ({
  createFamilyCircle: jest.fn(),
  joinFamilyCircle: jest.fn(),
  getFamilyCircle: jest.fn(),
  listFamilyCircleMembers: jest.fn(),
  FamilyCircleError: class extends Error {},
}));

const mockGetFamilyCircleId = getFamilyCircleId as jest.Mock;
const mockGetFamilyCircle = getFamilyCircle as jest.Mock;
const mockListMembers = listFamilyCircleMembers as jest.Mock;
const user = { uid: 'user-1', isAnonymous: false } as User;

const circle = { id: 'circle-9', name: 'The Mohameds', inviteCode: 'K7M2P9XR' };
const members = [
  { userId: 'user-1', displayName: 'Ahmed', role: 'owner', inviteCodeUsed: null, joinedAt: 1 },
  { userId: 'user-2', displayName: 'Sara', role: 'member', inviteCodeUsed: 'K7M2P9XR', joinedAt: 2 },
];

function renderScreen(as: User = user) {
  return render(
    <NavigationContainer>
      <FamilyPulseScreen user={as} />
    </NavigationContainer>,
  );
}

beforeEach(() => {
  mockGetFamilyCircleId.mockReset();
  mockGetFamilyCircle.mockReset().mockResolvedValue(circle);
  mockListMembers.mockReset().mockResolvedValue(members);
});

describe('FamilyPulseScreen', () => {
  it('offers a way into circle setup when the user has none', async () => {
    mockGetFamilyCircleId.mockResolvedValue(null);

    const { getByRole, getByText, queryByRole } = await renderScreen();

    await waitFor(() =>
      expect(getByRole('button', { name: 'Create a circle, or join with a code' })).toBeTruthy(),
    );

    await fireEvent.press(getByRole('button', { name: 'Create a circle, or join with a code' }));

    expect(getByText('Start a family circle')).toBeTruthy();
    expect(queryByRole('button', { name: 'Skip for now' })).toBeFalsy();
  });

  it('offers a guest a way to save their account', async () => {
    mockGetFamilyCircleId.mockResolvedValue('circle-9');
    const guest = { uid: 'guest-1', isAnonymous: true } as User;

    const { getByRole } = await renderScreen(guest);

    await waitFor(() => expect(getByRole('button', { name: 'Add an email so you never lose your memories' })).toBeTruthy());
  });

  it('names the circle and counts its members when the user has one', async () => {
    mockGetFamilyCircleId.mockResolvedValue('circle-9');

    const { getByRole, getByText, queryByRole } = await renderScreen();

    await waitFor(() => expect(getByRole('button', { name: 'Members, 2 members' })).toBeTruthy());
    expect(getByText('The Mohameds')).toBeTruthy();
    expect(queryByRole('button', { name: 'Create a circle, or join with a code' })).toBeFalsy();
    expect(queryByRole('button', { name: 'Add an email so you never lose your memories' })).toBeFalsy();
  });

  it('offers a retry rather than the circle when it cannot be read', async () => {
    mockGetFamilyCircleId.mockResolvedValue('circle-9');
    mockGetFamilyCircle.mockRejectedValue(new Error('offline'));

    const { getByRole, queryByRole } = await renderScreen();

    await waitFor(() => expect(getByRole('button', { name: 'Try again' })).toBeTruthy());
    expect(queryByRole('button', { name: 'Members, 2 members' })).toBeFalsy();
  });
});
