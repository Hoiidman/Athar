import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';

const MEMBER = 'member-uid';
const OTHER_MEMBER = 'other-member-uid';
const STRANGER = 'stranger-uid';

const CIRCLE = 'circle-1';
const OTHER_CIRCLE = 'circle-2';
const GROUP = 'group-1';

const START = Timestamp.fromMillis(Date.UTC(2026, 6, 1));
const END = Timestamp.fromMillis(Date.UTC(2026, 6, 14));

let testEnv: RulesTestEnvironment;

function dbFor(uid?: string): Firestore {
  const context = uid ? testEnv.authenticatedContext(uid) : testEnv.unauthenticatedContext();
  return context.firestore() as unknown as Firestore;
}

function groupData(overrides: Record<string, unknown> = {}) {
  return {
    familyCircleId: CIRCLE,
    title: 'Spain Vacation',
    startDate: START,
    endDate: END,
    memberIds: [MEMBER, OTHER_MEMBER],
    coverPhotoUrl: null,
    createdBy: MEMBER,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

async function seedMembership() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore() as unknown as Firestore;
    for (const uid of [MEMBER, OTHER_MEMBER]) {
      await setDoc(doc(db, 'familyCircles', CIRCLE, 'members', uid), { userId: uid });
    }
    await setDoc(doc(db, 'familyCircles', OTHER_CIRCLE, 'members', STRANGER), {
      userId: STRANGER,
    });
  });
}

async function seedGroup(overrides: Record<string, unknown> = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore() as unknown as Firestore;
    await setDoc(doc(db, 'memoryGroups', GROUP), {
      ...groupData(overrides),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'athar-group-rules-test',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedMembership();
});

describe('creating a memory group', () => {
  it('lets a circle member create one', async () => {
    await assertSucceeds(setDoc(doc(dbFor(MEMBER), 'memoryGroups', GROUP), groupData()));
  });

  it('refuses someone who is not in the circle', async () => {
    await assertFails(setDoc(doc(dbFor(STRANGER), 'memoryGroups', GROUP), groupData()));
  });

  it('refuses a signed-out user', async () => {
    await assertFails(setDoc(doc(dbFor(), 'memoryGroups', GROUP), groupData()));
  });

  it('refuses claiming someone else created it', async () => {
    await assertFails(
      setDoc(doc(dbFor(MEMBER), 'memoryGroups', GROUP), groupData({ createdBy: OTHER_MEMBER })),
    );
  });

  it('refuses a creator who left themselves out of the group', async () => {
    await assertFails(
      setDoc(doc(dbFor(MEMBER), 'memoryGroups', GROUP), groupData({ memberIds: [OTHER_MEMBER] })),
    );
  });

  it('refuses an end date before its start', async () => {
    await assertFails(
      setDoc(doc(dbFor(MEMBER), 'memoryGroups', GROUP), groupData({ startDate: END, endDate: START })),
    );
  });

  it('refuses an empty title and an unrecognised field', async () => {
    await assertFails(setDoc(doc(dbFor(MEMBER), 'memoryGroups', GROUP), groupData({ title: '' })));
    await assertFails(
      setDoc(doc(dbFor(MEMBER), 'memoryGroups', GROUP), groupData({ pinned: true })),
    );
  });

  it('refuses a client-set timestamp in place of the server one', async () => {
    await assertFails(
      setDoc(doc(dbFor(MEMBER), 'memoryGroups', GROUP), groupData({ createdAt: Timestamp.now() })),
    );
  });
});

describe('reading memory groups', () => {
  it('lets any circle member read one, and refuses an outsider', async () => {
    await seedGroup();

    await assertSucceeds(getDoc(doc(dbFor(OTHER_MEMBER), 'memoryGroups', GROUP)));
    await assertFails(getDoc(doc(dbFor(STRANGER), 'memoryGroups', GROUP)));
  });

  it('allows a query narrowed to the circle, and refuses an unfiltered one', async () => {
    await seedGroup();

    const db = dbFor(MEMBER);
    await assertSucceeds(
      getDocs(query(collection(db, 'memoryGroups'), where('familyCircleId', '==', CIRCLE))),
    );
    await assertFails(getDocs(collection(db, 'memoryGroups')));
  });
});

describe('changing a memory group', () => {
  it('lets a member rename it', async () => {
    await seedGroup();

    await assertSucceeds(
      updateDoc(doc(dbFor(OTHER_MEMBER), 'memoryGroups', GROUP), {
        title: 'Spain, summer',
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('refuses moving it to another circle, or rewriting who made it', async () => {
    await seedGroup();
    const db = dbFor(MEMBER);

    await assertFails(
      updateDoc(doc(db, 'memoryGroups', GROUP), {
        familyCircleId: OTHER_CIRCLE,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(doc(db, 'memoryGroups', GROUP), {
        createdBy: STRANGER,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('refuses deleting it', async () => {
    await seedGroup();

    await assertFails(deleteDoc(doc(dbFor(MEMBER), 'memoryGroups', GROUP)));
  });
});
