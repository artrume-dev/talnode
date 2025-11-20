import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type RightPanelView = 'preview' | 'editor' | 'optimizer' | 'diff' | 'job-details' | 'none';

interface UIPanelSizes {
  leftPanelWidth: number; // Percentage (0-100)
  rightPanelWidth: number; // Percentage (0-100)
}

interface UIStore {
  // State
  panelSizes: UIPanelSizes;
  rightPanelView: RightPanelView;
  isCompanySelectorOpen: boolean;
  isLinkedInImportOpen: boolean;
  isCVUploaderOpen: boolean;
  isAddCompanyModalOpen: boolean;
  isMobileMenuOpen: boolean;
  theme: 'light' | 'dark' | 'system';

  // Actions
  setPanelSizes: (sizes: Partial<UIPanelSizes>) => void;
  setRightPanelView: (view: RightPanelView) => void;
  toggleCompanySelector: () => void;
  openCompanySelector: () => void;
  closeCompanySelector: () => void;
  toggleLinkedInImport: () => void;
  openLinkedInImport: () => void;
  closeLinkedInImport: () => void;
  toggleCVUploader: () => void;
  openCVUploader: () => void;
  closeCVUploader: () => void;
  toggleAddCompanyModal: () => void;
  openAddCompanyModal: () => void;
  closeAddCompanyModal: () => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  closeAllModals: () => void;
  reset: () => void;
}

const DEFAULT_PANEL_SIZES: UIPanelSizes = {
  leftPanelWidth: 50,
  rightPanelWidth: 50,
};

const initialState = {
  panelSizes: DEFAULT_PANEL_SIZES,
  rightPanelView: 'preview' as RightPanelView,
  isCompanySelectorOpen: false,
  isLinkedInImportOpen: false,
  isCVUploaderOpen: false,
  isAddCompanyModalOpen: false,
  isMobileMenuOpen: false,
  theme: 'system' as const,
};

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      ...initialState,

      setPanelSizes: (sizes) =>
        set((state) => ({
          panelSizes: {
            ...state.panelSizes,
            ...sizes,
          },
        })),

      setRightPanelView: (view) =>
        set({
          rightPanelView: view,
        }),

      toggleCompanySelector: () =>
        set((state) => ({
          isCompanySelectorOpen: !state.isCompanySelectorOpen,
        })),

      openCompanySelector: () =>
        set({
          isCompanySelectorOpen: true,
        }),

      closeCompanySelector: () =>
        set({
          isCompanySelectorOpen: false,
        }),

      toggleLinkedInImport: () =>
        set((state) => ({
          isLinkedInImportOpen: !state.isLinkedInImportOpen,
        })),

      openLinkedInImport: () =>
        set({
          isLinkedInImportOpen: true,
        }),

      closeLinkedInImport: () =>
        set({
          isLinkedInImportOpen: false,
        }),

      toggleCVUploader: () =>
        set((state) => ({
          isCVUploaderOpen: !state.isCVUploaderOpen,
        })),

      openCVUploader: () =>
        set({
          isCVUploaderOpen: true,
        }),

      closeCVUploader: () =>
        set({
          isCVUploaderOpen: false,
        }),

      toggleAddCompanyModal: () =>
        set((state) => ({
          isAddCompanyModalOpen: !state.isAddCompanyModalOpen,
        })),

      openAddCompanyModal: () =>
        set({
          isAddCompanyModalOpen: true,
        }),

      closeAddCompanyModal: () =>
        set({
          isAddCompanyModalOpen: false,
        }),

      toggleMobileMenu: () =>
        set((state) => ({
          isMobileMenuOpen: !state.isMobileMenuOpen,
        })),

      closeMobileMenu: () =>
        set({
          isMobileMenuOpen: false,
        }),

      setTheme: (theme) =>
        set({
          theme,
        }),

      closeAllModals: () =>
        set({
          isCompanySelectorOpen: false,
          isLinkedInImportOpen: false,
          isCVUploaderOpen: false,
          isAddCompanyModalOpen: false,
          isMobileMenuOpen: false,
        }),

      reset: () => set(initialState),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        panelSizes: state.panelSizes,
        theme: state.theme,
      }),
    }
  )
);
