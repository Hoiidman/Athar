import { fireEvent, render } from '@testing-library/react-native';
import type { User } from 'firebase/auth';
import { FamilyCircleError, joinFamilyCircle } from '../../../services/familyCircles';
import { JoinFamilyCircleScreen } from '../JoinFamilyCircleScreen';

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

const mockJoinFamilyCircle = joinFamilyCircle as jest.Mock;
const user = { uid: 'user-1' } as User;

beforeEach(() => {
  mockJoinFamilyCircle.mockReset();
});

describe('JoinFamilyCircleScreen', () => {
  it('will not submit an empty code', async () => {
    const { getByRole, getByText } = await render(<JoinFamilyCircleScreen user={user} />);

    await fireEvent.press(getByRole('button', { name: 'Join circle' }));

    expect(getByText('Enter the invite code you were given.')).toBeTruthy();
    expect(mockJoinFamilyCircle).not.toHaveBeenCalled();
  });

  it('reports the circle it joined', async () => {
    mockJoinFamilyCircle.mockResolvedValue('circle-9');
    const onJoined = jest.fn();
    const { getByLabelText, getByRole } = await render(
      <JoinFamilyCircleScreen user={user} onJoined={onJoined} />,
    );

    await fireEvent.changeText(getByLabelText('Invite code'), 'k7m2-p9xr');
    await fireEvent.press(getByRole('button', { name: 'Join circle' }));

    expect(mockJoinFamilyCircle).toHaveBeenCalledWith(user, 'k7m2-p9xr');
    expect(onJoined).toHaveBeenCalledWith('circle-9');
  });

  it('distinguishes an unknown code from already belonging to a circle', async () => {
    mockJoinFamilyCircle.mockRejectedValueOnce(new FamilyCircleError('code-not-found'));
    const { findByText, getByLabelText, getByRole } = await render(
      <JoinFamilyCircleScreen user={user} />,
    );

    await fireEvent.changeText(getByLabelText('Invite code'), 'K7M2P9XR');
    await fireEvent.press(getByRole('button', { name: 'Join circle' }));
    expect(await findByText('That code does not match any family circle.')).toBeTruthy();

    mockJoinFamilyCircle.mockRejectedValueOnce(new FamilyCircleError('already-in-circle'));
    await fireEvent.press(getByRole('button', { name: 'Join circle' }));
    expect(await findByText('You already belong to a family circle.')).toBeTruthy();
  });

  it('joins with a code that arrived in a link, without it being typed', async () => {
    mockJoinFamilyCircle.mockResolvedValue('circle-9');
    const onJoined = jest.fn();
    const { getByLabelText, getByRole } = await render(
      <JoinFamilyCircleScreen user={user} initialCode="K7M2P9XR" onJoined={onJoined} />,
    );

    expect(getByLabelText('Invite code').props.value).toBe('K7M2P9XR');

    await fireEvent.press(getByRole('button', { name: 'Join circle' }));

    expect(mockJoinFamilyCircle).toHaveBeenCalledWith(user, 'K7M2P9XR');
    expect(onJoined).toHaveBeenCalledWith('circle-9');
  });
});
