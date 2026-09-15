import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';
import { enrichPhotoMemory } from './geminiEnrichment';
import { GEMINI_API_KEY } from './enrichMemory';

// Recovers memories stuck on aiStatus 'pending' — a Cloud Function timeout
// kills the instance before its own catch block can mark it 'failed'.
const STALE_AFTER_MS = 5 * 60 * 1000;

export const retryStuckEnrichment = onSchedule(
  { schedule: 'every 10 minutes', secrets: [GEMINI_API_KEY], timeoutSeconds: 300 },
  async () => {
    const db = getFirestore();
    const cutoff = Timestamp.fromMillis(Date.now() - STALE_AFTER_MS);

    const snapshot = await db
      .collection('memories')
      .where('type', '==', 'photo')
      .where('aiStatus', '==', 'pending')
      .where('createdAt', '<=', cutoff)
      .get();

    if (snapshot.empty) return;

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
    for (const docSnap of snapshot.docs) {
      const memory = docSnap.data();
      await enrichPhotoMemory(ai, docSnap.ref, memory.storageUrl as string);
    }
  },
);
