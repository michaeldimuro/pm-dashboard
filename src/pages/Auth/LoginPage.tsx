import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Loader2, Rocket, AlertCircle } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, session } = useAuth();
  const navigate = useNavigate();

  // If session exists, redirect to dashboard
  useEffect(() => {
    if (session) {
      console.log('[Login] Session detected, redirecting to dashboard');
      navigate('/', { replace: true });
    }
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    
    setError('');
    setLoading(true);

    // Timeout to prevent infinite loading state
    const loginTimeout = setTimeout(() => {
      console.error('[Login] Login timeout - request took too long');
      setLoading(false);
      setError('Login request timed out. Please check your connection and try again.');
    }, 15000); // 15 second timeout

    try {
      console.log('[Login] Submitting login form...');
      const result = await signIn(email.trim(), password);
      
      clearTimeout(loginTimeout);
      
      if (result.success) {
        console.log('[Login] Login successful, navigating to dashboard');
        navigate('/', { replace: true });
      } else {
        console.log('[Login] Login failed:', result.error);
        setError(result.error || 'Invalid login details. Please try again.');
        setLoading(false);
      }
    } catch (err: unknown) {
      clearTimeout(loginTimeout);
      console.error('[Login] Unexpected error:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background stars */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-2 h-2 bg-indigo-500/30 rounded-full top-[10%] left-[20%] animate-pulse" />
        <div className="absolute w-1 h-1 bg-purple-500/40 rounded-full top-[30%] left-[70%] animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute w-2 h-2 bg-cyan-500/30 rounded-full top-[60%] left-[10%] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute w-1 h-1 bg-indigo-500/40 rounded-full top-[80%] left-[80%] animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute w-1 h-1 bg-purple-500/30 rounded-full top-[15%] left-[85%] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute w-2 h-2 bg-cyan-500/20 rounded-full top-[70%] left-[40%] animate-pulse" style={{ animationDelay: '0.3s' }} />
      </div>

      {/* Gradient orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
      
      <div className="relative glass rounded-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="w-20 h-20 mx-auto mb-4 relative">
            <div className="absolute inset-0 gradient-accent rounded-2xl rotate-6 opacity-50" />
            <div className="absolute inset-0 bg-[#12122a] rounded-2xl flex items-center justify-center border border-indigo-500/30">
              <Rocket className="text-indigo-400" size={36} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">Mission Control</h1>
          <p className="text-gray-400 mt-2">Access your command center</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
              className="w-full px-4 py-3 bg-[#12122a] border border-[#2a2a4a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-[#12122a] border border-[#2a2a4a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition pr-12 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition disabled:opacity-50"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full gradient-accent text-white py-3 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Launching...
              </>
            ) : (
              <>
                <Rocket size={20} />
                Launch Mission Control
              </>
            )}
          </button>
        </form>

        <p className="text-center text-gray-500 mt-6 text-sm">
          Private access only
        </p>
      </div>
    </div>
  );
}
