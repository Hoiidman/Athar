import { create } from 'zustand';
import * as Crypto from 'expo-crypto';

export type CaptureKind = 'photo' | 'video' | 'audio';

export interface CaptureItem {
  id: string;
  uri: string;
  kind: CaptureKind;
  createdAt: number;
  /** Set once the item has been auto-saved to a memory doc, so the preview
   * screen's Save action can override that doc instead of creating a duplicate. */
  savedMemoryId?: string;
}

interface CaptureSessionState {
  items: CaptureItem[];
  addItem: (uri: string, kind: CaptureKind) => CaptureItem;
  removeItem: (id: string) => void;
  markSaved: (id: string, memoryId: string) => void;
  clear: () => void;
}

export const useCaptureSessionStore = create<CaptureSessionState>((set) => ({
  items: [],
  addItem: (uri, kind) => {
    const item: CaptureItem = {
      id: Crypto.randomUUID(),
      uri,
      kind,
      createdAt: Date.now(),
    };
    set((state) => ({ items: [...state.items, item] }));
    return item;
  },
  removeItem: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  markSaved: (id, memoryId) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, savedMemoryId: memoryId } : item)),
    })),
  clear: () => set({ items: [] }),
}));

export function isVisual(item: CaptureItem) {
  return item.kind !== 'audio';
}
