export type MemberRole = 'owner' | 'member';

export interface FamilyCircle {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  // Denormalized list for quick membership checks without reading the
  // members subcollection (see Database_Schema.md).
  memberIds: string[];
  createdAt: number;
  updatedAt: number;
}

/** A document in `familyCircles/{familyCircleId}/members/{userId}`. */
export interface FamilyCircleMember {
  userId: string;
  // Denormalized so the members list renders without an extra read per row.
  displayName: string;
  role: MemberRole;
  // Null for the circle's owner. Joiners must supply the code they used, so
  // security rules can verify it maps to this circle (ADR-021).
  inviteCodeUsed: string | null;
  joinedAt: number;
  // How this person is described within the family — "Dad", "Grandma".
  // Absent on member documents written before the field existed.
  relationship?: string | null;
}

/**
 * A document in `inviteCodes/{code}` — the code itself is the document ID,
 * which is what makes Firestore enforce uniqueness for us (ADR-021).
 *
 * Deliberately thin: any authenticated user may read this, so it must not
 * expose anything beyond an opaque circle ID.
 */
export interface InviteCode {
  code: string;
  familyCircleId: string;
  createdBy: string;
  createdAt: number;
}
