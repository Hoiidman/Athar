import { ApiError, GoogleGenAI } from '@google/genai';
import { FieldValue, type DocumentReference } from 'firebase-admin/firestore';

// Firestore's vector index supports at most 2048 dimensions; gemini-embedding-001
// defaults to 3072, so the reduced size must be requested explicitly. This value
// must stay in sync with the vector index definition in firestore.indexes.json
// and the queryVector dimensionality used in searchMemories.ts.
export const EMBEDDING_DIMENSION = 768;

const DESCRIPTION_PROMPT =
  'Describe only what is literally visible in this exact image, in one or two ' +
  'concise sentences — name concrete people, objects, setting, and any evident ' +
  'occasion. If any text appears anywhere in the image (a sign, banner, cake, ' +
  't-shirt, whiteboard, caption, etc.), transcribe it verbatim and include it, ' +
  "since a user may search for that exact text. If the image is blank, " +
  "solid-colored, too dark, or you can't make out its contents, say so plainly " +
  'instead of guessing. This caption is shown to the user as-is and matched ' +
  'against their search text, so it must describe this specific image only — ' +
  'never a generic or plausible-sounding guess.';

const RETRY_DELAYS_MS = [1000, 3000]; // 2 retries: fits well inside a 60s function timeout

// Only these are documented as supported for Gemini image understanding. A
// wrong or missing Content-Type on the stored file (common for blobs built
// from a React Native file:// fetch, which often don't carry one) otherwise
// gets forwarded as-is — Gemini can't decode it as an image and, rather than
// erroring, tends to answer the text prompt alone with a plausible-sounding
// but ungrounded caption.
const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
]);

function normalizeImageMimeType(mimeType: string): string {
  return SUPPORTED_IMAGE_MIME_TYPES.has(mimeType) ? mimeType : 'image/jpeg';
}

function isTransient(err: unknown): boolean {
  // 503 UNAVAILABLE ("high demand") and 429 RESOURCE_EXHAUSTED are the two
  // Gemini errors worth retrying — everything else (bad input, 404s) will
  // just fail the same way again.
  return err instanceof ApiError && (err.status === 503 || err.status === 429);
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const delay = RETRY_DELAYS_MS[attempt];
      if (!isTransient(err) || delay === undefined) throw err;
      console.warn(`Gemini call failed transiently, retrying in ${delay}ms`, err);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export async function generateDescription(
  ai: GoogleGenAI,
  imageBytes: Buffer,
  mimeType: string,
): Promise<string> {
  const result = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: DESCRIPTION_PROMPT },
            {
              inlineData: {
                data: imageBytes.toString('base64'),
                mimeType: normalizeImageMimeType(mimeType),
              },
            },
          ],
        },
      ],
    }),
  );

  const text = result.text?.trim();
  if (!text) throw new Error('Empty description from Gemini');
  return text;
}

export type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

export async function embedText(
  ai: GoogleGenAI,
  text: string,
  taskType: EmbeddingTaskType,
): Promise<number[]> {
  const result = await withRetry(() =>
    ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text,
      config: { taskType, outputDimensionality: EMBEDDING_DIMENSION },
    }),
  );

  const values = result.embeddings?.[0]?.values;
  if (!values) throw new Error('Empty embedding from Gemini');
  return values;
}

// Shared by enrichMemory, backfillEmbeddings, and retryStuckEnrichment.
export async function enrichPhotoMemory(
  ai: GoogleGenAI,
  ref: DocumentReference,
  storageUrl: string,
): Promise<boolean> {
  try {
    const imgResponse = await fetch(storageUrl);
    if (!imgResponse.ok) {
      throw new Error(`Failed to fetch image: ${imgResponse.status}`);
    }
    const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
    const mimeType = imgResponse.headers.get('content-type') ?? 'image/jpeg';

    const description = await generateDescription(ai, imgBuffer, mimeType);
    const embedding = await embedText(ai, description, 'RETRIEVAL_DOCUMENT');

    await ref.update({
      aiStory: description,
      embedding: FieldValue.vector(embedding),
      aiStatus: 'success',
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error(`Enrichment failed for ${ref.path}`, err);
    await ref
      .update({ aiStatus: 'failed', updatedAt: FieldValue.serverTimestamp() })
      .catch((updateErr) => console.error('Failed to write failure status', updateErr));
    return false;
  }
}
