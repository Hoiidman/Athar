import { create } from 'zustand';
import { MY_SPACE_GROUP_ID } from '../types';

interface CaptureDestinationState {
  destinationId: string;
  setDestination: (destinationId: string) => void;
}

export const useCaptureDestinationStore = create<CaptureDestinationState>((set) => ({
  destinationId: MY_SPACE_GROUP_ID,
  setDestination: (destinationId) => set({ destinationId }),
}));
