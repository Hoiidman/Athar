export interface User {
  id: string;
  displayName: string;
  photoUrl: string | null;
  // Denormalized so the app can find a user's circle without querying the
  // members subcollection on every launch (see Database_Schema.md).
  familyCircleId: string | null;
  createdAt: number;
  updatedAt: number;
}
