import type { User } from 'firebase/auth';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { firestore } from './firebase';

export async function createMemoryGroup(
  user: User,
  familyCircleId: string,
  data: {
    title: string;
    startDate: number;
    endDate: number;
    memberIds: string[];
  },
) {
  // Ensure the creator is in the member list
  const members = new Set(data.memberIds);
  members.add(user.uid);

  const payload = {
    familyCircleId,
    title: data.title.trim(),
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    memberIds: Array.from(members),
    coverPhotoUrl: null,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const coll = collection(firestore, 'memoryGroups');
  const ref = await addDoc(coll, payload);
  return ref.id;
}
