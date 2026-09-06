import type { User } from 'firebase/auth';
import { addDoc, collection, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { firestore } from './firebase';

export async function createMemoryGroup(
  user: User,
  familyCircleId: string,
  data: {
    title: string;
    category?: string;
    icon?: string;
    startDate: number;
    endDate: number;
    memberIds: string[];
  },
) {
  // Ensure the creator is in the member list
  const members = new Set(data.memberIds);
  members.add(user.uid);

  const payload: any = {
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

  if (data.icon) { payload.icon = data.icon; }

  if (data.category) {
    payload.category = data.category;
  }

  const coll = collection(firestore, 'memoryGroups');
  const ref = await addDoc(coll, payload);
  return ref.id;
}


export async function updateMemoryGroup(
  groupId: string,
  data: {
    title: string;
    category?: string;
    icon?: string;
    startDate: number;
    endDate: number;
    memberIds: string[];
  },
) {
  const payload: any = {
    title: data.title.trim(),
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    memberIds: data.memberIds,
    updatedAt: serverTimestamp(),
  };

  if (data.icon) payload.icon = data.icon;
  else payload.icon = null;

  if (data.category) payload.category = data.category;
  else payload.category = null;

  await updateDoc(doc(firestore, 'memoryGroups', groupId), payload);
}
