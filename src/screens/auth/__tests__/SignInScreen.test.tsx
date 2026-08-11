import { fireEvent, render } from '@testing-library/react-native';
import { signIn } from '../../../services/auth';
import { SignInScreen } from '../SignInScreen';

jest.mock('../../../services/auth', () => ({ signIn: jest.fn() }));

const mockSignIn = signIn as jest.Mock;

beforeEach(() => {
  mockSignIn.mockReset();
});

describe('SignInScreen', () => {
  it('asks for the missing fields instead of submitting an empty form', async () => {
    const { getByRole, getByText } = await render(<SignInScreen />);

    await fireEvent.press(getByRole('button', { name: 'Sign in' }));

    expect(getByText('Enter your email.')).toBeTruthy();
    expect(getByText('Enter your password.')).toBeTruthy();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('signs in with the trimmed email and the password as typed', async () => {
    mockSignIn.mockResolvedValue({});
    const { getByLabelText, getByRole } = await render(<SignInScreen />);

    await fireEvent.changeText(getByLabelText('Email'), '  layla@example.com  ');
    await fireEvent.changeText(getByLabelText('Password'), ' secret123');
    await fireEvent.press(getByRole('button', { name: 'Sign in' }));

    expect(mockSignIn).toHaveBeenCalledWith('layla@example.com', ' secret123');
  });

  it('shows a readable message when Firebase rejects the credentials', async () => {
    mockSignIn.mockRejectedValue({ code: 'auth/invalid-credential' });
    const { findByText, getByLabelText, getByRole } = await render(<SignInScreen />);

    await fireEvent.changeText(getByLabelText('Email'), 'layla@example.com');
    await fireEvent.changeText(getByLabelText('Password'), 'wrong');
    await fireEvent.press(getByRole('button', { name: 'Sign in' }));

    expect(await findByText('Email or password is incorrect.')).toBeTruthy();
  });
});
