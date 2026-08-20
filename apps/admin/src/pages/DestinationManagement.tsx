import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { MapPin, Plus, Edit2, Trash2, Star, CheckCircle, X, Image, Navigation } from 'lucide-react';

interface PopularDestination {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  rating?: number;
  category?: string;
  isActive: boolean;
}

export const DestinationManagement: React.FC = () => {
  const [destinations, setDestinations] = useState<PopularDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    imageUrl: '',
    rating: '4.8',
    category: 'Popular',
  });

  const fetchDestinations = async () => {
    try {
      const res = await apiFetch('/api/admin/popular-destinations');
      setDestinations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, []);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      address: '',
      latitude: '28.6139',
      longitude: '77.2090',
      imageUrl: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=400&q=80',
      rating: '4.8',
      category: 'Popular',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (dest: PopularDestination) => {
    setEditingId(dest.id);
    setFormData({
      name: dest.name,
      address: dest.address,
      latitude: dest.latitude.toString(),
      longitude: dest.longitude.toString(),
      imageUrl: dest.imageUrl || '',
      rating: dest.rating?.toString() || '4.8',
      category: dest.category || 'Popular',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      address: formData.address,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      imageUrl: formData.imageUrl || 'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=400&q=80',
      rating: parseFloat(formData.rating || '4.8'),
      category: formData.category || 'Popular',
    };

    try {
      if (editingId) {
        await apiFetch(`/api/admin/popular-destinations/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        alert('🎉 Popular Destination updated successfully!');
      } else {
        await apiFetch('/api/admin/popular-destinations', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        alert('🎉 Popular Destination created successfully!');
      }
      setShowModal(false);
      fetchDestinations();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await apiFetch(`/api/admin/popular-destinations/${id}`, { method: 'DELETE' });
      alert('Destination deleted');
      fetchDestinations();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Action Header */}
      <div className="flex justify-between items-center bg-safar-card p-5 rounded-3xl border border-white/10 shadow-lg">
        <div>
          <h2 className="text-xl font-black text-white">Popular Destinations Management</h2>
          <p className="text-xs text-safar-textMuted mt-0.5">
            Configure map latitude & longitude coordinates, category badges, and image thumbnails for Rider App grids.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-safar-teal text-safar-bg font-extrabold text-xs rounded-2xl flex items-center space-x-2 shadow-lg active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Destination</span>
        </button>
      </div>

      {/* Grid Display of Popular Destinations */}
      {loading ? (
        <div className="text-center py-12 text-safar-textMuted font-bold">Loading destinations...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {destinations.map((dest) => (
            <div key={dest.id} className="bg-safar-card rounded-3xl border border-white/10 overflow-hidden shadow-xl flex flex-col justify-between group hover:border-safar-teal/40 transition-all">
              <div className="relative h-44 w-full bg-safar-surface overflow-hidden">
                <img
                  src={dest.imageUrl || 'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=400&q=80'}
                  alt={dest.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3 bg-safar-card/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-safar-teal border border-white/10 uppercase">
                  {dest.category || 'Popular'}
                </div>
                <div className="absolute top-3 right-3 bg-safar-card/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-yellow-400 border border-white/10 flex items-center">
                  <Star className="w-3 h-3 fill-current mr-1" />
                  <span>{dest.rating || '4.8'}</span>
                </div>
              </div>

              <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-white text-base">{dest.name}</h3>
                  <p className="text-xs text-safar-textMuted line-clamp-2 mt-1">{dest.address}</p>

                  <div className="mt-3 inline-flex items-center space-x-2 text-[10px] font-bold text-safar-teal bg-safar-teal/10 px-3 py-1 rounded-xl border border-safar-teal/20">
                    <Navigation className="w-3 h-3" />
                    <span>Lat: {dest.latitude.toFixed(4)}, Lng: {dest.longitude.toFixed(4)}</span>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t border-white/5">
                  <button
                    onClick={() => handleOpenEditModal(dest)}
                    className="p-2 rounded-xl bg-safar-surface text-safar-teal hover:bg-safar-card border border-white/10 text-xs font-bold flex items-center space-x-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleDelete(dest.id, dest.name)}
                    className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-xs font-bold flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Destination Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-safar-card border border-white/10 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-lg font-black text-white">
                {editingId ? 'Edit Popular Destination' : 'Add Popular Destination'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-safar-textMuted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="text-safar-textMuted font-bold">Destination Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. IGI Airport T3"
                  className="w-full bg-safar-surface border border-white/10 text-white rounded-xl p-3 mt-1 focus:outline-none focus:border-safar-teal"
                />
              </div>

              <div>
                <label className="text-safar-textMuted font-bold">Full Address</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Indira Gandhi Int Airport, New Delhi"
                  className="w-full bg-safar-surface border border-white/10 text-white rounded-xl p-3 mt-1 focus:outline-none focus:border-safar-teal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-safar-textMuted font-bold">Latitude (GPS)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="28.5562"
                    className="w-full bg-safar-surface border border-white/10 text-white rounded-xl p-3 mt-1 focus:outline-none focus:border-safar-teal"
                  />
                </div>
                <div>
                  <label className="text-safar-textMuted font-bold">Longitude (GPS)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="77.1000"
                    className="w-full bg-safar-surface border border-white/10 text-white rounded-xl p-3 mt-1 focus:outline-none focus:border-safar-teal"
                  />
                </div>
              </div>

              <div>
                <label className="text-safar-textMuted font-bold">Image Thumbnail URL</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-safar-surface border border-white/10 text-white rounded-xl p-3 mt-1 focus:outline-none focus:border-safar-teal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-safar-textMuted font-bold">Category Badge</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Airport / Mall / Hub"
                    className="w-full bg-safar-surface border border-white/10 text-white rounded-xl p-3 mt-1 focus:outline-none focus:border-safar-teal"
                  />
                </div>
                <div>
                  <label className="text-safar-textMuted font-bold">Rating (★)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                    placeholder="4.8"
                    className="w-full bg-safar-surface border border-white/10 text-white rounded-xl p-3 mt-1 focus:outline-none focus:border-safar-teal"
                  />
                </div>
              </div>

              <div className="pt-3 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-safar-surface border border-white/10 text-safar-textMuted font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-safar-teal text-safar-bg font-black rounded-xl shadow-lg"
                >
                  Save Destination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
