import type { User } from 'firebase/auth';
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import {
  generateUniqueInviteCode,
  isValidInviteCode,
  normalizeInviteCode,
} from '../utils/inviteCode';
import type { FamilyCircleMember } from '../types/familyCircle';
import { firestore } from './firebase';
import { defaultDisplayName, ensureUserDocument } from './users';

export type FamilyCircleErrorCode =
  | 'invalid-name'
  | 'invalid-code'
  | 'code-not-found'
  | 'code-generation-failed'
  | 'already-in-circle'
  | 'invalid-relationship'
  | 'circle-not-found';

export class FamilyCircleError extends Error {
  constructor(readonly code: FamilyCircleErrorCode) {
    super(code);
    this.name = 'FamilyCircleError';
  }
}

const CODE_TAKEN = 'athar/invite-code-taken';

export interface CreatedFamilyCircle {
  id: string;
  inviteCode: string;
}

async function requireCirclelessUserDocument(user: User) {
  const snapshot = await getDoc(doc(firestore, 'users', user.uid));

  if (!snapshot.exists()) {
    await ensureUserDocument(user);
    return;
  }

  if (snapshot.data().familyCircleId) {
    throw new FamilyCircleError('already-in-circle');
  }
}

export const MAX_CIRCLE_NAME_LENGTH = 60;

