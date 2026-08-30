import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from './firebase';

export async function moveMemoryToGroup(memoryId: string, targetGroupId: string) {
  const memoryRef = doc(firestore, 'memories', memoryId);

  await updateDoc(memoryRef, {
    memoryGroupId: targetGroupId,
    visibility: 'shared',
    updatedAt: serverTimestamp(),
  });
}
