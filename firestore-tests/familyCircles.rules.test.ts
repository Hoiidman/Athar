import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';

const OWNER = 'owner-uid';
const JOINER = 'joiner-uid';
const STRANGER = 'stranger-uid';

const CIRCLE = 'circle-1';
const CODE = 'K7M2P9XR';

let testEnv: RulesTestEnvironment;

function dbFor(uid?: string): Firestore {
  const context = uid ? testEnv.authenticatedContext(uid) : testEnv.unauthenticatedContext();
  return context.firestore() as unknown as Firestore;
}

function circleData(overrides: Record<string, unknown> = {}) {
  return {
    name: 'The Hennawis',
    inviteCode: CODE,
    ownerId: OWNER,
    memberIds: [OWNER],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

function memberData(overrides: Record<string, unknown> = {}) {
  return {
    userId: OWNER,
    displayName: 'Owner',
    role: 'owner',
    inviteCodeUsed: null,
    joinedAt: serverTimestamp(),
    ...overrides,
  };
}

function inviteCodeData(overrides: Record<string, unknown> = {}) {
  return {
    familyCircleId: CIRCLE,
    createdBy: OWNER,
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

function createCircleBatch(db: Firestore, uid: string, circleId: string, code: string) {
  const batch = writeBatch(db);
  batch.set(
    doc(db, 'familyCircles', circleId),
    circleData({ ownerId: uid, memberIds: [uid], inviteCode: code }),
  );
  batch.set(
    doc(db, 'familyCircles', circleId, 'members', uid),
    memberData({ userId: uid, displayName: 'Owner' }),
  );
  batch.set(
    doc(db, 'inviteCodes', code),
    inviteCodeData({ familyCircleId: circleId, createdBy: uid }),
  );
  return batch;
}

async function seedCircle() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore() as unknown as Firestore;
    await setDoc(doc(db, 'familyCircles', CIRCLE), circleData());
    await setDoc(doc(db, 'familyCircles', CIRCLE, 'members', OWNER), memberData());
    await setDoc(doc(db, 'inviteCodes', CODE), inviteCodeData());
  });
}

async function addMember(uid: string) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore() as unknown as Firestore;
    await setDoc(
      doc(db, 'familyCircles', CIRCLE, 'members', uid),
      memberData({ userId: uid, role: 'member', inviteCodeUsed: CODE }),
    );
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'athar-circle-rules-test',
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
});

describe('creating a family circle', () => {
  it('lets a signed-in user create a circle, owner member doc and code atomically', async () => {
    await assertSucceeds(createCircleBatch(dbFor(OWNER), OWNER, CIRCLE, CODE).commit());
  });

  it('refuses a signed-out user', async () => {
    await assertFails(createCircleBatch(dbFor(), OWNER, CIRCLE, CODE).commit());
  });

  it('refuses creating a circle owned by someone else', async () => {
    await assertFails(createCircleBatch(dbFor(JOINER), OWNER, CIRCLE, CODE).commit());
  });

  it('refuses a circle whose memberIds does not start as just the owner', async () => {
    const db = dbFor(OWNER);

    await assertFails(
      setDoc(doc(db, 'familyCircles', CIRCLE), circleData({ memberIds: [OWNER, JOINER] })),
    );
  });

  it('refuses a circle created without the owner member doc alongside it', async () => {
    const db = dbFor(OWNER);

    await assertFails(setDoc(doc(db, 'familyCircles', CIRCLE), circleData()));
  });
});

describe('reading a family circle', () => {
  it('lets a member read the circle and its member list', async () => {
    await seedCircle();
    const db = dbFor(OWNER);

    await assertSucceeds(getDoc(doc(db, 'familyCircles', CIRCLE)));
    await assertSucceeds(getDocs(collection(db, 'familyCircles', CIRCLE, 'members')));
  });

  it('refuses a non-member', async () => {
    await seedCircle();
    const db = dbFor(STRANGER);

    await assertFails(getDoc(doc(db, 'familyCircles', CIRCLE)));
    await assertFails(getDocs(collection(db, 'familyCircles', CIRCLE, 'members')));
  });

  it('refuses listing all circles', async () => {
    await seedCircle();

    await assertFails(getDocs(collection(dbFor(OWNER), 'familyCircles')));
  });
});

describe('modifying a family circle', () => {
  it('lets the owner rename the circle', async () => {
    await seedCircle();
    const db = dbFor(OWNER);

    await assertSucceeds(
      updateDoc(doc(db, 'familyCircles', CIRCLE), {
        name: 'The Hennawi Family',
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('refuses a rename by a non-owner member', async () => {
    await seedCircle();
    await addMember(JOINER);
    const db = dbFor(JOINER);

    await assertFails(
      updateDoc(doc(db, 'familyCircles', CIRCLE), {
        name: 'Hijacked',
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('refuses transferring ownership', async () => {
    await seedCircle();
    const db = dbFor(OWNER);

    await assertFails(
      updateDoc(doc(db, 'familyCircles', CIRCLE), {
        ownerId: JOINER,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('refuses changing the invite code after creation', async () => {
    await seedCircle();
    const db = dbFor(OWNER);

    await assertFails(
      updateDoc(doc(db, 'familyCircles', CIRCLE), {
        inviteCode: 'NEWCODE2',
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('refuses deleting the circle', async () => {
    await seedCircle();

    await assertFails(deleteDoc(doc(dbFor(OWNER), 'familyCircles', CIRCLE)));
  });

  it('lets a member remove only their own membership', async () => {
    await seedCircle();
    await addMember(JOINER);
    const db = dbFor(JOINER);

    await assertFails(deleteDoc(doc(db, 'familyCircles', CIRCLE, 'members', OWNER)));
    await assertSucceeds(deleteDoc(doc(db, 'familyCircles', CIRCLE, 'members', JOINER)));
  });
});
