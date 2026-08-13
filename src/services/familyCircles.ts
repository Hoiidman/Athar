import type { User } from 'firebase/auth';
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
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
  | 'already-in-circle';

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

export async function createFamilyCircle(user: User, name: string): Promise<CreatedFamilyCircle> {
  const trimmedName = name.trim();
  if (!trimmedName || trimmedName.length > 60) {
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

export interface FamilyCircleSummary {
  id: string;
  name: string;
  inviteCode: string;
}

export async function getFamilyCircle(circleId: string): Promise<FamilyCircleSummary | null> {
  const snapshot = await getDoc(doc(firestore, 'familyCircles', circleId));
  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  return { id: snapshot.id, name: data.name as string, inviteCode: data.inviteCode as string };
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
