import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { setAiPhotoAccessEnabled, subscribeToAiPhotoAccess } from '../../../services/users';
import { PrivacySettingsScreen } from '../PrivacySettingsScreen';

jest.mock('../../../services/users', () => ({
  subscribeToAiPhotoAccess: jest.fn(),
  setAiPhotoAccessEnabled: jest.fn(),
}));

const mockSubscribe = subscribeToAiPhotoAccess as jest.Mock;
const mockSetEnabled = setAiPhotoAccessEnabled as jest.Mock;

const TOGGLE = 'Let AI read my photos';

function emits(enabled: boolean) {
  mockSubscribe.mockImplementation((_uid, onChange) => {
    onChange(enabled);
    return () => undefined;
  });
}

beforeEach(() => {
  mockSubscribe.mockReset();
  mockSetEnabled.mockReset().mockResolvedValue(undefined);
});

describe('PrivacySettingsScreen', () => {
  it('turns AI photo access off', async () => {
    emits(true);

    const { getByLabelText } = await render(<PrivacySettingsScreen uid="user-1" />);

    await waitFor(() => expect(getByLabelText(TOGGLE).props.value).toBe(true));
    await fireEvent(getByLabelText(TOGGLE), 'valueChange', false);

    await waitFor(() => expect(mockSetEnabled).toHaveBeenCalledWith('user-1', false));
  });

  it('reflects a preference that is already off', async () => {
    emits(false);

    const { getByLabelText } = await render(<PrivacySettingsScreen uid="user-1" />);

    await waitFor(() => expect(getByLabelText(TOGGLE).props.value).toBe(false));
  });

  it('reports a failed save without claiming the change stuck', async () => {
    emits(true);
    mockSetEnabled.mockRejectedValue(new Error('offline'));

    const { getByLabelText, getByRole } = await render(<PrivacySettingsScreen uid="user-1" />);

    await waitFor(() => expect(getByLabelText(TOGGLE)).toBeTruthy());
    await fireEvent(getByLabelText(TOGGLE), 'valueChange', false);

    await waitFor(() => expect(getByRole('alert')).toBeTruthy());
    expect(getByLabelText(TOGGLE).props.value).toBe(true);
  });

  it('offers a retry when the preference cannot be read', async () => {
    mockSubscribe.mockImplementation((_uid, _onChange, onError) => {
      onError(new Error('offline'));
      return () => undefined;
    });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const { getByRole, queryByLabelText } = await render(<PrivacySettingsScreen uid="user-1" />);

    await waitFor(() => expect(getByRole('button', { name: 'Try again' })).toBeTruthy());
    expect(queryByLabelText(TOGGLE)).toBeFalsy();
  });
});
