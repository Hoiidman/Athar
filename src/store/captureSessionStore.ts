import { create } from 'zustand';
import * as Crypto from 'expo-crypto';

export type CaptureKind = 'photo' | 'video' | 'audio';

export interface CaptureItem {
  id: string;
  uri: string;
  kind: CaptureKind;
  createdAt: number;
  /** Only ever set for voice items, at capture time — needed later if auto-save
   * has to be retried, since by then the original recording callback is gone. */
  durationSeconds?: number;
  /** True once an upload attempt has been claimed for this item, via
   * claimForSaving. Lives here (not a component ref) so the guard survives
   * a remount of whatever screen initiated the save. */
  saving?: boolean;
  /** Set once the item has been auto-saved to a memory doc, so the preview
   * screen's Save action can override that doc instead of creating a duplicate. */
  savedMemoryId?: string;
}

interface CaptureSessionState {
  items: CaptureItem[];
  addItem: (uri: string, kind: CaptureKind, durationSeconds?: number) => CaptureItem;
  removeItem: (id: string) => void;
  /** Atomically claims an item for saving. Returns false (and claims nothing)
   * if it's already saving or already saved, so a caller never starts a
   * second upload for the same item. */
  claimForSaving: (id: string) => boolean;
  /** Releases a claim after a failed upload, so it can be retried later. */
  unclaimSaving: (id: string) => void;
  markSaved: (id: string, memoryId: string) => void;
  clear: () => void;
}

export const useCaptureSessionStore = create<CaptureSessionState>((set, get) => ({
  items: [],
  addItem: (uri, kind, durationSeconds) => {
    const item: CaptureItem = {
      id: Crypto.randomUUID(),
      uri,
      kind,
      createdAt: Date.now(),
      durationSeconds,
    };
    set((state) => ({ items: [...state.items, item] }));
    return item;
  },
  removeItem: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  claimForSaving: (id) => {
    const item = get().items.find((i) => i.id === id);
    if (!item || item.saving || item.savedMemoryId) return false;
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, saving: true } : i)),
    }));
    return true;
  },
  unclaimSaving: (id) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, saving: false } : i)),
    })),
  markSaved: (id, memoryId) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, saving: false, savedMemoryId: memoryId } : item,
      ),
    })),
  clear: () => set({ items: [] }),
}));

export function isVisual(item: CaptureItem) {
  return item.kind !== 'audio';
}
