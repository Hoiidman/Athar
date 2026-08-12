import { fireEvent, render } from '@testing-library/react-native';
import type { User } from 'firebase/auth';
import { FamilyCircleError, createFamilyCircle } from '../../../services/familyCircles';
import { CreateFamilyCircleScreen } from '../CreateFamilyCircleScreen';

jest.mock('../../../services/familyCircles', () => {
  class MockFamilyCircleError extends Error {
    code: string;

    constructor(errorCode: string) {
      super(errorCode);
      this.code = errorCode;
    }
  }
  return { createFamilyCircle: jest.fn(), FamilyCircleError: MockFamilyCircleError };
});

const mockCreateFamilyCircle = createFamilyCircle as jest.Mock;
const user = { uid: 'user-1' } as User;

beforeEach(() => {
  mockCreateFamilyCircle.mockReset();
});

describe('CreateFamilyCircleScreen', () => {
  it('will not submit an unnamed circle', async () => {
    const { getByRole, getByText } = await render(<CreateFamilyCircleScreen user={user} />);

    await fireEvent.press(getByRole('button', { name: 'Create circle' }));

    expect(getByText('Enter a name for your circle.')).toBeTruthy();
    expect(mockCreateFamilyCircle).not.toHaveBeenCalled();
  });

  it('shows the invite code once the circle exists', async () => {
    mockCreateFamilyCircle.mockResolvedValue({ id: 'circle-1', inviteCode: 'K7M2P9XR' });
    const { findByText, getByLabelText, getByRole } = await render(
      <CreateFamilyCircleScreen user={user} />,
    );

    await fireEvent.changeText(getByLabelText('Circle name'), '  The Hennawis  ');
    await fireEvent.press(getByRole('button', { name: 'Create circle' }));

    expect(await findByText('K7M2P9XR')).toBeTruthy();
    expect(mockCreateFamilyCircle).toHaveBeenCalledWith(user, 'The Hennawis');
  });

  it('explains a failure instead of leaving the button spinning', async () => {
    mockCreateFamilyCircle.mockRejectedValue(new FamilyCircleError('code-generation-failed'));
    const { findByText, getByLabelText, getByRole } = await render(
      <CreateFamilyCircleScreen user={user} />,
    );

    await fireEvent.changeText(getByLabelText('Circle name'), 'The Hennawis');
    await fireEvent.press(getByRole('button', { name: 'Create circle' }));

    expect(await findByText('Could not generate an invite code. Please try again.')).toBeTruthy();
  });
});
