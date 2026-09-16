import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { GEMINI_API_KEY } from './enrichMemory';

const BATCH_LIMIT = 500; // Firestore's max writes per batch

// One-off admin utility, not linked from the app. Same reason as
// migrateEmbeddingField: firestore.rules now requires every memory doc to
// carry a `location` key (even if null) via hasAll(), but only new uploads
// (after the location field was added) ever set it — every pre-existing doc
// is otherwise permanently missing the key and fails any future update.
//
// Deploy, then trigger once with:
//   curl "https://<region>-athar-smac2026.cloudfunctions.net/migrateLocationField?token=<GEMINI_API_KEY value>"
export const migrateLocationField = onRequest(
  { secrets: [GEMINI_API_KEY], timeoutSeconds: 540 },
  async (req, res) => {
    if (req.query.token !== GEMINI_API_KEY.value()) {
      res.status(403).send('forbidden');
      return;
    }

    const db = getFirestore();
    const snapshot = await db.collection('memories').get();

    const missing = snapshot.docs.filter((docSnap) => !('location' in docSnap.data()));

    let patched = 0;
    for (let i = 0; i < missing.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      for (const docSnap of missing.slice(i, i + BATCH_LIMIT)) {
        batch.update(docSnap.ref, { location: null });
      }
      await batch.commit();
      patched += Math.min(BATCH_LIMIT, missing.length - i);
    }

    res.json({ patched, total: snapshot.size });
  },
);
