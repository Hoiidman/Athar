export type MemoryType = 'photo' | 'video' | 'voice';

export type MemoryVisibility = 'private' | 'shared';

export type AiStatus = 'pending' | 'success' | 'failed' | 'offline_fallback' | 'not_applicable';

export type CategorizationMethod = 'auto' | 'manual' | 'default';

export interface Memory {
  id: string;
  familyCircleId: string;
  memoryGroupId: string;
  visibility: MemoryVisibility;
  type: MemoryType;
  storageUrl: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  takenAt: number | null;
  uploadedBy: string;
  caption: string | null;
  transcript: string | null;
  aiStory: string | null;
  aiStatus: AiStatus;
  categorizationMethod: CategorizationMethod;
  includeInSlideshow: boolean;
  createdAt: number;
  updatedAt: number;
}

export type MemoryGroupCategory = 'vacation' | 'event' | 'holiday' | 'other';

export interface MemoryGroup {
  id: string;
  familyCircleId: string;
  title: string;
  category?: MemoryGroupCategory;
  startDate: number;
  endDate: number;
  memberIds: string[];
  coverPhotoUrl: string | null;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export const MY_SPACE_GROUP_ID = 'my-space';
