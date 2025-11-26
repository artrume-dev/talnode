import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

interface UserProfile {
  id: number;
  linkedin_url?: string;
  full_name: string;
  headline?: string;
  summary?: string;
  current_position?: string;
  years_of_experience?: number;
  skills?: string;
  experience?: string;
  education?: string;
  raw_data?: string;
  preferred_industries?: string; // JSON array of industries
  preferred_locations?: string; // JSON array of locations
  preferred_job_types?: string; // JSON array of job types
  created_at?: string;
  updated_at?: string;
}

interface CVDocument {
  id: number;
  user_profile_id?: number;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  parsed_content: string;
  is_active: boolean;
  uploaded_at: string;
}

interface UserStore {
  // State
  profile: UserProfile | null;
  activeCVId: number | null;
  cvDocuments: CVDocument[];
  isOnboarded: boolean;

  // Actions
  setProfile: (profile: UserProfile | null) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setActiveCVId: (id: number | null) => void;
  setCVDocuments: (docs: CVDocument[]) => void;
  addCVDocument: (doc: CVDocument) => void;
  removeCVDocument: (id: number) => void;
  setActiveCV: (id: number) => void;
  updateCVContent: (cvId: number, content: string) => void;
  setOnboarded: (value: boolean) => void;
  reset: () => void;
}

const initialState = {
  profile: null,
  activeCVId: null,
  cvDocuments: [],
  isOnboarded: false,
};

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      ...initialState,
      cvDocuments: [], // Ensure cvDocuments is always an array

      setProfile: (profile) => set({ profile }),

      updateProfile: (updates) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...updates } : (updates as UserProfile),
        })),

      setActiveCVId: (id) => set({ activeCVId: id }),

      setCVDocuments: (docs) => set({ cvDocuments: docs }),

      addCVDocument: (doc) =>
        set((state) => ({
          cvDocuments: [...(Array.isArray(state.cvDocuments) ? state.cvDocuments : []), doc],
        })),

      removeCVDocument: (id) =>
        set((state) => ({
          cvDocuments: (Array.isArray(state.cvDocuments) ? state.cvDocuments : []).filter((doc) => doc.id !== id),
          activeCVId: state.activeCVId === id ? null : state.activeCVId,
        })),

      setActiveCV: async (id) => {
        // Update local state immediately for responsive UI
        set((state) => ({
          activeCVId: id,
          cvDocuments: (Array.isArray(state.cvDocuments) ? state.cvDocuments : []).map((doc) => ({
            ...doc,
            is_active: doc.id === id,
          })),
        }));

        // Persist to backend
        try {
          await api.put(`/cv/${id}/activate`);
          console.log('✅ CV activated successfully on backend');
        } catch (error) {
          console.error('❌ Error activating CV:', error);
        }
      },

      updateCVContent: (cvId, content) =>
        set((state) => ({
          cvDocuments: (Array.isArray(state.cvDocuments) ? state.cvDocuments : []).map((cv) =>
            cv.id === cvId
              ? { ...cv, parsed_content: content, uploaded_at: new Date().toISOString() }
              : cv
          ),
        })),

      setOnboarded: (value) => set({ isOnboarded: value }),

      reset: () => set(initialState),
    }),
    {
      name: 'user-storage',
      version: 2, // Increment to force storage migration
      partialize: (state) => ({
        profile: state.profile,
        activeCVId: state.activeCVId,
        isOnboarded: state.isOnboarded,
      }),
      merge: (persistedState, currentState) => {
        console.log('🔄 Merging persisted state:', persistedState);
        const merged = {
          ...currentState,
          ...(persistedState as Partial<UserStore>),
          cvDocuments: [], // Always start with empty array, will be fetched fresh
        };
        // Ensure cvDocuments is always an array
        if (!Array.isArray(merged.cvDocuments)) {
          console.warn('⚠️ cvDocuments was not an array, resetting to []:', merged.cvDocuments);
          merged.cvDocuments = [];
        }
        console.log('✅ Merged state:', merged);
        return merged;
      },
      migrate: (persistedState: any, version: number) => {
        // Migration for version 2: ensure cvDocuments is always an array
        if (version < 2) {
          return {
            ...persistedState,
            cvDocuments: [],
          };
        }
        return persistedState as UserStore;
      },
    }
  )
);
