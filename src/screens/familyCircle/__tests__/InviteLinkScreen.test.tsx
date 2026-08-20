import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { User } from 'firebase/auth';
import { signInAsGuest } from '../../../services/auth';
import { FamilyCircleError, joinFamilyCircle } from '../../../services/familyCircles';
import { InviteLinkScreen } from '../InviteLinkScreen';

jest.mock('../../../services/auth', () => ({ signInAsGuest: jest.fn() }));

jest.mock('../../../services/familyCircles', () => {
  class MockFamilyCircleError extends Error {
    code: string;

    constructor(errorCode: string) {
      super(errorCode);
      this.code = errorCode;
    }
  }
  return { joinFamilyCircle: jest.fn(), FamilyCircleError: MockFamilyCircleError };
});

const mockSignInAsGuest = signInAsGuest as jest.Mock;
const mockJoin = joinFamilyCircle as jest.Mock;

const guest = { uid: 'guest-1' } as User;
const onJoined = jest.fn();
const onUseAccount = jest.fn();
const onDismiss = jest.fn();

function renderScreen() {
  return render(
    <InviteLinkScreen
      code="K7M2P9XR"
      onJoined={onJoined}
      onUseAccount={onUseAccount}
      onDismiss={onDismiss}
    />,
  );
}

beforeEach(() => {
  mockSignInAsGuest.mockReset().mockResolvedValue({ user: guest });
  mockJoin.mockReset().mockResolvedValue('circle-9');
  onJoined.mockReset();
  onUseAccount.mockReset();
  onDismiss.mockReset();
});

describe('InviteLinkScreen', () => {
  it('signs in and joins with the code from the link in one press', async () => {
    const { getByRole, getByText } = await renderScreen();

    expect(getByText('K7M2P9XR')).toBeTruthy();

    await fireEvent.press(getByRole('button', { name: 'Join as guest' }));

    await waitFor(() => expect(mockJoin).toHaveBeenCalledWith(guest, 'K7M2P9XR'));
    expect(mockSignInAsGuest).toHaveBeenCalled();
    expect(onJoined).toHaveBeenCalled();
  });

  it('offers a way out of a code that no longer works', async () => {
    mockJoin.mockRejectedValue(new FamilyCircleError('code-not-found'));

    const { findByText, getByRole } = await renderScreen();

    await fireEvent.press(getByRole('button', { name: 'Join as guest' }));

    expect(
      await findByText('That invite is no longer valid. Ask your family for a new one.'),
    ).toBeTruthy();
    expect(onJoined).not.toHaveBeenCalled();

    await fireEvent.press(getByRole('button', { name: 'Continue without joining' }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('hands someone with an account back to signing in', async () => {
    const { getByRole } = await renderScreen();

    await fireEvent.press(getByRole('link', { name: 'I already have an account' }));

    expect(onUseAccount).toHaveBeenCalled();
    expect(mockSignInAsGuest).not.toHaveBeenCalled();
  });
});
