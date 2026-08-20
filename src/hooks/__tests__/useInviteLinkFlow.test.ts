import { act, renderHook } from '@testing-library/react-native';
import { useInviteLinkFlow } from '../useInviteLinkFlow';

const onUsed = jest.fn();

beforeEach(() => {
  onUsed.mockReset();
});

describe('useInviteLinkFlow', () => {
  it('keeps the link screen up while the guest sign-in lands', async () => {
    const { result, rerender } = await renderHook(
      ({ signedIn }: { signedIn: boolean }) => useInviteLinkFlow('K7M2P9XR', signedIn, onUsed),
      { initialProps: { signedIn: false } },
    );

    expect(result.current.code).toBe('K7M2P9XR');

    await rerender({ signedIn: true });
    expect(result.current.code).toBe('K7M2P9XR');

    await act(async () => result.current.complete());
    expect(result.current.code).toBeNull();
    expect(onUsed).toHaveBeenCalled();
  });

  it('leaves a signed-in user on their own screens', async () => {
    const { result } = await renderHook(() => useInviteLinkFlow('K7M2P9XR', true, onUsed));

    expect(result.current.code).toBeNull();
  });

  it('does not come back once the code has been turned down', async () => {
    const { result } = await renderHook(() => useInviteLinkFlow('K7M2P9XR', false, onUsed));

    await act(async () => result.current.dismiss());

    expect(result.current.code).toBeNull();
    expect(onUsed).not.toHaveBeenCalled();
  });
});
