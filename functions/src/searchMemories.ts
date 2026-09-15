import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';
import { embedText } from './geminiEnrichment';
import { GEMINI_API_KEY } from './enrichMemory';

const RESULT_LIMIT = 8;
// Over-fetch before the privacy post-filter below, so a search doesn't come
// back with fewer than RESULT_LIMIT just because some of a circle's nearest
// matches happen to be another member's private items.
const CANDIDATE_LIMIT = 30;
// COSINE distance = 1 - similarity; drop anything below ~0.35 similarity.
// Starting point, not empirically tuned yet.
const MAX_DISTANCE = 0.65;

interface SearchRequest {
  query: string;
  familyCircleId: string;
}

interface MemoryDoc {
  visibility: 'private' | 'shared';
  uploadedBy: string;
  storageUrl: string;
  thumbnailUrl: string | null;
  type: 'photo' | 'video' | 'voice';
  aiStory: string | null;
  takenAt: FirebaseFirestore.Timestamp | null;
  memoryGroupId: string;
  __distance?: number;
}

export const searchMemories = onCall<SearchRequest>(
  { secrets: [GEMINI_API_KEY] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }

    const { query, familyCircleId } = request.data;
    if (!query?.trim() || !familyCircleId) {
      throw new HttpsError('invalid-argument', 'query and familyCircleId are required.');
    }

    const db = getFirestore();
    const uid = request.auth.uid;

    const memberDoc = await db
      .doc(`familyCircles/${familyCircleId}/members/${uid}`)
      .get();
    if (!memberDoc.exists) {
      throw new HttpsError('permission-denied', 'Not a member of this circle.');
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
    const queryEmbedding = await embedText(ai, query, 'RETRIEVAL_QUERY');

    const snapshot = await db
      .collection('memories')
      .where('familyCircleId', '==', familyCircleId)
      .findNearest({
        vectorField: 'embedding',
        queryVector: queryEmbedding,
        limit: CANDIDATE_LIMIT,
        distanceMeasure: 'COSINE',
        distanceResultField: '__distance',
        distanceThreshold: MAX_DISTANCE,
      })
      .get();

    const results = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as MemoryDoc) }))
      .filter((memory) => memory.visibility === 'shared' || memory.uploadedBy === uid)
      .slice(0, RESULT_LIMIT)
      .map((memory) => ({
        id: memory.id,
        storageUrl: memory.storageUrl,
        thumbnailUrl: memory.thumbnailUrl ?? null,
        type: memory.type,
        aiStory: memory.aiStory ?? null,
        takenAt: memory.takenAt?.toMillis?.() ?? null,
        memoryGroupId: memory.memoryGroupId,
        confidence: Math.round(Math.max(0, 1 - (memory.__distance ?? 1)) * 100),
      }));

    return { results };
  },
);
