import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  arrayUnion,
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
const OTHER_CIRCLE = 'circle-2';
const OTHER_CODE = 'A2B3C4D5';
const NEW_CODE = 'N3W4C5D6';

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

function joinBatch(db: Firestore, uid: string, circleId: string, code: string | null) {
  const batch = writeBatch(db);
  batch.set(doc(db, 'familyCircles', circleId, 'members', uid), {
    userId: uid,
    displayName: 'Joiner',
    role: 'member',
    inviteCodeUsed: code,
    joinedAt: serverTimestamp(),
  });
  batch.update(doc(db, 'familyCircles', circleId), {
    memberIds: arrayUnion(uid),
    updatedAt: serverTimestamp(),
  });
  return batch;
}

function rotateBatch(db: Firestore, uid: string, oldCode: string, newCode: string) {
  const batch = writeBatch(db);
  batch.set(
    doc(db, 'inviteCodes', newCode),
    inviteCodeData({ familyCircleId: CIRCLE, createdBy: uid }),
  );
  batch.update(doc(db, 'familyCircles', CIRCLE), {
    inviteCode: newCode,
    updatedAt: serverTimestamp(),
  });
  batch.delete(doc(db, 'inviteCodes', oldCode));
  return batch;
}

function leaveBatch(db: Firestore, uid: string, remaining: string[]) {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'familyCircles', CIRCLE, 'members', uid));
  batch.update(doc(db, 'familyCircles', CIRCLE), {
    memberIds: remaining,
    updatedAt: serverTimestamp(),
  });
  return batch;
}

async function seedOtherCircle() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore() as unknown as Firestore;
    await setDoc(doc(db, 'familyCircles', OTHER_CIRCLE), circleData({ inviteCode: OTHER_CODE }));
    await setDoc(
      doc(db, 'inviteCodes', OTHER_CODE),
      inviteCodeData({ familyCircleId: OTHER_CIRCLE }),
    );
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

