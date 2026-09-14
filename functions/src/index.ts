import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { enrichMemory } from './enrichMemory';
export { backfillEmbeddings } from './backfillEmbeddings';
export { searchMemories } from './searchMemories';
