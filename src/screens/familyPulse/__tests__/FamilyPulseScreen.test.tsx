import { NavigationContainer } from '@react-navigation/native';
import type { User } from 'firebase/auth';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { getFamilyCircleId } from '../../../services/users';
import { FamilyPulseScreen } from '../FamilyPulseScreen';

jest.mock('../../../services/auth', () => ({ signOut: jest.fn() }));
jest.mock('../../../services/users', () => ({ getFamilyCircleId: jest.fn() }));
jest.mock('../../../services/familyCircles', () => ({
  createFamilyCircle: jest.fn(),
  joinFamilyCircle: jest.fn(),
  listFamilyCircleMembers: jest.fn(),
  FamilyCircleError: class extends Error {},
}));

const mockGetFamilyCircleId = getFamilyCircleId as jest.Mock;
const user = { uid: 'user-1', isAnonymous: false } as User;

function renderScreen(as: User = user) {
  return render(
    <NavigationContainer>
      <FamilyPulseScreen user={as} />
    </NavigationContainer>,
  );
}

beforeEach(() => {
  mockGetFamilyCircleId.mockReset();
});

describe('FamilyPulseScreen', () => {
  it('offers a way into circle setup when the user has none', async () => {
    mockGetFamilyCircleId.mockResolvedValue(null);

    const { getByRole, getByText, queryByRole } = await renderScreen();

    await waitFor(() =>
      expect(getByRole('button', { name: 'Create or join a circle' })).toBeTruthy(),
    );

    await fireEvent.press(getByRole('button', { name: 'Create or join a circle' }));

    expect(getByText('Start a family circle')).toBeTruthy();
    expect(queryByRole('button', { name: 'Skip for now' })).toBeFalsy();
  });

  it('offers a guest a way to save their account', async () => {
    mockGetFamilyCircleId.mockResolvedValue('circle-9');
    const guest = { uid: 'guest-1', isAnonymous: true } as User;

    const { getByRole } = await renderScreen(guest);

    await waitFor(() => expect(getByRole('button', { name: 'Save your account' })).toBeTruthy());
  });

  it('offers the circle screen when the user already has a circle', async () => {
    mockGetFamilyCircleId.mockResolvedValue('circle-9');

    const { getByRole, queryByRole } = await renderScreen();

    await waitFor(() => expect(getByRole('button', { name: 'Your circle' })).toBeTruthy());
    expect(queryByRole('button', { name: 'Create or join a circle' })).toBeFalsy();
    expect(queryByRole('button', { name: 'Save your account' })).toBeFalsy();
  });
});
