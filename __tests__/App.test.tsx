import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from 'firebase/auth';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import App from '../App';
import { useAuth } from '../src/hooks/useAuth';
import { getFamilyCircleId } from '../src/services/users';

jest.mock('../src/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('../src/hooks/useEnsureUserDocument', () => ({ useEnsureUserDocument: jest.fn() }));
jest.mock('../src/services/users', () => ({ getFamilyCircleId: jest.fn() }));
jest.mock('../src/navigation/RootTabNavigator', () => {
  const { Text: RNText } = require('react-native');
  return { RootTabNavigator: () => <RNText>Capture screen</RNText> };
});
jest.mock('../src/navigation/AuthNavigator', () => {
  const { Text: RNText } = require('react-native');
  return { AuthNavigator: () => <RNText>Sign in</RNText> };
});
jest.mock('../src/services/familyCircles', () => {
  class FamilyCircleError extends Error {
    code: string;

    constructor(code: string) {
      super(code);
      this.code = code;
    }
  }

  return { FamilyCircleError, createFamilyCircle: jest.fn(), joinFamilyCircle: jest.fn() };
});

const mockUseAuth = useAuth as jest.Mock;
const mockGetFamilyCircleId = getFamilyCircleId as jest.Mock;

beforeEach(async () => {
  await AsyncStorage.clear();
  mockUseAuth.mockReset();
  mockGetFamilyCircleId.mockReset();
  mockUseAuth.mockReturnValue({ user: { uid: 'user-1' } as User, initializing: false });
});

describe('App routing on family circle membership', () => {
  it('opens straight into capture for someone already in a circle', async () => {
    mockGetFamilyCircleId.mockResolvedValue('circle-9');

    const { getByText, queryByText } = await render(<App />);

    await waitFor(() => expect(getByText('Capture screen')).toBeTruthy());
    expect(queryByText('Start a family circle')).toBeFalsy();
  });

  it('sends someone with no circle to onboarding', async () => {
    mockGetFamilyCircleId.mockResolvedValue(null);

    const { getByText, queryByText } = await render(<App />);

    await waitFor(() => expect(getByText('Start a family circle')).toBeTruthy());
    expect(queryByText('Capture screen')).toBeFalsy();
  });

  it('lets someone skip onboarding into the app, and remembers the choice', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'user-skip' } as User, initializing: false });
    mockGetFamilyCircleId.mockResolvedValue(null);

    const { getByRole, getByText } = await render(<App />);
    await waitFor(() => expect(getByText('Start a family circle')).toBeTruthy());

    await fireEvent.press(getByRole('button', { name: 'Skip for now' }));

    await waitFor(() => expect(getByText('Capture screen')).toBeTruthy());
    await waitFor(async () =>
      expect(await AsyncStorage.getItem('athar/circle-onboarding-skipped/user-skip')).toBe('true'),
    );
  });

  it('offers a retry instead of onboarding when membership cannot be read', async () => {
    mockGetFamilyCircleId.mockRejectedValueOnce(new Error('offline')).mockResolvedValue('circle-9');

    const { getByRole, getByText, queryByText } = await render(<App />);

    await waitFor(() =>
      expect(
        getByText('Could not check your family circle. Check your connection and try again.'),
      ).toBeTruthy(),
    );
    expect(queryByText('Start a family circle')).toBeFalsy();

    await fireEvent.press(getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(getByText('Capture screen')).toBeTruthy());
  });
});
