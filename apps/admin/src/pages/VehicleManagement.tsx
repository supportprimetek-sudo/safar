import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { VehicleType } from '@safar/shared';
import { Car, Plus, Edit2, CheckCircle, XCircle } from 'lucide-react';

export const VehicleManagement: React.FC = () => {
  const [vehicles, setVehicles] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'car',
    image: '/vehicles/default.png',
    baseFare: 50,
    perKmRate: 15,
    perMinuteRate: 2,
    minimumFare: 70,
    cancellationFee: 25,
    capacity: 4,
  });

  const fetchVehicles = async () => {
    try {
      const res = await apiFetch('/api/admin/vehicles');
      setVehicles(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVehicle) {
        await apiFetch(`/api/admin/vehicles/${editingVehicle.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        alert('Vehicle category updated');
      } else {
        await apiFetch('/api/admin/vehicles', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        alert('Vehicle category created');
      }
      setShowModal(false);
      fetchVehicles();
    } catch (err: any) {
      alert(err.message || 'Save failed');
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white">Vehicle & Fare Management</h1>
          <p className="text-sm text-safar-textMuted mt-1">Configure vehicle categories, passenger capacities, and dynamic pricing rules.</p>
        </div>

        <button
          onClick={() => {
            setEditingVehicle(null);
            setFormData({ name: '', description: '', icon: 'car', image: '/vehicles/default.png', baseFare: 50, perKmRate: 15, perMinuteRate: 2, minimumFare: 70, cancellationFee: 25, capacity: 4 });
            setShowModal(true);
          }}
          className="px-5 py-3 bg-safar-teal hover:bg-safar-tealHover text-safar-bg font-extrabold rounded-2xl flex items-center space-x-2 shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span>Add Vehicle Category</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {vehicles.map((v) => (
          <div key={v.id} className="bg-safar-card p-6 rounded-3xl border border-white/5 space-y-4 shadow-xl">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-safar-teal/20 text-safar-teal flex items-center justify-center font-bold">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-lg">{v.name}</h3>
                  <p className="text-xs text-safar-textMuted">{v.capacity} Passengers</p>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${v.isActive ? 'bg-safar-teal/20 text-safar-teal' : 'bg-red-500/20 text-red-400'}`}>
                {v.isActive ? 'Active' : 'Disabled'}
              </span>
            </div>

            <p className="text-xs text-safar-textMuted">{v.description}</p>

            <div className="bg-safar-surface p-4 rounded-2xl border border-white/5 grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-safar-textMuted font-bold uppercase text-[10px]">Base Fare</div>
                <div className="text-sm font-black text-white">₹{v.baseFare}</div>
              </div>
              <div>
                <div className="text-safar-textMuted font-bold uppercase text-[10px]">Per KM Rate</div>
                <div className="text-sm font-black text-safar-teal">₹{v.perKmRate}/km</div>
              </div>
              <div>
                <div className="text-safar-textMuted font-bold uppercase text-[10px]">Per Min Rate</div>
                <div className="text-sm font-black text-white">₹{v.perMinuteRate}/min</div>
              </div>
              <div>
                <div className="text-safar-textMuted font-bold uppercase text-[10px]">Min Fare</div>
                <div className="text-sm font-black text-white">₹{v.minimumFare}</div>
              </div>
            </div>

            <button
              onClick={() => {
                setEditingVehicle(v);
                setFormData({
                  name: v.name,
                  description: v.description,
                  icon: v.icon,
                  image: v.image,
                  baseFare: v.baseFare,
                  perKmRate: v.perKmRate,
                  perMinuteRate: v.perMinuteRate,
                  minimumFare: v.minimumFare,
                  cancellationFee: v.cancellationFee,
                  capacity: v.capacity,
                });
                setShowModal(true);
              }}
              className="w-full py-2.5 bg-safar-surface hover:bg-safar-cardHover border border-white/10 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2"
            >
              <Edit2 className="w-4 h-4 text-safar-teal" />
              <span>Edit Pricing Rules</span>
            </button>
          </div>
        ))}
      </div>

      {/* Modal Editor */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-safar-card p-6 rounded-3xl border border-white/10 max-w-md w-full space-y-4">
            <h3 className="text-xl font-black text-white">{editingVehicle ? 'Edit Category' : 'New Vehicle Category'}</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-safar-textMuted font-bold uppercase mb-1">Name</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 bg-safar-surface border border-white/10 rounded-xl text-white" />
              </div>

              <div>
                <label className="block text-safar-textMuted font-bold uppercase mb-1">Description</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full p-3 bg-safar-surface border border-white/10 rounded-xl text-white" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-safar-textMuted font-bold uppercase mb-1">Base Fare (₹)</label>
                  <input type="number" required value={formData.baseFare} onChange={(e) => setFormData({ ...formData, baseFare: Number(e.target.value) })} className="w-full p-3 bg-safar-surface border border-white/10 rounded-xl text-white" />
                </div>
                <div>
                  <label className="block text-safar-textMuted font-bold uppercase mb-1">Per KM (₹)</label>
                  <input type="number" required value={formData.perKmRate} onChange={(e) => setFormData({ ...formData, perKmRate: Number(e.target.value) })} className="w-full p-3 bg-safar-surface border border-white/10 rounded-xl text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-safar-textMuted font-bold uppercase mb-1">Minimum Fare (₹)</label>
                  <input type="number" required value={formData.minimumFare} onChange={(e) => setFormData({ ...formData, minimumFare: Number(e.target.value) })} className="w-full p-3 bg-safar-surface border border-white/10 rounded-xl text-white" />
                </div>
                <div>
                  <label className="block text-safar-textMuted font-bold uppercase mb-1">Capacity</label>
                  <input type="number" required value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })} className="w-full p-3 bg-safar-surface border border-white/10 rounded-xl text-white" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="py-3 bg-safar-surface text-safar-textMuted font-bold rounded-xl text-xs">
                Cancel
              </button>
              <button type="submit" className="py-3 bg-safar-teal text-safar-bg font-black rounded-xl text-xs">
                Save Vehicle Category
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
