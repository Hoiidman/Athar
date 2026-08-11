import type { User } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import { ensureUserDocument } from '../services/users';

export function useEnsureUserDocument(user: User | null) {
  const ensuredUid = useRef<string>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user || ensuredUid.current === user.uid) return;

    ensuredUid.current = user.uid;
    setFailed(false);

    ensureUserDocument(user).catch(() => {
      ensuredUid.current = undefined;
      setFailed(true);
    });
  }, [user]);

  return { failed };
}
