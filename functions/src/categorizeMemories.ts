import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_API_KEY } from './enrichMemory';

const VALID_CATEGORIES = ['vacation', 'event', 'holiday', 'other'];
const MAX_MEMORIES_PER_CALL = 100;

interface CategorizeRequest {
  familyCircleId: string;
  memoryIds: string[];
}

interface ExistingGroup {
  id: string;
  title: string;
  category?: string;
  startDate: number;
  endDate: number;
}

interface Candidate {
  id: string;
  aiStory: string;
  takenAt: number | null;
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

// Groups whose [startDate, endDate] day-range contains the photo's day.
// Mirrors src/utils/autoCategorization.ts's matchGroupsByDate, duplicated
// here since functions/ is a separate TS project from the app.
function matchGroupsByDate(groups: ExistingGroup[], takenAtMs: number): string[] {
  const day = startOfDay(takenAtMs);
  return groups
    .filter((g) => day >= startOfDay(g.startDate) && day <= startOfDay(g.endDate))
    .map((g) => g.id);
}

const ASSIGNMENT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    assignments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          memoryId: { type: Type.STRING },
          action: { type: Type.STRING, enum: ['existing', 'new', 'skip'] },
          groupId: { type: Type.STRING },
          newGroupKey: { type: Type.STRING },
        },
        required: ['memoryId', 'action'],
      },
    },
    newGroups: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          key: { type: Type.STRING },
          title: { type: Type.STRING },
          category: { type: Type.STRING, enum: VALID_CATEGORIES },
        },
        required: ['key', 'title'],
      },
    },
  },
  required: ['assignments', 'newGroups'],
};

interface LlmAssignment {
  memoryId: string;
  action: 'existing' | 'new' | 'skip';
  groupId?: string;
  newGroupKey?: string;
}
interface LlmNewGroup {
  key: string;
  title: string;
  category?: string;
}

async function classifyLeftovers(
  ai: GoogleGenAI,
  candidates: Candidate[],
  groups: ExistingGroup[],
): Promise<{ assignments: LlmAssignment[]; newGroups: LlmNewGroup[] }> {
  const prompt =
    'You are sorting family photos into albums. For each photo below, decide whether ' +
    "it belongs in one of the EXISTING albums, needs a brand-new album, or should be " +
    "skipped (only if its description is too vague to place anywhere).\n\n" +
    "Strong rule: prefer an existing album whenever it's a reasonable fit by date " +
    "and/or content — do NOT invent a new album if an existing one already covers " +
    'this occasion or timeframe. Only propose a new album when a cluster of photos ' +
    "clearly shares an occasion/theme that no existing album covers. Never create a " +
    "new album for a single unrelated photo unless it's a genuinely distinct event.\n\n" +
    `EXISTING ALBUMS:\n${JSON.stringify(
      groups.map((g) => ({
        id: g.id,
        title: g.title,
        category: g.category ?? null,
        dateRange: [
          new Date(g.startDate).toISOString().slice(0, 10),
          new Date(g.endDate).toISOString().slice(0, 10),
        ],
      })),
      null,
      2,
    )}\n\n` +
    `PHOTOS TO SORT:\n${JSON.stringify(
      candidates.map((c) => ({
        id: c.id,
        description: c.aiStory,
        takenOn: c.takenAt ? new Date(c.takenAt).toISOString().slice(0, 10) : 'unknown',
      })),
      null,
      2,
    )}\n\n` +
    'Every photo id must appear exactly once in "assignments". For action "existing", ' +
    'set groupId to one of the existing album ids above. For action "new", set ' +
    'newGroupKey to a short key you invent and declare that key once in "newGroups" ' +
    'with a title (and category if it clearly fits vacation/event/holiday/other). ' +
    'Multiple photos sharing a newGroupKey land in the same new album.';

  const result = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { responseMimeType: 'application/json', responseSchema: ASSIGNMENT_SCHEMA },
  });

  const text = result.text?.trim();
  if (!text) throw new Error('Empty categorization response from Gemini');
  const parsed = JSON.parse(text) as { assignments: LlmAssignment[]; newGroups: LlmNewGroup[] };
  return {
    assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
    newGroups: Array.isArray(parsed.newGroups) ? parsed.newGroups : [],
  };
}

