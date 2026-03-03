'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AlertCircle, LogIn, UserPlus, TrendingUp } from 'lucide-react';

type Tab = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username and password are required');
      return;
    }

    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      username,
      password,
      isRegister: tab === 'register' ? 'true' : 'false',
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(result.error === 'CredentialsSignin' ? 'Invalid credentials' : result.error);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <TrendingUp className="w-8 h-8 text-green-400" />
            <span className="text-2xl font-bold text-white">MarketSim</span>
          </div>
          <p className="text-gray-400 text-sm">Practice investing with $100,000 virtual cash</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">
          {/* Tabs */}
          <div className="flex rounded-lg overflow-hidden border border-gray-700 mb-6">
            <button
              onClick={() => { setTab('login'); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                tab === 'login' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Login
            </button>
            <button
              onClick={() => { setTab('register'); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                tab === 'register' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
              <input
                type="text"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="password"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Please wait...' : tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {tab === 'register' && (
            <p className="mt-4 text-center text-xs text-gray-500">
              You&apos;ll start with $100,000 virtual cash to invest
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
