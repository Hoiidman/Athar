import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

function storageKey(uid: string) {
  return `athar/circle-onboarding-skipped/${uid}`;
}

export function useCircleOnboardingSkip(uid: string) {
  const [state, setState] = useState({ loading: true, skipped: false });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, skipped: false });

    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(storageKey(uid));
        if (!cancelled) setState({ loading: false, skipped: stored === 'true' });
      } catch {
        if (!cancelled) setState({ loading: false, skipped: false });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  const skip = useCallback(() => {
    setState({ loading: false, skipped: true });
    void AsyncStorage.setItem(storageKey(uid), 'true').catch(() => undefined);
  }, [uid]);

  return { ...state, skip };
}
