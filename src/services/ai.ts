import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface SearchResultMemory {
  id: string;
  storageUrl: string;
  thumbnailUrl: string | null;
  type: 'photo' | 'video' | 'voice';
  aiStory: string | null;
  takenAt: number | null;
  memoryGroupId: string;
}

const searchMemoriesCallable = httpsCallable<
  { query: string; familyCircleId: string },
  { results: SearchResultMemory[] }
>(functions, 'searchMemories');

export async function searchMemories(query: string, familyCircleId: string): Promise<SearchResultMemory[]> {
  const response = await searchMemoriesCallable({ query, familyCircleId });
  return response.data.results;
}
