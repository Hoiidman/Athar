import { doc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { User } from 'firebase/auth';
import { firestore, storage } from './firebase';

export async function moveMemoryToGroup(memoryId: string, targetGroupId: string) {
  const memoryRef = doc(firestore, 'memories', memoryId);

  await updateDoc(memoryRef, {
    memoryGroupId: targetGroupId,
    visibility: 'shared',
    updatedAt: serverTimestamp(),
  });
}

export async function uploadBatchedMemories(
  user: User,
  circleId: string,
  photos: {
    uri: string;
    groupId: string; // can be 'my-space'
    takenAtMs: number | null;
  }[],
  onProgress: (current: number, total: number) => void,
) {
  const memoriesColl = collection(firestore, 'memories');
  let current = 0;

  for (const photo of photos) {
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

    // 4. Create the Firestore document
    const isPrivate = photo.groupId === 'my-space';

    await addDoc(memoriesColl, {
      familyCircleId: circleId,
      memoryGroupId: photo.groupId,
      visibility: isPrivate ? 'private' : 'shared',
      type: 'photo',
      storageUrl: downloadUrl,
      thumbnailUrl: null,
      durationSeconds: null,
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

    current++;
    onProgress(current, photos.length);
  }
}
