import { create } from 'zustand';

interface CVVariant {
  id: number;
  base_cv_id: number;
  job_id: string;
  variant_type: 'conservative' | 'optimized' | 'stretch';
  content: string;
  alignment_score: number;
  changes: string[];
  strong_matches?: string[];
  gaps?: string[];
  is_final: boolean;
  created_at: string;
}

interface CVEdit {
  id: string;
  timestamp: number;
  content: string;
  description: string;
}

interface CVStore {
  // State
  variants: CVVariant[];
  selectedVariantId: number | null;
  editHistory: CVEdit[];
  currentEditContent: string;
  isDirty: boolean;
  isGenerating: boolean;
  error: string | null;

  // Actions
  setVariants: (variants: CVVariant[]) => void;
  addVariant: (variant: CVVariant) => void;
  updateVariant: (id: number, updates: Partial<CVVariant>) => void;
  removeVariant: (id: number) => void;
  setSelectedVariantId: (id: number | null) => void;
  setCurrentEditContent: (content: string) => void;
  saveEdit: (description: string) => void;
  undoEdit: () => void;
  clearEditHistory: () => void;
  setDirty: (dirty: boolean) => void;
  setGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // Computed
  selectedVariant: () => CVVariant | null;
  variantsForJob: (jobId: string) => CVVariant[];
  canUndo: () => boolean;
}

const initialState = {
  variants: [],
  selectedVariantId: null,
  editHistory: [],
  currentEditContent: '',
  isDirty: false,
  isGenerating: false,
  error: null,
};

export const useCVStore = create<CVStore>((set, get) => ({
  ...initialState,

  setVariants: (variants) => set({ variants }),

  addVariant: (variant) =>
    set((state) => ({
      variants: [...state.variants, variant],
    })),

  updateVariant: (id, updates) =>
    set((state) => ({
      variants: state.variants.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    })),

  removeVariant: (id) =>
    set((state) => ({
      variants: state.variants.filter((v) => v.id !== id),
      selectedVariantId: state.selectedVariantId === id ? null : state.selectedVariantId,
    })),

  setSelectedVariantId: (id) => set({ selectedVariantId: id }),

  setCurrentEditContent: (content) =>
    set({
      currentEditContent: content,
      isDirty: true,
    }),

  saveEdit: (description) =>
    set((state) => {
      const newEdit: CVEdit = {
        id: `edit-${Date.now()}`,
        timestamp: Date.now(),
        content: state.currentEditContent,
        description,
      };
      return {
        editHistory: [...state.editHistory, newEdit],
        isDirty: false,
      };
    }),

  undoEdit: () =>
    set((state) => {
      if (state.editHistory.length === 0) return state;

      const newHistory = state.editHistory.slice(0, -1);
      const previousEdit = newHistory[newHistory.length - 1];

      return {
        editHistory: newHistory,
        currentEditContent: previousEdit?.content || '',
        isDirty: false,
      };
    }),

  clearEditHistory: () =>
    set({
      editHistory: [],
      currentEditContent: '',
      isDirty: false,
    }),

  setDirty: (dirty) => set({ isDirty: dirty }),

  setGenerating: (generating) => set({ isGenerating: generating }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),

  // Computed getters
  selectedVariant: () => {
    const state = get();
    return state.variants.find((v) => v.id === state.selectedVariantId) || null;
  },

  variantsForJob: (jobId) => {
    const state = get();
    return state.variants.filter((v) => v.job_id === jobId);
  },

  canUndo: () => {
    const state = get();
    return state.editHistory.length > 0;
  },
}));
