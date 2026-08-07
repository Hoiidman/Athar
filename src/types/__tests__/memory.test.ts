import { MY_SPACE_GROUP_ID } from '../memory';

describe('memory types', () => {
  it('uses "my-space" as the My Space group id', () => {
    // This value is a sentinel written into every private memory document
    // (see Database_Schema.md), so changing it would orphan existing data.
    expect(MY_SPACE_GROUP_ID).toBe('my-space');
  });
});
