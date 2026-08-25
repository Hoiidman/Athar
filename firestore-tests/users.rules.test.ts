import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { serverTimestamp } from 'firebase/firestore';

const ALICE = 'alice-uid';
const BOB = 'bob-uid';

let testEnv: RulesTestEnvironment;

function validUser(overrides: Record<string, unknown> = {}) {
  return {
    displayName: 'Alice',
    photoUrl: null,
    familyCircleId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'athar-rules-test',
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

describe('users rules', () => {
  it('lets a signed-in user create their own document', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();

    await assertSucceeds(setDoc(doc(db, 'users', ALICE), validUser()));
  });

  it('refuses a signed-out user', async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    await assertFails(setDoc(doc(db, 'users', ALICE), validUser()));
  });

  it('refuses creating a document for someone else', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();

    await assertFails(setDoc(doc(db, 'users', BOB), validUser()));
  });

  it('refuses a client-supplied timestamp instead of the server one', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();

    await assertFails(setDoc(doc(db, 'users', ALICE), validUser({ createdAt: Date.now() })));
  });

  it('refuses unexpected extra fields', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();

    await assertFails(setDoc(doc(db, 'users', ALICE), validUser({ isAdmin: true })));
  });

  it('refuses an empty display name', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();

    await assertFails(setDoc(doc(db, 'users', ALICE), validUser({ displayName: '' })));
  });

  it('lets a user read their own document but not another user document', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', BOB), validUser({ displayName: 'Bob' }));
    });

    const db = testEnv.authenticatedContext(ALICE).firestore();
    await setDoc(doc(db, 'users', ALICE), validUser());

    await assertSucceeds(getDoc(doc(db, 'users', ALICE)));
    await assertFails(getDoc(doc(db, 'users', BOB)));
  });

  it('refuses listing the whole users collection', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();

    await assertFails(getDocs(collection(db, 'users')));
  });

  it('refuses changing createdAt on update', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await setDoc(doc(db, 'users', ALICE), validUser());

    await assertFails(
      updateDoc(doc(db, 'users', ALICE), {
        displayName: 'Alice Renamed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('refuses deleting a user document', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await setDoc(doc(db, 'users', ALICE), validUser());

    await assertFails(deleteDoc(doc(db, 'users', ALICE)));
  });
});
