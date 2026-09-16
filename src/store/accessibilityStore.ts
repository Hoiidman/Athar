import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type TextSize = 'standard' | 'large' | 'extraLarge';

export const textSizeScales: Record<TextSize, number> = {
  standard: 1,
  large: 1.15,
  extraLarge: 1.35,
};

export const textSizeLabels: Record<TextSize, string> = {
  standard: 'Standard',
  large: 'Large',
  extraLarge: 'Extra large',
};

interface AccessibilityState {
  textSize: TextSize;
  highContrast: boolean;
  simplifiedMode: boolean;
  setTextSize: (textSize: TextSize) => void;
  setHighContrast: (highContrast: boolean) => void;
  setSimplifiedMode: (simplifiedMode: boolean) => void;
}

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set) => ({
      textSize: 'standard',
      highContrast: false,
      simplifiedMode: false,
      setTextSize: (textSize) => set({ textSize }),
      setHighContrast: (highContrast) => set({ highContrast }),
      setSimplifiedMode: (simplifiedMode) => set({ simplifiedMode }),
    }),
    {
      name: 'athar-accessibility-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
