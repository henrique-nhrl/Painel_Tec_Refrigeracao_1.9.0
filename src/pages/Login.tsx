import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Limpar qualquer sessão anterior que possa estar causando problemas
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('auth') || key.includes('supabase'))) {
          localStorage.removeItem(key);
        }
      }

      console.log('Tentando login com:', { email });
      
      // Tentar fazer login
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        console.error('Erro de autenticação:', authError);
        if (authError.message === 'Invalid login credentials') {
          throw new Error('Email ou senha incorretos. Verifique suas credenciais.');
        }
        throw authError;
      }

      const authUser = data.user;
      if (!authUser) {
        console.error('Usuário não encontrado após login');
        throw new Error('Erro ao fazer login. Tente novamente.');
      }

      console.log('Login bem-sucedido, buscando perfil do usuário');
      
      // Buscar perfil do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError) {
        console.error('Erro ao buscar perfil:', profileError);
        throw new Error('Erro ao carregar perfil do usuário. Tente novamente.');
      }

      if (!profile) {
        console.error('Perfil não encontrado para o usuário:', authUser.id);
        throw new Error('Perfil de usuário não encontrado. Entre em contato com o administrador.');
      }

      console.log('Perfil encontrado, definindo usuário no estado');
      
      // Definir usuário no estado e redirecionar
      setUser(profile);
      
      // Pequeno atraso para garantir que o estado foi atualizado
      setTimeout(() => {
        navigate('/services');
        toast.success('Bem-vindo de volta!');
      }, 100);
      
    } catch (error) {
      console.error('Erro durante o processo de login:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 card">
        <div className="text-center">
          <Lock className="mx-auto h-12 w-12 text-blue-500" />
          <h2 className="mt-6 text-3xl font-bold">Sistema Admin</h2>
          <p className="mt-2 text-gray-400">
            Faça login para acessar o sistema
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-400">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                className="input w-full mt-1"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-400">
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                className="input w-full mt-1"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Link
              to="/reset-password"
              className="text-sm text-blue-400 hover:text-blue-500"
            >
              Esqueceu sua senha?
            </Link>
          </div>

          <button
            type="submit"
            className="w-full btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
