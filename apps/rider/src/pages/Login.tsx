import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Car, Lock, Mail, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-safar-bg flex flex-col justify-center px-6 py-12">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-safar-teal/20 text-safar-teal border border-safar-teal/30 shadow-[0_0_25px_rgba(53,208,176,0.4)]">
          <Car className="w-9 h-9" />
        </div>
        <h2 className="text-3xl font-black tracking-tight text-white">SAFAR RIDER</h2>
        <p className="text-sm text-safar-textMuted">Ride Safe. Ride Smart. Ride SAFAR.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-safar-card p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-safar-textMuted uppercase mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-safar-textMuted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rider@safar.app"
                  className="w-full pl-12 pr-4 py-3.5 bg-safar-surface border border-white/10 rounded-2xl text-white placeholder-safar-textMuted/50 focus:outline-none focus:border-safar-teal transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-safar-textMuted uppercase mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-safar-textMuted" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3.5 bg-safar-surface border border-white/10 rounded-2xl text-white placeholder-safar-textMuted/50 focus:outline-none focus:border-safar-teal transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-safar-teal hover:bg-safar-tealHover disabled:opacity-50 text-safar-bg font-extrabold text-base rounded-2xl shadow-lg flex items-center justify-center space-x-2 transition-all mt-2"
            >
              <span>{loading ? 'Signing in...' : 'Sign In as Rider'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-safar-textMuted">
              Don't have an account?{' '}
              <Link to="/register" className="text-safar-teal font-bold hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
