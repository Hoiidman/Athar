import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { GoogleGenAI } from '@google/genai';
import { enrichPhotoMemory } from './geminiEnrichment';

export const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

export const enrichMemory = onDocumentCreated(
  { document: 'memories/{memoryId}', secrets: [GEMINI_API_KEY], timeoutSeconds: 120 },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const memory = snap.data();
    if (memory.type !== 'photo') return; // video/voice out of scope for MVP

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
    await enrichPhotoMemory(ai, snap.ref, memory.storageUrl as string);
  },
);
