import { NavigationContainer } from '@react-navigation/native';
import { fireEvent, render } from '@testing-library/react-native';
import { signIn, signInAsGuest } from '../../../services/auth';
import { SignInScreen } from '../SignInScreen';

function renderScreen() {
  return render(
    <NavigationContainer>
      <SignInScreen />
    </NavigationContainer>,
  );
}

jest.mock('../../../services/auth', () => ({ signIn: jest.fn(), signInAsGuest: jest.fn() }));

const mockSignIn = signIn as jest.Mock;
const mockSignInAsGuest = signInAsGuest as jest.Mock;

beforeEach(() => {
  mockSignIn.mockReset();
  mockSignInAsGuest.mockReset();
});

describe('SignInScreen', () => {
  it('asks for the missing fields instead of submitting an empty form', async () => {
    const { getByRole, getByText } = await renderScreen();

    await fireEvent.press(getByRole('button', { name: 'Sign in' }));

    expect(getByText('Enter your email.')).toBeTruthy();
    expect(getByText('Enter your password.')).toBeTruthy();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('signs in with the trimmed email and the password as typed', async () => {
    mockSignIn.mockResolvedValue({});
    const { getByLabelText, getByRole } = await renderScreen();

    await fireEvent.changeText(getByLabelText('Email'), '  layla@example.com  ');
    await fireEvent.changeText(getByLabelText('Password'), ' secret123');
    await fireEvent.press(getByRole('button', { name: 'Sign in' }));

    expect(mockSignIn).toHaveBeenCalledWith('layla@example.com', ' secret123');
  });

  it('shows a readable message when Firebase rejects the credentials', async () => {
    mockSignIn.mockRejectedValue({ code: 'auth/invalid-credential' });
    const { findByText, getByLabelText, getByRole } = await renderScreen();

    await fireEvent.changeText(getByLabelText('Email'), 'layla@example.com');
    await fireEvent.changeText(getByLabelText('Password'), 'wrong');
    await fireEvent.press(getByRole('button', { name: 'Sign in' }));

    expect(await findByText('Email or password is incorrect.')).toBeTruthy();
  });

  it('signs in anonymously without requiring the form', async () => {
    mockSignInAsGuest.mockResolvedValue({});
    const { getByRole, queryByText } = await renderScreen();

    await fireEvent.press(getByRole('button', { name: 'Continue as guest' }));

    expect(mockSignInAsGuest).toHaveBeenCalled();
    expect(mockSignIn).not.toHaveBeenCalled();
    expect(queryByText('Enter your email.')).toBeFalsy();
  });

  it('explains when anonymous auth is turned off in the Firebase console', async () => {
    mockSignInAsGuest.mockRejectedValue({ code: 'auth/operation-not-allowed' });
    const { findByText, getByRole } = await renderScreen();

    await fireEvent.press(getByRole('button', { name: 'Continue as guest' }));

    expect(await findByText('Guest access is unavailable right now.')).toBeTruthy();
  });
});
