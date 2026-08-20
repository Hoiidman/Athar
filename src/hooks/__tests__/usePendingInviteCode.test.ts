import { Linking } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { inviteCodeFromUrl, usePendingInviteCode } from '../usePendingInviteCode';

type UrlListener = (event: { url: string }) => void;

let listener: UrlListener | undefined;
const remove = jest.fn();

beforeEach(() => {
  listener = undefined;
  remove.mockReset();
  jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
  jest.spyOn(Linking, 'addEventListener').mockImplementation((_event, handler) => {
    listener = handler as UrlListener;
    return { remove } as unknown as ReturnType<typeof Linking.addEventListener>;
  });
});

afterEach(() => jest.restoreAllMocks());

describe('inviteCodeFromUrl', () => {
  it('reads a code from either link shape', () => {
    expect(inviteCodeFromUrl('athar://join/K7M2P9XR')).toBe('K7M2P9XR');
    expect(inviteCodeFromUrl('exp://192.168.1.4:8081/--/join/k7m2p9xr')).toBe('K7M2P9XR');
    expect(inviteCodeFromUrl('athar://join?code=K7M2P9XR')).toBe('K7M2P9XR');
  });

  it('refuses anything that is not a usable code', () => {
    expect(inviteCodeFromUrl('athar://join/SHORT')).toBeNull();
    expect(inviteCodeFromUrl('athar://join/K7M2P9X1')).toBeNull();
    expect(inviteCodeFromUrl('athar://circle/K7M2P9XR')).toBeNull();
    expect(inviteCodeFromUrl('athar://join/')).toBeNull();
  });
});

describe('usePendingInviteCode', () => {
  it('picks up a code the app was opened with', async () => {
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue('athar://join/K7M2P9XR');

    const { result } = await renderHook(() => usePendingInviteCode());

    await waitFor(() => expect(result.current.code).toBe('K7M2P9XR'));
  });

  it('picks up a code delivered while the app is already open, and forgets it on request', async () => {
    const { result } = await renderHook(() => usePendingInviteCode());

    expect(result.current.code).toBeNull();

    await act(async () => listener?.({ url: 'athar://join/K7M2P9XR' }));
    expect(result.current.code).toBe('K7M2P9XR');

    await act(async () => result.current.clear());
    expect(result.current.code).toBeNull();
  });

  it('ignores a link that carries no code', async () => {
    const { result } = await renderHook(() => usePendingInviteCode());

    await act(async () => listener?.({ url: 'athar://open' }));

    expect(result.current.code).toBeNull();
  });
});
