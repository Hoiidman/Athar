import type { MemoryGroup } from '../types/memory';

/**
 * Strips the time component from a timestamp, returning a timestamp representing
 * midnight (00:00:00) of that local date.
 */
function getStartOfLocalDate(timestampMs: number): number {
  const date = new Date(timestampMs);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Given a list of active Memory Groups and a photo's creation timestamp,
 * returns the IDs of all groups whose date range includes the timestamp.
 * 
 * If no groups match, returns an empty array (which signifies fallback to 'my-space').
 */
export function matchGroupsByDate(groups: MemoryGroup[], timestampMs: number): string[] {
  const photoDateMs = getStartOfLocalDate(timestampMs);

  return groups
    .filter((group) => {
      if (!group.startDate || !group.endDate) return false;
      
      const groupStartMs = getStartOfLocalDate(group.startDate);
      const groupEndMs = getStartOfLocalDate(group.endDate);
      
      return photoDateMs >= groupStartMs && photoDateMs <= groupEndMs;
    })
    .map((group) => group.id);
}
