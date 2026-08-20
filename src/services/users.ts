import type { User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { firestore } from './firebase';

export function defaultDisplayName(user: User): string {
  if (user.displayName) return user.displayName;
  if (user.email) return user.email.split('@')[0] ?? 'Guest';
  return 'Guest';
}

export async function ensureUserDocument(user: User): Promise<void> {
  const ref = doc(firestore, 'users', user.uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) return;

  await setDoc(ref, {
    displayName: defaultDisplayName(user),
    photoUrl: user.photoURL,
    familyCircleId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function setUserDisplayName(uid: string, displayName: string): Promise<void> {
  await updateDoc(doc(firestore, 'users', uid), { displayName, updatedAt: serverTimestamp() });
}

export async function clearOwnFamilyCircleId(uid: string): Promise<void> {
  await updateDoc(doc(firestore, 'users', uid), {
    familyCircleId: null,
    updatedAt: serverTimestamp(),
  });
}

export async function getFamilyCircleId(uid: string): Promise<string | null> {
  const snapshot = await getDoc(doc(firestore, 'users', uid));
  if (!snapshot.exists()) return null;
  return (snapshot.data().familyCircleId as string | null) ?? null;
}
