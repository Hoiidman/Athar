import { useCallback, useEffect, useState } from 'react';

export function useInviteLinkFlow(
  code: string | null,
  signedIn: boolean,
  onUsed: () => void,
): { code: string | null; complete: () => void; dismiss: () => void } {
  const [showing, setShowing] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    if (code && !signedIn && code !== dismissed) setShowing(code);
  }, [code, signedIn, dismissed]);

  const complete = useCallback(() => {
    setShowing(null);
    onUsed();
  }, [onUsed]);

  const dismiss = useCallback(() => {
    setDismissed(showing);
    setShowing(null);
  }, [showing]);

  return { code: showing, complete, dismiss };
}
