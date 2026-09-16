import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { FieldValue } from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';
import { hasAiPhotoAccess } from './aiPhotoAccess';
import { enrichPhotoMemory } from './geminiEnrichment';

export const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

export const enrichMemory = onDocumentCreated(
  { document: 'memories/{memoryId}', secrets: [GEMINI_API_KEY], timeoutSeconds: 120 },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const memory = snap.data();
    if (memory.type !== 'photo') return; // video/voice out of scope for MVP

    // Settling the status here rather than leaving it 'pending' keeps
    // retryStuckEnrichment from picking the photo up ten minutes later.
    if (!(await hasAiPhotoAccess(memory.uploadedBy))) {
      await snap.ref.update({
        aiStatus: 'not_applicable',
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
    await enrichPhotoMemory(ai, snap.ref, memory.storageUrl as string);
  },
);
