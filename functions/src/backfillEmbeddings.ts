import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';
import { generateDescription, embedText } from './geminiEnrichment';
import { GEMINI_API_KEY } from './enrichMemory';

// One-off admin utility, not linked from the app. Processes existing photos
// that predate the enrichment trigger (or whose enrichment previously
// failed). Safe to re-run: it skips docs that already have an embedding, and
// re-running is also how a 'failed' item gets retried.
//
// Deploy, then trigger once with:
//   curl "https://<region>-athar-smac2026.cloudfunctions.net/backfillEmbeddings?token=<GEMINI_API_KEY value>"
export const backfillEmbeddings = onRequest(
  { secrets: [GEMINI_API_KEY], timeoutSeconds: 540 },
  async (req, res) => {
    if (req.query.token !== GEMINI_API_KEY.value()) {
      res.status(403).send('forbidden');
      return;
    }

    const db = getFirestore();
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });

    // Combining an equality filter with an 'in' filter on a different field
    // needs a composite index; if this hasn't been created yet, Firestore's
    // error will include a direct console link to create it.
    const snapshot = await db
      .collection('memories')
      .where('type', '==', 'photo')
      .where('aiStatus', 'in', ['pending', 'failed', 'not_applicable'])
      .get();

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    for (const docSnap of snapshot.docs) {
      const memory = docSnap.data();
      if (memory.embedding) {
        skipped++;
        continue;
      }

      try {
        const imgResponse = await fetch(memory.storageUrl as string);
        if (!imgResponse.ok) {
          throw new Error(`Failed to fetch image: ${imgResponse.status}`);
        }
        const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
        const mimeType = imgResponse.headers.get('content-type') ?? 'image/jpeg';

        const description = await generateDescription(ai, imgBuffer, mimeType);
        const embedding = await embedText(ai, description, 'RETRIEVAL_DOCUMENT');

        await docSnap.ref.update({
          aiStory: description,
          embedding: FieldValue.vector(embedding),
          aiStatus: 'success',
          updatedAt: FieldValue.serverTimestamp(),
        });
        processed++;
      } catch (err) {
        failed++;
        console.error(`Backfill failed for ${docSnap.id}`, err);
        await docSnap.ref
          .update({ aiStatus: 'failed', updatedAt: FieldValue.serverTimestamp() })
          .catch((updateErr) => console.error('Failed to write failure status', updateErr));
      }
    }

    res.json({ processed, failed, skipped, total: snapshot.size });
  },
);
