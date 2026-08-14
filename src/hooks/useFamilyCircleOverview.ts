import { useCallback, useEffect, useState } from 'react';
import {
  getFamilyCircle,
  listFamilyCircleMembers,
  type FamilyCircleSummary,
} from '../services/familyCircles';
import type { FamilyCircleMember } from '../types/familyCircle';

export type FamilyCircleOverviewState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'missing' }
  | { status: 'ready'; circle: FamilyCircleSummary; members: FamilyCircleMember[] };

export function useFamilyCircleOverview(circleId: string | null) {
  const [state, setState] = useState<FamilyCircleOverviewState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!circleId) {
      setState({ status: 'missing' });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    void (async () => {
      try {
        const [circle, members] = await Promise.all([
          getFamilyCircle(circleId),
          listFamilyCircleMembers(circleId),
        ]);
        if (cancelled) return;

        setState(circle ? { status: 'ready', circle, members } : { status: 'missing' });
      } catch {
        if (!cancelled) setState({ status: 'error' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [circleId, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { state, reload };
}
