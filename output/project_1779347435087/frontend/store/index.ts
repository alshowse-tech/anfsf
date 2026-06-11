import { create } from 'zustand';

interface AppState {
  // Add state fields here

  // Add actions here
}

export const useAppStore = create<AppState>((set) => ({
  // Add state initial values here
  // Add action implementations here
}));