async function setMemberIds(ids: string[]) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore() as unknown as Firestore;
    await updateDoc(doc(db, 'familyCircles', CIRCLE), { memberIds: ids });
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

  it('refuses changing the invite code without creating the new code document', async () => {
    await seedCircle();
    const db = dbFor(OWNER);

    await assertFails(
      updateDoc(doc(db, 'familyCircles', CIRCLE), {
        inviteCode: NEW_CODE,
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

  it('refuses re-appending a member who is already in memberIds', async () => {
    await seedCircle();
    await addMember(JOINER);
    const db = dbFor(JOINER);

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const admin = context.firestore() as unknown as Firestore;
      await updateDoc(doc(admin, 'familyCircles', CIRCLE), { memberIds: [OWNER, JOINER] });
    });

    await assertFails(
      updateDoc(doc(db, 'familyCircles', CIRCLE), {
        memberIds: [OWNER, JOINER, JOINER],
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('lets a member rename only themselves, and change nothing else', async () => {
    await seedCircle();
    await addMember(JOINER);
    const db = dbFor(JOINER);
    const own = doc(db, 'familyCircles', CIRCLE, 'members', JOINER);

    await assertSucceeds(updateDoc(own, { displayName: 'Sami Hennawi' }));

    await assertFails(updateDoc(own, { role: 'owner' }));
    await assertFails(updateDoc(own, { displayName: 'Sami', role: 'owner' }));
    await assertFails(updateDoc(own, { displayName: '' }));
    await assertFails(
      updateDoc(doc(db, 'familyCircles', CIRCLE, 'members', OWNER), { displayName: 'Hijacked' }),
    );
  });

  it('lets a member describe their own relationship', async () => {
    await seedCircle();
    await addMember(JOINER);
    const db = dbFor(JOINER);
    const own = doc(db, 'familyCircles', CIRCLE, 'members', JOINER);

    await assertSucceeds(updateDoc(own, { relationship: 'Brother' }));
    await assertSucceeds(updateDoc(own, { displayName: 'Sami', relationship: null }));

    await assertFails(updateDoc(own, { relationship: 'x'.repeat(41) }));
    await assertFails(updateDoc(own, { relationship: 7 }));
  });

  it('lets the family owner label anyone, without renaming them', async () => {
    await seedCircle();
    await addMember(JOINER);
    const theirs = doc(dbFor(OWNER), 'familyCircles', CIRCLE, 'members', JOINER);

    await assertSucceeds(updateDoc(theirs, { relationship: 'Brother' }));

    await assertFails(updateDoc(theirs, { displayName: 'Renamed' }));
    await assertFails(updateDoc(theirs, { relationship: 'Brother', displayName: 'Renamed' }));
  });

  it('does not let an ordinary member label anyone else', async () => {
    await seedCircle();
    await addMember(JOINER);
    await addMember(STRANGER);
    const db = dbFor(JOINER);

    await assertFails(
      updateDoc(doc(db, 'familyCircles', CIRCLE, 'members', OWNER), { relationship: 'Dad' }),
    );
    await assertFails(
      updateDoc(doc(db, 'familyCircles', CIRCLE, 'members', STRANGER), { relationship: 'Cousin' }),
    );
  });
});

describe('invite codes', () => {
  it('lets any signed-in user look up a code', async () => {
    await seedCircle();

    await assertSucceeds(getDoc(doc(dbFor(STRANGER), 'inviteCodes', CODE)));
  });

  it('refuses a signed-out lookup', async () => {
    await seedCircle();

    await assertFails(getDoc(doc(dbFor(), 'inviteCodes', CODE)));
  });

  it('refuses creating a code for a circle the user does not own', async () => {
    await seedCircle();
    const db = dbFor(STRANGER);

    await assertFails(
      setDoc(doc(db, 'inviteCodes', OTHER_CODE), inviteCodeData({ createdBy: STRANGER })),
    );
  });

  it('refuses repointing an existing code at another circle', async () => {
    await seedCircle();
    const db = dbFor(OWNER);

    await assertFails(updateDoc(doc(db, 'inviteCodes', CODE), { familyCircleId: OTHER_CIRCLE }));
  });

  it('refuses deleting the code the circle still points at', async () => {
    await seedCircle();

    await assertFails(deleteDoc(doc(dbFor(OWNER), 'inviteCodes', CODE)));
  });
});

describe('leaving a family circle', () => {
  async function seedTwoMemberCircle() {
    await seedCircle();
    await addMember(JOINER);
    await setMemberIds([OWNER, JOINER]);
  }

  it('lets a member drop their own membership and leave the list', async () => {
    await seedTwoMemberCircle();

    await assertSucceeds(leaveBatch(dbFor(JOINER), JOINER, [OWNER]).commit());
  });

  it('refuses the owner leaving their own circle', async () => {
    await seedTwoMemberCircle();

    await assertFails(leaveBatch(dbFor(OWNER), OWNER, [JOINER]).commit());
  });

  it('refuses dropping someone else from the list', async () => {
    await seedTwoMemberCircle();

    await assertFails(leaveBatch(dbFor(JOINER), OWNER, [JOINER]).commit());
  });

  it('refuses leaving the list while keeping the member document', async () => {
    await seedTwoMemberCircle();
    const db = dbFor(JOINER);

    await assertFails(
      updateDoc(doc(db, 'familyCircles', CIRCLE), {
        memberIds: [OWNER],
        updatedAt: serverTimestamp(),
      }),
    );
  });
});

describe('removing a member from a family circle', () => {
  async function seedTwoMemberCircle() {
    await seedCircle();
    await addMember(JOINER);
    await setMemberIds([OWNER, JOINER]);
  }

  it('lets the owner remove another member', async () => {
    await seedTwoMemberCircle();

    await assertSucceeds(leaveBatch(dbFor(OWNER), JOINER, [OWNER]).commit());
  });

  it('refuses a member removing anyone but themselves', async () => {
    await seedTwoMemberCircle();
    await addMember(STRANGER);
    await setMemberIds([OWNER, JOINER, STRANGER]);

    await assertFails(leaveBatch(dbFor(JOINER), STRANGER, [OWNER, JOINER]).commit());
  });

  it('refuses the owner removing themselves', async () => {
    await seedTwoMemberCircle();

    await assertFails(leaveBatch(dbFor(OWNER), OWNER, [JOINER]).commit());
  });

  it('refuses an owner dropping more than one member at a time', async () => {
    await seedTwoMemberCircle();
    await addMember(STRANGER);
    await setMemberIds([OWNER, JOINER, STRANGER]);
    const db = dbFor(OWNER);

    await assertFails(
      updateDoc(doc(db, 'familyCircles', CIRCLE), {
        memberIds: [OWNER],
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('refuses an owner swapping a member for someone new', async () => {
    await seedTwoMemberCircle();
    const db = dbFor(OWNER);

    await assertFails(
      updateDoc(doc(db, 'familyCircles', CIRCLE), {
        memberIds: [OWNER, STRANGER],
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('leaves a removed member unable to read the circle', async () => {
    await seedTwoMemberCircle();
    await leaveBatch(dbFor(OWNER), JOINER, [OWNER]).commit();

    await assertFails(getDoc(doc(dbFor(JOINER), 'familyCircles', CIRCLE)));
  });
});

describe('rotating the invite code', () => {
  it('lets the owner swap in a new code and drop the old one', async () => {
    await seedCircle();

    await assertSucceeds(rotateBatch(dbFor(OWNER), OWNER, CODE, NEW_CODE).commit());
  });

  it('refuses a rotation by a member who does not own the circle', async () => {
    await seedCircle();
    await addMember(JOINER);

    await assertFails(rotateBatch(dbFor(JOINER), JOINER, CODE, NEW_CODE).commit());
  });

  it('refuses pointing the circle at a code registered to another circle', async () => {
    await seedCircle();
    await seedOtherCircle();
    const db = dbFor(OWNER);

    await assertFails(
      updateDoc(doc(db, 'familyCircles', CIRCLE), {
        inviteCode: OTHER_CODE,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('leaves the old code unusable for joining', async () => {
    await seedCircle();
    await rotateBatch(dbFor(OWNER), OWNER, CODE, NEW_CODE).commit();

    await assertFails(joinBatch(dbFor(JOINER), JOINER, CIRCLE, CODE).commit());
    await assertSucceeds(joinBatch(dbFor(JOINER), JOINER, CIRCLE, NEW_CODE).commit());
  });
});

describe('joining a family circle', () => {
  it('lets a user join when they supply the code that maps to the circle', async () => {
    await seedCircle();

    await assertSucceeds(joinBatch(dbFor(JOINER), JOINER, CIRCLE, CODE).commit());
  });

  it('refuses a signed-out join', async () => {
    await seedCircle();

    await assertFails(joinBatch(dbFor(), JOINER, CIRCLE, CODE).commit());
  });

  it('refuses joining with no invite code at all', async () => {
    await seedCircle();

    await assertFails(joinBatch(dbFor(JOINER), JOINER, CIRCLE, null).commit());
  });

  it('refuses joining with a code that does not exist', async () => {
    await seedCircle();

    await assertFails(joinBatch(dbFor(JOINER), JOINER, CIRCLE, 'WRONGCOD').commit());
  });

  it('refuses a code that belongs to a different circle', async () => {
    await seedCircle();
    await seedOtherCircle();

    await assertFails(joinBatch(dbFor(JOINER), JOINER, CIRCLE, OTHER_CODE).commit());
  });

  it('refuses adding somebody else to a circle', async () => {
    await seedCircle();

    await assertFails(joinBatch(dbFor(JOINER), STRANGER, CIRCLE, CODE).commit());
  });

  it('refuses claiming the owner role when joining', async () => {
    await seedCircle();
    const db = dbFor(JOINER);
    const batch = writeBatch(db);
    batch.set(doc(db, 'familyCircles', CIRCLE, 'members', JOINER), {
      userId: JOINER,
      displayName: 'Joiner',
      role: 'owner',
      inviteCodeUsed: CODE,
      joinedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'familyCircles', CIRCLE), {
      memberIds: arrayUnion(JOINER),
      updatedAt: serverTimestamp(),
    });

    await assertFails(batch.commit());
  });

  it('refuses adding yourself to memberIds without a member doc', async () => {
    await seedCircle();
    const db = dbFor(JOINER);

    await assertFails(
      updateDoc(doc(db, 'familyCircles', CIRCLE), {
        memberIds: arrayUnion(JOINER),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('allows a member doc without the memberIds update, since memberIds is not authoritative', async () => {
    await seedCircle();
    const db = dbFor(JOINER);

    await assertSucceeds(
      setDoc(doc(db, 'familyCircles', CIRCLE, 'members', JOINER), {
        userId: JOINER,
        displayName: 'Joiner',
        role: 'member',
        inviteCodeUsed: CODE,
        joinedAt: serverTimestamp(),
      }),
    );
  });
});
