import { fireEvent, render } from '@testing-library/react-native';
import { signOut } from '../../services/auth';
import { SignOutButton } from '../SignOutButton';

jest.mock('../../services/auth', () => ({ signOut: jest.fn() }));

const mockSignOut = signOut as jest.Mock;

beforeEach(() => {
  mockSignOut.mockReset();
});

describe('SignOutButton', () => {
  it('signs the user out when pressed', async () => {
    mockSignOut.mockResolvedValue(undefined);
    const { getByRole } = await render(<SignOutButton />);

    await fireEvent.press(getByRole('button', { name: 'Sign out' }));

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('reports a failed sign-out instead of leaving the button spinning', async () => {
    mockSignOut.mockRejectedValue(new Error('offline'));
    const { findByText, getByRole } = await render(<SignOutButton />);

    await fireEvent.press(getByRole('button', { name: 'Sign out' }));

    expect(await findByText('Could not sign out. Please try again.')).toBeTruthy();
  });
});
