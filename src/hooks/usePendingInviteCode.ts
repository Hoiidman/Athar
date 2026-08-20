import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { isValidInviteCode, normalizeInviteCode } from '../utils/inviteCode';

const CODE_IN_URL = /(?:\/join\/|[?&]code=)([^/?&#]+)/;

export function inviteCodeFromUrl(url: string): string | null {
  const match = CODE_IN_URL.exec(url);
  if (!match?.[1]) return null;

  const code = normalizeInviteCode(decodeURIComponent(match[1]));
  return isValidInviteCode(code) ? code : null;
}

export function usePendingInviteCode() {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void Linking.getInitialURL().then((url) => {
      if (cancelled || !url) return;
      const initial = inviteCodeFromUrl(url);
      if (initial) setCode(initial);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      const next = inviteCodeFromUrl(url);
      if (next) setCode(next);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  const clear = useCallback(() => setCode(null), []);

  return { code, clear };
}
