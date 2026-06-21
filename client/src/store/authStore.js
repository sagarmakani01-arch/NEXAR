import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authAPI } from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authAPI.login(email, password);
          set({ 
            user: data.user, 
            token: data.token, 
            isAuthenticated: true,
            isLoading: false 
          });
          return data;
        } catch (error) {
          set({ error: error.response?.data?.error || 'Login failed', isLoading: false });
          throw error;
        }
      },

      register: async (email, password, name) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authAPI.register(email, password, name);
          set({ 
            user: data.user, 
            token: data.token, 
            isAuthenticated: true,
            isLoading: false 
          });
          return data;
        } catch (error) {
          set({ error: error.response?.data?.error || 'Registration failed', isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateProfile: async (updates) => {
        set({ isLoading: true });
        try {
          const { data } = await authAPI.updateProfile(updates);
          set({ user: data.user, isLoading: false });
          return data;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      refreshUser: async () => {
        const { token } = get();
        if (!token) return;
        try {
          const { data } = await authAPI.getMe();
          set({ user: data.user });
        } catch (error) {
          get().logout();
        }
      },

      initializeAuth: () => {
        const { token } = get();
        if (token) {
          get().refreshUser();
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated })
    }
  )
);

// Initialize on load
if (typeof window !== 'undefined') {
  useAuthStore.getState().initializeAuth();
}
