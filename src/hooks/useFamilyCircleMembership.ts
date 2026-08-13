import type { User } from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';
import { getFamilyCircleId } from '../services/users';

type MembershipState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; circleId: string | null };

export function useFamilyCircleMembership(user: User | null) {
  const [state, setState] = useState<MembershipState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) {
      setState({ status: 'ready', circleId: null });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    void (async () => {
      try {
        const circleId = await getFamilyCircleId(uid);
        if (!cancelled) setState({ status: 'ready', circleId });
      } catch {
        // Deliberately distinct from `circleId: null`. A failed read must not
        // route an existing member into the create-circle flow, where creating
        // would then be refused because they already belong to one.
        if (!cancelled) setState({ status: 'error' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  // Create and join already know the id they produced, so adopting it directly
  // avoids a second read purely to learn what we were just told.
  const adoptCircle = useCallback((circleId: string) => {
    setState({ status: 'ready', circleId });
  }, []);

  return { state, retry, adoptCircle };
}