export const categorizeMemories = onCall<CategorizeRequest>(
  { secrets: [GEMINI_API_KEY] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }
    const uid = request.auth.uid;
    const { familyCircleId, memoryIds } = request.data;
    if (!familyCircleId || !Array.isArray(memoryIds) || memoryIds.length === 0) {
      throw new HttpsError('invalid-argument', 'familyCircleId and memoryIds are required.');
    }

    const db = getFirestore();
    const memberDoc = await db.doc(`familyCircles/${familyCircleId}/members/${uid}`).get();
    if (!memberDoc.exists) {
      throw new HttpsError('permission-denied', 'Not a member of this circle.');
    }

    const ids = memoryIds.slice(0, MAX_MEMORIES_PER_CALL);
    const memoryRefs = ids.map((id) => db.doc(`memories/${id}`));
    const memoryDocs = await db.getAll(...memoryRefs);

    const groupsSnap = await db
      .collection('memoryGroups')
      .where('familyCircleId', '==', familyCircleId)
      .get();
    const groups: ExistingGroup[] = groupsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title,
        category: data.category,
        startDate: (data.startDate as Timestamp).toMillis(),
        endDate: (data.endDate as Timestamp).toMillis(),
      };
    });

    let skipped = 0;
    const deterministic = new Map<string, string>(); // memoryId -> groupId
    const leftovers: Candidate[] = [];

    for (const snap of memoryDocs) {
      const data = snap.data();
      if (
        !snap.exists ||
        !data ||
        data.familyCircleId !== familyCircleId ||
        data.uploadedBy !== uid ||
        data.type !== 'photo' ||
        data.memoryGroupId !== 'my-space'
      ) {
        skipped++;
        continue;
      }
      if (data.aiStatus !== 'success' || !data.aiStory) {
        skipped++;
        continue;
      }

      const takenAtMs = data.takenAt ? (data.takenAt as Timestamp).toMillis() : null;
      const dateMatches = takenAtMs ? matchGroupsByDate(groups, takenAtMs) : [];

      if (dateMatches.length === 1 && dateMatches[0]) {
        deterministic.set(snap.id, dateMatches[0]);
      } else {
        leftovers.push({ id: snap.id, aiStory: data.aiStory as string, takenAt: takenAtMs });
      }
    }

    const finalAssignments = new Map<string, string>(deterministic);
    let newGroupsCreated = 0;

    if (leftovers.length > 0) {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
      const { assignments, newGroups } = await classifyLeftovers(ai, leftovers, groups);

      const leftoverIds = new Set(leftovers.map((c) => c.id));
      const existingGroupIds = new Set(groups.map((g) => g.id));
      const declaredNewGroups = new Map(newGroups.map((g) => [g.key, g]));

      // Only materialize a new group once something actually resolves to it.
      const usedNewGroupKeys = new Set(
        assignments
          .filter((a) => a.action === 'new' && a.newGroupKey && declaredNewGroups.has(a.newGroupKey))
          .map((a) => a.newGroupKey as string),
      );

      const newGroupIdByKey = new Map<string, string>();
      for (const key of usedNewGroupKeys) {
        const decl = declaredNewGroups.get(key);
        if (!decl) continue;

        const memberPhotos = assignments.filter(
          (a) => a.action === 'new' && a.newGroupKey === key && leftoverIds.has(a.memoryId),
        );
        const dates = memberPhotos
          .map((a) => leftovers.find((c) => c.id === a.memoryId)?.takenAt)
          .filter((ms): ms is number => ms != null);
        const startMs = dates.length ? Math.min(...dates) : Date.now();
        const endMs = dates.length ? Math.max(...dates) : Date.now();

        const category = decl.category && VALID_CATEGORIES.includes(decl.category)
          ? decl.category
          : undefined;
        const title = (decl.title || 'New Album').trim().slice(0, 80) || 'New Album';

        const payload: Record<string, unknown> = {
          familyCircleId,
          title,
          startDate: Timestamp.fromMillis(startMs),
          endDate: Timestamp.fromMillis(endMs),
          memberIds: [uid],
          coverPhotoUrl: null,
          createdBy: uid,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (category) payload.category = category;

        const ref = await db.collection('memoryGroups').add(payload);
        newGroupIdByKey.set(key, ref.id);
        newGroupsCreated++;
      }

      for (const a of assignments) {
        if (!leftoverIds.has(a.memoryId)) continue;
        if (a.action === 'existing' && a.groupId && existingGroupIds.has(a.groupId)) {
          finalAssignments.set(a.memoryId, a.groupId);
        } else if (a.action === 'new' && a.newGroupKey && newGroupIdByKey.has(a.newGroupKey)) {
          finalAssignments.set(a.memoryId, newGroupIdByKey.get(a.newGroupKey) as string);
        } else {
          skipped++;
        }
      }

      for (const c of leftovers) {
        if (!finalAssignments.has(c.id)) skipped++;
      }
    }

    if (finalAssignments.size > 0) {
      const batch = db.batch();
      for (const [memoryId, groupId] of finalAssignments) {
        batch.update(db.doc(`memories/${memoryId}`), {
          memoryGroupId: groupId,
          visibility: 'shared',
          categorizationMethod: 'auto',
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    }

    return {
      assigned: finalAssignments.size,
      newGroupsCreated,
      skipped,
    };
  },
);