export async function createFamilyCircle(user: User, name: string): Promise<CreatedFamilyCircle> {
  const trimmedName = name.trim();
  if (!trimmedName || trimmedName.length > MAX_CIRCLE_NAME_LENGTH) {
    throw new FamilyCircleError('invalid-name');
  }

  await requireCirclelessUserDocument(user);

  const circleRef = doc(collection(firestore, 'familyCircles'));
  const displayName = defaultDisplayName(user);

  const claimCode = async (candidate: string) => {
    try {
      await runTransaction(firestore, async (transaction) => {
        const codeRef = doc(firestore, 'inviteCodes', candidate);
        const existing = await transaction.get(codeRef);
        if (existing.exists()) throw new Error(CODE_TAKEN);

        transaction.set(circleRef, {
          name: trimmedName,
          inviteCode: candidate,
          ownerId: user.uid,
          memberIds: [user.uid],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        transaction.set(doc(firestore, 'familyCircles', circleRef.id, 'members', user.uid), {
          userId: user.uid,
          displayName,
          role: 'owner',
          inviteCodeUsed: null,
          joinedAt: serverTimestamp(),
        });
        transaction.set(codeRef, {
          familyCircleId: circleRef.id,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });
        transaction.update(doc(firestore, 'users', user.uid), {
          familyCircleId: circleRef.id,
          updatedAt: serverTimestamp(),
        });
      });
      return true;
    } catch (error) {
      if (error instanceof Error && error.message === CODE_TAKEN) return false;
      throw error;
    }
  };

  try {
    const inviteCode = await generateUniqueInviteCode(claimCode);
    return { id: circleRef.id, inviteCode };
  } catch (error) {
    if (error instanceof FamilyCircleError) throw error;
    if (error instanceof Error && error.message.startsWith('Could not generate')) {
      throw new FamilyCircleError('code-generation-failed');
    }
    throw error;
  }
}

export async function joinFamilyCircle(user: User, rawCode: string): Promise<string> {
  const code = normalizeInviteCode(rawCode);
  if (!isValidInviteCode(code)) throw new FamilyCircleError('invalid-code');

  await requireCirclelessUserDocument(user);

  const codeSnapshot = await getDoc(doc(firestore, 'inviteCodes', code));
  if (!codeSnapshot.exists()) throw new FamilyCircleError('code-not-found');

  const circleId = codeSnapshot.data().familyCircleId as string;
  const batch = writeBatch(firestore);

  batch.set(doc(firestore, 'familyCircles', circleId, 'members', user.uid), {
    userId: user.uid,
    displayName: defaultDisplayName(user),
    role: 'member',
    inviteCodeUsed: code,
    joinedAt: serverTimestamp(),
  });
  batch.update(doc(firestore, 'familyCircles', circleId), {
    memberIds: arrayUnion(user.uid),
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(firestore, 'users', user.uid), {
    familyCircleId: circleId,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  return circleId;
}

export async function renameFamilyCircle(circleId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > MAX_CIRCLE_NAME_LENGTH) {
    throw new FamilyCircleError('invalid-name');
  }

  await updateDoc(doc(firestore, 'familyCircles', circleId), {
    name: trimmed,
    updatedAt: serverTimestamp(),
  });
}

export async function leaveFamilyCircle(user: User, circleId: string): Promise<void> {
  const batch = writeBatch(firestore);

  batch.delete(doc(firestore, 'familyCircles', circleId, 'members', user.uid));
  batch.update(doc(firestore, 'familyCircles', circleId), {
    memberIds: arrayRemove(user.uid),
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(firestore, 'users', user.uid), {
    familyCircleId: null,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function rotateInviteCode(user: User, circleId: string): Promise<string> {
  const circleRef = doc(firestore, 'familyCircles', circleId);

  const claimCode = async (candidate: string) => {
    try {
      await runTransaction(firestore, async (transaction) => {
        const codeRef = doc(firestore, 'inviteCodes', candidate);
        const circleSnapshot = await transaction.get(circleRef);
        const existing = await transaction.get(codeRef);

        if (!circleSnapshot.exists()) throw new FamilyCircleError('circle-not-found');
        if (existing.exists()) throw new Error(CODE_TAKEN);

        const previous = circleSnapshot.data().inviteCode as string | undefined;

        transaction.set(codeRef, {
          familyCircleId: circleId,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });
        transaction.update(circleRef, {
          inviteCode: candidate,
          updatedAt: serverTimestamp(),
        });
        if (previous && previous !== candidate) {
          transaction.delete(doc(firestore, 'inviteCodes', previous));
        }
      });
      return true;
    } catch (error) {
      if (error instanceof Error && error.message === CODE_TAKEN) return false;
      throw error;
    }
  };

  try {
    return await generateUniqueInviteCode(claimCode);
  } catch (error) {
    if (error instanceof FamilyCircleError) throw error;
    if (error instanceof Error && error.message.startsWith('Could not generate')) {
      throw new FamilyCircleError('code-generation-failed');
    }
    throw error;
  }
}

export async function setMemberDisplayName(
  circleId: string,
  uid: string,
  displayName: string,
): Promise<void> {
  await updateDoc(doc(firestore, 'familyCircles', circleId, 'members', uid), { displayName });
}

export const MAX_RELATIONSHIP_LENGTH = 40;

export async function setMemberRelationship(
  circleId: string,
  uid: string,
  relationship: string,
): Promise<void> {
  const trimmed = relationship.trim();
  if (trimmed.length > MAX_RELATIONSHIP_LENGTH) {
    throw new FamilyCircleError('invalid-relationship');
  }

  await updateDoc(doc(firestore, 'familyCircles', circleId, 'members', uid), {
    relationship: trimmed || null,
  });
}

export interface FamilyCircleSummary {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
}

export async function getFamilyCircle(circleId: string): Promise<FamilyCircleSummary | null> {
  const snapshot = await getDoc(doc(firestore, 'familyCircles', circleId));
  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  return {
    id: snapshot.id,
    name: data.name as string,
    inviteCode: data.inviteCode as string,
    ownerId: data.ownerId as string,
  };
}

export async function listFamilyCircleMembers(circleId: string): Promise<FamilyCircleMember[]> {
  const snapshot = await getDocs(collection(firestore, 'familyCircles', circleId, 'members'));

  return snapshot.docs
    .map((memberDoc) => {
      const data = memberDoc.data() as Omit<FamilyCircleMember, 'joinedAt'> & {
        joinedAt: Timestamp | null;
      };
      return { ...data, joinedAt: data.joinedAt?.toMillis() ?? Date.now() };
    })
    .sort((a, b) => a.joinedAt - b.joinedAt);
}
