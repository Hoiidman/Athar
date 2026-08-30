import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { firestore } from '../services/firebase';
import type { Memory } from '../types/memory';

export type MySpaceMemoriesState =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'ready'; memories: Memory[] };

export function useMySpaceMemories(userId: string) {
  const [state, setState] = useState<MySpaceMemoriesState>({ status: 'loading' });

  useEffect(() => {
    setState({ status: 'loading' });

    const q = query(
      collection(firestore, 'memories'),
      where('uploadedBy', '==', userId),
      where('memoryGroupId', '==', 'my-space'),
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
        console.error('useMySpaceMemories snapshot error:', error);
        setState({ status: 'error', error });
      },
    );

    return () => unsubscribe();
  }, [userId]);

  return state;
}
