/* eslint-disable react-hooks/set-state-in-effect, react-hooks/refs */
import { useCallback, useEffect, useRef, useState } from 'react';
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
  | { status: 'removed' }
  | { status: 'ready'; circle: FamilyCircleSummary; members: FamilyCircleMember[] };

function isPermissionDenied(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'permission-denied'
  );
}

export function useFamilyCircleOverview(circleId: string | null) {
  const [state, setState] = useState<FamilyCircleOverviewState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const keepVisible = useRef(false);

  useEffect(() => {
    if (!circleId) {
      setState({ status: 'missing' });
      setRefreshing(false);
      return;
    }

    let cancelled = false;
    if (!keepVisible.current) setState({ status: 'loading' });
    keepVisible.current = false;

    void (async () => {
      try {
        const [circle, members] = await Promise.all([
          getFamilyCircle(circleId),
          listFamilyCircleMembers(circleId),
        ]);
        if (cancelled) return;

        setState(circle ? { status: 'ready', circle, members } : { status: 'missing' });
      } catch (error) {
        if (cancelled) return;
        setState({ status: isPermissionDenied(error) ? 'removed' : 'error' });
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [circleId, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const refresh = useCallback(() => {
    keepVisible.current = true;
    setRefreshing(true);
    setAttempt((n) => n + 1);
  }, []);

  return { state, reload, refresh, refreshing };
}
