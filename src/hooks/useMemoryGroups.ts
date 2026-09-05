/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { firestore } from '../services/firebase';
import type { MemoryGroup } from '../types/memory';

export type MemoryGroupsState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; groups: MemoryGroup[] };

export function useMemoryGroups(circleId: string | null) {
  const [state, setState] = useState<MemoryGroupsState>({ status: 'loading' });

  useEffect(() => {
    if (!circleId) {
      setState({ status: 'ready', groups: [] });
      return;
    }

    setState({ status: 'loading' });

    const q = query(collection(firestore, 'memoryGroups'), where('familyCircleId', '==', circleId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const groups = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            familyCircleId: data.familyCircleId,
            title: data.title,
            category: data.category ?? undefined,
            icon: data.icon ?? null,
            startDate: data.startDate?.toMillis() ?? 0,
            endDate: data.endDate?.toMillis() ?? 0,
            memberIds: data.memberIds ?? [],
            coverPhotoUrl: data.coverPhotoUrl ?? null,
            createdBy: data.createdBy,
            createdAt: data.createdAt?.toMillis() ?? 0,
            updatedAt: data.updatedAt?.toMillis() ?? 0,
          } as MemoryGroup;
        });

        // Sort locally to avoid needing a composite index
        groups.sort((a, b) => b.createdAt - a.createdAt);

        setState({ status: 'ready', groups });
      },
      (error) => {
        console.error('useMemoryGroups snapshot error:', error);
        setState({ status: 'error' });
      },
    );

    return () => unsubscribe();
  }, [circleId]);

  return state;
}


