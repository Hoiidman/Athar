import { matchGroupsByDate } from '../autoCategorization';
import type { MemoryGroup } from '../../types/memory';

function createMockGroup(id: string, startIso: string, endIso: string): MemoryGroup {
  return {
    id,
    familyCircleId: 'circle-1',
    title: `Group ${id}`,
    startDate: new Date(startIso).getTime(),
    endDate: new Date(endIso).getTime(),
    memberIds: ['user-1'],
    coverPhotoUrl: null,
    createdBy: 'user-1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

describe('autoCategorization', () => {
  const groups = [
    createMockGroup('group-1', '2026-07-01T10:00:00Z', '2026-07-05T20:00:00Z'), // Summer trip
    createMockGroup('group-2', '2026-07-04T08:00:00Z', '2026-07-04T22:00:00Z'), // 4th of July (overlaps with Summer trip)
    createMockGroup('group-3', '2026-08-15T00:00:00Z', '2026-08-16T23:59:59Z'), // Weekend getaway
  ];

  it('matches a single group if photo is within range', () => {
    // July 2nd
    const photoMs = new Date('2026-07-02T15:00:00Z').getTime();
    const matches = matchGroupsByDate(groups, photoMs);
    expect(matches).toEqual(['group-1']);
  });

  it('returns empty array (My Space) if no groups match', () => {
    // July 10th
    const photoMs = new Date('2026-07-10T12:00:00Z').getTime();
    const matches = matchGroupsByDate(groups, photoMs);
    expect(matches).toEqual([]);
  });

  it('returns multiple groups if date ranges overlap', () => {
    // July 4th
    const photoMs = new Date('2026-07-04T12:00:00Z').getTime();
    const matches = matchGroupsByDate(groups, photoMs);
    expect(matches).toEqual(['group-1', 'group-2']);
  });

  it('matches inclusively on the start and end dates', () => {
    // August 16th exactly
    const photoMs = new Date('2026-08-16T12:00:00Z').getTime();
    const matches = matchGroupsByDate(groups, photoMs);
    expect(matches).toEqual(['group-3']);
  });
});
