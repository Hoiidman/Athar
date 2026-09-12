import { doc, updateDoc, deleteDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { User } from 'firebase/auth';
import { MY_SPACE_GROUP_ID } from '../types';
import { firestore, storage } from './firebase';

export async function moveMemoryToGroup(memoryId: string, targetGroupId: string) {
  const memoryRef = doc(firestore, 'memories', memoryId);

  await updateDoc(memoryRef, {
    memoryGroupId: targetGroupId,
    visibility: targetGroupId === MY_SPACE_GROUP_ID ? 'private' : 'shared',
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMemory(memoryId: string) {
  await deleteDoc(doc(firestore, 'memories', memoryId));
}

export async function replaceMemoryMedia(user: User, memoryId: string, uri: string) {
  const response = await fetch(uri);
  const blob = await response.blob();

  const fileExtension = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const uniqueId = Math.random().toString(36).substring(2, 15);
  const storagePath = `memories/${user.uid}/${uniqueId}.${fileExtension}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, blob);
  const downloadUrl = await getDownloadURL(storageRef);

  await updateDoc(doc(firestore, 'memories', memoryId), {
    storageUrl: downloadUrl,
    updatedAt: serverTimestamp(),
  });
}

export interface UploadablePhoto {
  uri: string;
  localThumbnailUri?: string;
  groupId: string; // can be 'my-space'
  takenAtMs: number | null;
  type: "photo" | "video" | "voice";
  durationSeconds?: number;
}

export interface BatchUploadResult {
  uploaded: number;
  failed: number;
  /** Created memory doc ids, in the same order as the input photos; null where upload failed. */
  ids: (string | null)[];
}

// Uploads run a few at a time. Sequentially, a few hundred photos takes long
// enough that people assume the app has hung; much higher and large videos
// start starving each other of bandwidth.
const UPLOAD_CONCURRENCY = 4;

async function uploadSingleMemory(user: User, circleId: string, photo: UploadablePhoto): Promise<string> {
  // 1. Fetch the file blob
  const response = await fetch(photo.uri);
  const blob = await response.blob();

  // 2. Generate a unique storage path
  const fileExtension = photo.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const uniqueId = Math.random().toString(36).substring(2, 15);
  const storagePath = `memories/${user.uid}/${uniqueId}.${fileExtension}`;
  const storageRef = ref(storage, storagePath);

  // 3. Upload to Firebase Storage
  await uploadBytes(storageRef, blob);
  const downloadUrl = await getDownloadURL(storageRef);

  let thumbnailUrl: string | null = null;
  if (photo.type === 'video' && photo.localThumbnailUri) {
    try {
      const thumbResponse = await fetch(photo.localThumbnailUri);
      const thumbBlob = await thumbResponse.blob();
      const thumbStoragePath = `memories/${user.uid}/thumb_${uniqueId}.jpg`;
      const thumbStorageRef = ref(storage, thumbStoragePath);
      await uploadBytes(thumbStorageRef, thumbBlob);
      thumbnailUrl = await getDownloadURL(thumbStorageRef);
    } catch (e) {
      console.warn("Failed to upload video thumbnail", e);
    }
  }

  // 4. Create the Firestore document
  const isPrivate = photo.groupId === MY_SPACE_GROUP_ID;

  const docRef = await addDoc(collection(firestore, 'memories'), {
    familyCircleId: circleId,
    memoryGroupId: photo.groupId,
    visibility: isPrivate ? 'private' : 'shared',
    type: photo.type,
    storageUrl: downloadUrl,
    thumbnailUrl: thumbnailUrl,
    durationSeconds: photo.durationSeconds ?? null,
    takenAt: photo.takenAtMs ? new Date(photo.takenAtMs) : null,
    uploadedBy: user.uid,
    caption: null,
    transcript: null,
    aiStory: null,
    aiStatus: 'not_applicable', // Auto-Categorization doesn't necessarily trigger AI unless specified
    categorizationMethod: 'auto',
    includeInSlideshow: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function uploadBatchedMemories(
  user: User,
  circleId: string,
  photos: UploadablePhoto[],
  onProgress: (current: number, total: number) => void,
): Promise<BatchUploadResult> {
  const total = photos.length;
  let current = 0;
  let failed = 0;
  const ids: (string | null)[] = new Array(total).fill(null);

  // A shared cursor lets each worker pull the next photo as soon as it frees
  // up, so one slow video doesn't hold back the rest of the batch.
  let next = 0;

  async function worker() {
    for (;;) {
      const index = next++;
      const photo = photos[index];
      if (!photo) return;

      try {
        ids[index] = await uploadSingleMemory(user, circleId, photo);
      } catch (e) {
        // One bad file shouldn't cost the user the whole batch.
        failed++;
        console.error(`Failed to upload memory ${index + 1}/${total}`, e);
      }

      current++;
      onProgress(current, total);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(UPLOAD_CONCURRENCY, total) }, () => worker()),
  );

  return { uploaded: total - failed, failed, ids };
}
