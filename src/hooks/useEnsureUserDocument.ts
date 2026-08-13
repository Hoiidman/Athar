import type { User } from 'firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureUserDocument } from '../services/users';

export function useEnsureUserDocument(user: User | null) {
  const ensuredUid = useRef<string>(undefined);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!user || ensuredUid.current === user.uid) return;

    ensuredUid.current = user.uid;
    setFailed(false);

    ensureUserDocument(user).catch(() => {
      ensuredUid.current = undefined;
      setFailed(true);
    });
  }, [user, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { failed, retry };
}
