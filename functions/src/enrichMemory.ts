import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { FieldValue } from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';
import { generateDescription, embedText } from './geminiEnrichment';

export const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

export const enrichMemory = onDocumentCreated(
  { document: 'memories/{memoryId}', secrets: [GEMINI_API_KEY] },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const memory = snap.data();
    if (memory.type !== 'photo') return; // video/voice out of scope for MVP

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });

    try {
      const imgResponse = await fetch(memory.storageUrl as string);
      if (!imgResponse.ok) {
        throw new Error(`Failed to fetch image: ${imgResponse.status}`);
      }
      const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
      const mimeType = imgResponse.headers.get('content-type') ?? 'image/jpeg';

      const description = await generateDescription(ai, imgBuffer, mimeType);
      const embedding = await embedText(ai, description, 'RETRIEVAL_DOCUMENT');

      await snap.ref.update({
        aiStory: description,
        embedding: FieldValue.vector(embedding),
        aiStatus: 'success',
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error(`enrichMemory failed for ${event.params.memoryId}`, err);
      await snap.ref
        .update({ aiStatus: 'failed', updatedAt: FieldValue.serverTimestamp() })
        .catch((updateErr) => console.error('Failed to write failure status', updateErr));
    }
  },
);
