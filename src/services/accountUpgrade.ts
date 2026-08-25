import type { User } from 'firebase/auth';
import { linkGuestAccount } from './auth';
import { setMemberDisplayName } from './familyCircles';
import { defaultDisplayName, getFamilyCircleId, setUserDisplayName } from './users';

async function syncDisplayName(uid: string, displayName: string) {
  await setUserDisplayName(uid, displayName);

  const circleId = await getFamilyCircleId(uid);
  if (circleId) await setMemberDisplayName(circleId, uid, displayName);
}

export async function upgradeGuestAccount(
  user: User,
  email: string,
  password: string,
): Promise<void> {
  const credential = await linkGuestAccount(user, email, password);
  const displayName = defaultDisplayName(credential.user);

  // The account is real once linking succeeds; a failed rename would
  // otherwise report the whole upgrade as failed and invite a retry that
  // cannot succeed, because the credential is already linked.
  await syncDisplayName(user.uid, displayName).catch(() => undefined);
}
