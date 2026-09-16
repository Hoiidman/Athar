import type { User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { firestore } from './firebase';

// Enrichment ran for everyone before this setting existed, so a user document
// without the field is read as consent rather than a silent opt-out.
export const DEFAULT_AI_PHOTO_ACCESS = true;

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
    aiPhotoAccessEnabled: DEFAULT_AI_PHOTO_ACCESS,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function setUserDisplayName(uid: string, displayName: string): Promise<void> {
  await updateDoc(doc(firestore, 'users', uid), { displayName, updatedAt: serverTimestamp() });
}

export function subscribeToAiPhotoAccess(
  uid: string,
  onChange: (enabled: boolean) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    doc(firestore, 'users', uid),
    (snapshot) => {
      const enabled = snapshot.data()?.aiPhotoAccessEnabled;
      onChange(typeof enabled === 'boolean' ? enabled : DEFAULT_AI_PHOTO_ACCESS);
    },
    onError,
  );
}

export async function setAiPhotoAccessEnabled(uid: string, enabled: boolean): Promise<void> {
  await updateDoc(doc(firestore, 'users', uid), {
    aiPhotoAccessEnabled: enabled,
    updatedAt: serverTimestamp(),
  });
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
