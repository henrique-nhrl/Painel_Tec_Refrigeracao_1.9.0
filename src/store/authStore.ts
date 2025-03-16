import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types/database';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: async () => {
        try {
          // Primeiro limpar o estado local
          set({ user: null });
          
          // Limpar todos os itens relacionados à autenticação no localStorage
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('auth') || key.includes('supabase'))) {
              localStorage.removeItem(key);
            }
          }
          
          // Limpar cookies relacionados à autenticação
          document.cookie.split(';').forEach(cookie => {
            const [name] = cookie.trim().split('=');
            if (name && (name.includes('auth') || name.includes('supabase'))) {
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            }
          });
          
          // Então fazer logout no Supabase
          await supabase.auth.signOut();
          
          // Aguardar um momento para garantir que tudo foi limpo
          setTimeout(() => {
            // Redirecionar para a página de login
            window.location.href = '/login';
          }, 100);
        } catch (error) {
          console.error('Erro durante logout:', error);
          // Forçar logout mesmo se houver erro
          localStorage.clear();
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

// Listener para mudanças na sessão
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_OUT') {
    useAuthStore.getState().setUser(null);
    window.location.href = '/login';
  } else if (session?.user) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (error) throw error;
      if (profile) {
        useAuthStore.getState().setUser(profile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }
});
