import { create } from 'zustand';
import { MY_SPACE_GROUP_ID } from '../types';

interface CaptureDestinationState {
  destinationId: string;
  destinationLabel: string;
  setDestination: (destinationId: string, destinationLabel: string) => void;
}

export const useCaptureDestinationStore = create<CaptureDestinationState>((set) => ({
  destinationId: MY_SPACE_GROUP_ID,
  destinationLabel: 'My Space',
  setDestination: (destinationId, destinationLabel) => set({ destinationId, destinationLabel }),
}));
