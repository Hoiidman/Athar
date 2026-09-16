/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react';
import { subscribeToAiPhotoAccess } from '../services/users';

export type AiPhotoAccessState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; enabled: boolean };

export function useAiPhotoAccess(uid: string | null) {
  const [state, setState] = useState<AiPhotoAccessState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!uid) {
      setState({ status: 'loading' });
      return;
    }

    setState({ status: 'loading' });

    const unsubscribe = subscribeToAiPhotoAccess(
      uid,
      (enabled) => setState({ status: 'ready', enabled }),
      (error) => {
        console.error('useAiPhotoAccess snapshot error:', error);
        setState({ status: 'error' });
      },
    );

    return () => unsubscribe();
  }, [uid, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { state, reload };
}
