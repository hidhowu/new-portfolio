import { create } from 'zustand';

interface AuthState {
  user: { email: string; name: string } | null;
  setUser: (u: AuthState['user']) => void;
  logout: () => void;
}

// Simple zustand store — install zustand as a dep
export const useAuth = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
