import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { firestore } from '../services/firebase';
import type { Memory } from '../types/memory';

export type GroupMemoriesState =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'ready'; memories: Memory[] };

export function useGroupMemories(circleId: string | null, groupId: string | null) {
  const [state, setState] = useState<GroupMemoriesState>({ status: 'loading' });

  useEffect(() => {
    if (!circleId || !groupId) {
      setState({ status: 'ready', memories: [] });
      return;
    }

    setState({ status: 'loading' });

    const q = query(
      collection(firestore, 'memories'),
      where('familyCircleId', '==', circleId),
      where('memoryGroupId', '==', groupId),
      where('visibility', '==', 'shared')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const memories = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            familyCircleId: data.familyCircleId,
            memoryGroupId: data.memoryGroupId,
            visibility: data.visibility,
            type: data.type,
            storageUrl: data.storageUrl,
            thumbnailUrl: data.thumbnailUrl ?? null,
            durationSeconds: data.durationSeconds ?? null,
            takenAt: data.takenAt?.toMillis() ?? null,
            uploadedBy: data.uploadedBy,
            caption: data.caption ?? null,
            transcript: data.transcript ?? null,
            aiStory: data.aiStory ?? null,
            aiStatus: data.aiStatus ?? 'not_applicable',
            categorizationMethod: data.categorizationMethod ?? 'default',
            includeInSlideshow: data.includeInSlideshow ?? true,
            createdAt: data.createdAt?.toMillis() ?? 0,
            updatedAt: data.updatedAt?.toMillis() ?? 0,
          } as Memory;
        });

        // Sort locally to avoid needing a composite index in firestore.indexes.json
        memories.sort((a, b) => b.createdAt - a.createdAt);

        setState({ status: 'ready', memories });
      },
      (error) => {
        console.error('useGroupMemories snapshot error:', error);
        setState({ status: 'error', error });
      },
    );

    return () => unsubscribe();
  }, [circleId, groupId]);

  return state;
}
