import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import * as fs from 'fs';

const PROJECT_ID = 'athar-smac2026';
const CIRCLE = 'circle-1';
const MEMBER_1 = 'member-1';
const MEMBER_2 = 'member-2';
const NON_MEMBER = 'stranger';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    // Create circle
    await setDoc(doc(db, 'familyCircles', CIRCLE), {
      name: 'Test Circle',
      ownerId: MEMBER_1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    // Add members
    await setDoc(doc(db, 'familyCircles', CIRCLE, 'members', MEMBER_1), {
      userId: MEMBER_1,
      role: 'owner',
      joinedAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'familyCircles', CIRCLE, 'members', MEMBER_2), {
      userId: MEMBER_2,
      role: 'member',
      joinedAt: serverTimestamp(),
    });

    // Seed some memories
    await setDoc(doc(db, 'memories', 'shared-mem'), {
      familyCircleId: CIRCLE,
      memoryGroupId: 'group-1',
      visibility: 'shared',
      type: 'photo',
      storageUrl: 'https://...',
      thumbnailUrl: null,
      durationSeconds: null,
      takenAt: null,
      uploadedBy: MEMBER_1,
      caption: null,
      transcript: null,
      aiStory: null,
      aiStatus: 'not_applicable',
      embedding: null,
      location: null,
      categorizationMethod: 'default',
      includeInSlideshow: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'memories', 'private-mem'), {
      familyCircleId: CIRCLE,
      memoryGroupId: 'my-space',
      visibility: 'private',
      type: 'photo',
      storageUrl: 'https://...',
      thumbnailUrl: null,
      durationSeconds: null,
      takenAt: null,
      uploadedBy: MEMBER_1,
      caption: null,
      transcript: null,
      aiStory: null,
      aiStatus: 'not_applicable',
      embedding: null,
      location: null,
      categorizationMethod: 'default',
      includeInSlideshow: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
});

function dbFor(uid: string) {
  return testEnv.authenticatedContext(uid).firestore();
}

describe('memories rules', () => {
  describe('Reads', () => {
    it('allows a member to read a shared memory in their circle', async () => {
      const db = dbFor(MEMBER_2);
      await assertSucceeds(getDoc(doc(db, 'memories', 'shared-mem')));
    });

    it('denies a non-member from reading a shared memory', async () => {
      const db = dbFor(NON_MEMBER);
      await assertFails(getDoc(doc(db, 'memories', 'shared-mem')));
    });

    it('allows the uploader to read their private memory', async () => {
      const db = dbFor(MEMBER_1);
      await assertSucceeds(getDoc(doc(db, 'memories', 'private-mem')));
    });

    it('denies another member from reading a private memory', async () => {
      const db = dbFor(MEMBER_2);
      await assertFails(getDoc(doc(db, 'memories', 'private-mem')));
    });
  });

  describe('Writes', () => {
    const validMemory = {
      familyCircleId: CIRCLE,
      memoryGroupId: 'group-1',
      visibility: 'shared',
      type: 'photo',
      storageUrl: 'https://...',
      thumbnailUrl: null,
      durationSeconds: null,
      takenAt: null,
      uploadedBy: MEMBER_1,
      caption: null,
      transcript: null,
      aiStory: null,
      aiStatus: 'not_applicable',
      embedding: null,
      location: null,
      categorizationMethod: 'default',
      includeInSlideshow: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    it('allows a member to create a valid memory', async () => {
      const db = dbFor(MEMBER_1);
      await assertSucceeds(setDoc(doc(db, 'memories', 'new-mem'), validMemory));
    });

    it('denies creating a memory for another user', async () => {
      const db = dbFor(MEMBER_1);
      const spoofedMemory = { ...validMemory, uploadedBy: MEMBER_2 };
      await assertFails(setDoc(doc(db, 'memories', 'spoofed-mem'), spoofedMemory));
    });

    it('denies setting aiStory or changing aiStatus from pending/not_applicable', async () => {
      const db = dbFor(MEMBER_1);
      const badMemory = { ...validMemory, aiStory: 'Hacked', aiStatus: 'success' };
      await assertFails(setDoc(doc(db, 'memories', 'hacked-mem'), badMemory));
    });

    it('denies setting an embedding on create', async () => {
      const db = dbFor(MEMBER_1);
      const badMemory = { ...validMemory, embedding: [0.1, 0.2, 0.3] };
      await assertFails(setDoc(doc(db, 'memories', 'hacked-embedding'), badMemory));
    });

    it('allows creating a memory with a valid location', async () => {
      const db = dbFor(MEMBER_1);
      const geotagged = { ...validMemory, location: { lat: 40.7, lng: -74.0 } };
      await assertSucceeds(setDoc(doc(db, 'memories', 'geotagged-mem'), geotagged));
    });

    it('denies a malformed location shape', async () => {
      const db = dbFor(MEMBER_1);
      const badMemory = { ...validMemory, location: { lat: '40.7', lng: -74.0 } };
      await assertFails(setDoc(doc(db, 'memories', 'bad-location-mem'), badMemory));
    });

    it('denies a member from writing their own embedding on update', async () => {
      const db = dbFor(MEMBER_1);
      await assertFails(
        updateDoc(doc(db, 'memories', 'shared-mem'), {
          embedding: [0.1, 0.2, 0.3],
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('allows a member to update their own memory', async () => {
      const db = dbFor(MEMBER_1);
      await assertSucceeds(
        updateDoc(doc(db, 'memories', 'shared-mem'), {
          caption: 'Updated',
          updatedAt: serverTimestamp(),
        })
      );
    });

    it("denies a member from updating someone else's memory", async () => {
      const db = dbFor(MEMBER_2);
      await assertFails(updateDoc(doc(db, 'memories', 'shared-mem'), { caption: 'Hacked' }));
    });
  });
});
