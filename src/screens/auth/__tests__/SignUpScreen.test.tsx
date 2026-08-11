import { NavigationContainer } from '@react-navigation/native';
import { fireEvent, render } from '@testing-library/react-native';
import { signUp } from '../../../services/auth';
import { SignUpScreen } from '../SignUpScreen';

function renderScreen() {
  return render(
    <NavigationContainer>
      <SignUpScreen />
    </NavigationContainer>,
  );
}

jest.mock('../../../services/auth', () => ({ signUp: jest.fn() }));

const mockSignUp = signUp as jest.Mock;

beforeEach(() => {
  mockSignUp.mockReset();
});

describe('SignUpScreen', () => {
  it('asks for the missing fields instead of submitting an empty form', async () => {
    const { getByRole, getByText } = await renderScreen();

    await fireEvent.press(getByRole('button', { name: 'Create account' }));

    expect(getByText('Enter your email.')).toBeTruthy();
    expect(getByText('Use at least 6 characters.')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('rejects a confirmation that does not match the password', async () => {
    const { getByLabelText, getByRole, getByText } = await renderScreen();

    await fireEvent.changeText(getByLabelText('Email'), 'layla@example.com');
    await fireEvent.changeText(getByLabelText('Password'), 'secret123');
    await fireEvent.changeText(getByLabelText('Confirm password'), 'different123');
    await fireEvent.press(getByRole('button', { name: 'Create account' }));

    expect(getByText('Passwords don’t match.')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('signs up with the trimmed email once the form is valid', async () => {
    mockSignUp.mockResolvedValue({});
    const { getByLabelText, getByRole } = await renderScreen();

    await fireEvent.changeText(getByLabelText('Email'), '  layla@example.com  ');
    await fireEvent.changeText(getByLabelText('Password'), 'secret123');
    await fireEvent.changeText(getByLabelText('Confirm password'), 'secret123');
    await fireEvent.press(getByRole('button', { name: 'Create account' }));

    expect(mockSignUp).toHaveBeenCalledWith('layla@example.com', 'secret123');
  });

  it('shows a readable message when the email is already registered', async () => {
    mockSignUp.mockRejectedValue({ code: 'auth/email-already-in-use' });
    const { findByText, getByLabelText, getByRole } = await renderScreen();

    await fireEvent.changeText(getByLabelText('Email'), 'layla@example.com');
    await fireEvent.changeText(getByLabelText('Password'), 'secret123');
    await fireEvent.changeText(getByLabelText('Confirm password'), 'secret123');
    await fireEvent.press(getByRole('button', { name: 'Create account' }));

    expect(await findByText('An account with this email already exists.')).toBeTruthy();
  });
});
