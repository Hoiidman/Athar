import { getFirestore } from 'firebase-admin/firestore';

// Enrichment ran for everyone before this setting existed, so a user document
// without the field is read as consent rather than a silent opt-out.
export async function hasAiPhotoAccess(uid: unknown): Promise<boolean> {
  if (typeof uid !== 'string' || !uid) return true;
  const snap = await getFirestore().doc(`users/${uid}`).get();
  return snap.data()?.aiPhotoAccessEnabled !== false;
}
