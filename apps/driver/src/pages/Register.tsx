import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';
import { VehicleType } from '@safar/shared';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Mail, Phone, ArrowRight, Car } from 'lucide-react';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [upiId, setUpiId] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [vehicles, setVehicles] = useState<VehicleType[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadVehicles() {
      try {
        const res = await apiFetch('/api/vehicles');
        setVehicles(res.data);
        if (res.data.length > 0) {
          setVehicleTypeId(res.data[0].id);
        }
      } catch (err) {}
    }
    loadVehicles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!upiId || !upiId.includes('@')) {
      setError('Please enter a valid Payout UPI ID (e.g. 9876543210@paytm or name@upi)');
      return;
    }
    setLoading(true);
    try {
      await register({ fullName, email, phone, password, vehicleTypeId, upiId, role: 'DRIVER' });
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Driver registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-safar-bg flex flex-col justify-center px-6 py-12">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-safar-teal/20 text-safar-teal border border-safar-teal/30">
          <Car className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-black tracking-tight text-white">SAFAR Driver Registration</h2>
        <p className="text-sm text-safar-textMuted">Register your vehicle & start receiving rides.</p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-safar-card p-8 rounded-3xl border border-white/10 shadow-2xl space-y-5">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-safar-textMuted uppercase mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 w-5 h-5 text-safar-textMuted" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Vikram Singh"
                  className="w-full pl-12 pr-4 py-3 bg-safar-surface border border-white/10 rounded-2xl text-white placeholder-safar-textMuted/50 focus:outline-none focus:border-safar-teal text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-safar-textMuted uppercase mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-safar-textMuted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="driver@safar.app"
                  className="w-full pl-12 pr-4 py-3 bg-safar-surface border border-white/10 rounded-2xl text-white placeholder-safar-textMuted/50 focus:outline-none focus:border-safar-teal text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-safar-textMuted uppercase mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-3.5 w-5 h-5 text-safar-textMuted" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-12 pr-4 py-3 bg-safar-surface border border-white/10 rounded-2xl text-white placeholder-safar-textMuted/50 focus:outline-none focus:border-safar-teal text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-safar-textMuted uppercase mb-1">
                Payout Bank Account (UPI ID) *
              </label>
              <div className="relative">
                <div className="absolute left-4 top-3.5 text-safar-teal font-extrabold text-xs">UPI</div>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="9876543210@paytm or name@upi"
                  className="w-full pl-14 pr-4 py-3 bg-safar-surface border border-safar-teal/40 rounded-2xl text-white placeholder-safar-textMuted/50 focus:outline-none focus:border-safar-teal text-sm font-bold"
                />
              </div>
              <p className="text-[10px] text-safar-teal/80 font-bold mt-1">
                🗓️ Monthly earnings auto-transfer to this UPI on 1st & 2nd of every month.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-safar-textMuted uppercase mb-1">Select Vehicle Category</label>
              <select
                value={vehicleTypeId}
                onChange={(e) => setVehicleTypeId(e.target.value)}
                className="w-full px-4 py-3 bg-safar-surface border border-white/10 rounded-2xl text-white focus:outline-none focus:border-safar-teal text-sm"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id} className="bg-safar-card">
                    {v.name} ({v.description})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-safar-textMuted uppercase mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-safar-textMuted" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 bg-safar-surface border border-white/10 rounded-2xl text-white placeholder-safar-textMuted/50 focus:outline-none focus:border-safar-teal text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-safar-teal hover:bg-safar-tealHover disabled:opacity-50 text-safar-bg font-extrabold text-base rounded-2xl shadow-lg flex items-center justify-center space-x-2 transition-all mt-2"
            >
              <span>{loading ? 'Submitting Application...' : 'Register Driver Account'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-safar-textMuted">
              Already a driver?{' '}
              <Link to="/login" className="text-safar-teal font-bold hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
