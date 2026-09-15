import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { GEMINI_API_KEY } from './enrichMemory';

const BATCH_LIMIT = 500; // Firestore's max writes per batch

// One-off admin utility, not linked from the app. firestore.rules now
// requires every memory doc to carry an `embedding` key (even if null) via
// hasAll() — the enrichment trigger and backfillEmbeddings only ever add a
// real value for photos, so any doc that predates this schema (and every
// video/voice doc, which never goes through enrichment at all) is otherwise
// permanently missing the key and fails any future update. This patches
// every such doc with `embedding: null` so updates work again; it does not
// generate real embeddings — run backfillEmbeddings for that.
//
// Deploy, then trigger once with:
//   curl "https://<region>-athar-smac2026.cloudfunctions.net/migrateEmbeddingField?token=<GEMINI_API_KEY value>"
export const migrateEmbeddingField = onRequest(
  { secrets: [GEMINI_API_KEY], timeoutSeconds: 540 },
  async (req, res) => {
    if (req.query.token !== GEMINI_API_KEY.value()) {
      res.status(403).send('forbidden');
      return;
    }

    const db = getFirestore();
    const snapshot = await db.collection('memories').get();

    const missing = snapshot.docs.filter((docSnap) => !('embedding' in docSnap.data()));

    let patched = 0;
    for (let i = 0; i < missing.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      for (const docSnap of missing.slice(i, i + BATCH_LIMIT)) {
        batch.update(docSnap.ref, { embedding: null });
      }
      await batch.commit();
      patched += Math.min(BATCH_LIMIT, missing.length - i);
    }

    res.json({ patched, total: snapshot.size });
  },
);
