import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from 'firebase/auth';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import App from '../App';
import { useAuth } from '../src/hooks/useAuth';
import { useEnsureUserDocument } from '../src/hooks/useEnsureUserDocument';
import { getFamilyCircleId } from '../src/services/users';

jest.mock('../src/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('../src/hooks/useEnsureUserDocument', () => ({
  useEnsureUserDocument: jest.fn(() => ({ failed: false, retry: jest.fn() })),
}));
jest.mock('../src/services/users', () => ({ getFamilyCircleId: jest.fn() }));
jest.mock('../src/services/auth', () => ({ signInAsGuest: jest.fn() }));
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
const mockUseEnsureUserDocument = useEnsureUserDocument as jest.Mock;
const mockGetFamilyCircleId = getFamilyCircleId as jest.Mock;

beforeEach(async () => {
  await AsyncStorage.clear();
  mockUseAuth.mockReset();
  mockGetFamilyCircleId.mockReset();
  mockUseEnsureUserDocument.mockReturnValue({ failed: false, retry: jest.fn() });
  mockUseAuth.mockReturnValue({ user: { uid: 'user-1' } as User, initializing: false });
  jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
});

describe('App routing on family circle membership', () => {
  it('opens straight into capture for someone already in a circle', async () => {
    mockGetFamilyCircleId.mockResolvedValue('circle-9');

    const { getByText, queryByText } = await render(<App />);

    await waitFor(() => expect(getByText('Capture screen')).toBeTruthy());
    expect(queryByText('Start a family circle')).toBeFalsy();
  });

  it('sends someone with no circle to onboarding, with no way past it', async () => {
    mockGetFamilyCircleId.mockResolvedValue(null);

    const { getByText, queryByRole, queryByText } = await render(<App />);

    await waitFor(() => expect(getByText('Start a family circle')).toBeTruthy());
    expect(queryByText('Capture screen')).toBeFalsy();
    expect(queryByRole('button', { name: 'Skip for now' })).toBeFalsy();
  });

  it('surfaces a failed account setup instead of silently continuing', async () => {
    const retry = jest.fn();
    mockUseEnsureUserDocument.mockReturnValue({ failed: true, retry });
    mockGetFamilyCircleId.mockResolvedValue(null);

    const { getByRole, getByText, queryByText } = await render(<App />);

    await waitFor(() =>
      expect(getByText(/Could not finish setting up your account/)).toBeTruthy(),
    );
    expect(queryByText('Start a family circle')).toBeFalsy();

    await fireEvent.press(getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('takes an invite link past the sign-in screen', async () => {
    mockUseAuth.mockReturnValue({ user: null, initializing: false });
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue('athar://join/K7M2P9XR');

    const { findByRole, queryByText } = await render(<App />);

    expect(await findByRole('button', { name: 'Join as guest' })).toBeTruthy();
    expect(queryByText('Sign in')).toBeFalsy();
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
