import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { FileCheck, CheckCircle2, XCircle, FileText, AlertTriangle } from 'lucide-react';

export const KycManagement: React.FC = () => {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const fetchQueue = async () => {
    try {
      const res = await apiFetch('/api/admin/kyc/queue');
      setQueue(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleApprove = async (driverId: string) => {
    try {
      await apiFetch(`/api/admin/kyc/${driverId}/approve`, { method: 'POST' });
      alert('Driver KYC approved successfully!');
      setSelectedDriver(null);
      fetchQueue();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    }
  };

  const handleReject = async () => {
    if (!selectedDriver || !rejectionReason) {
      alert('Please specify a rejection reason');
      return;
    }
    try {
      await apiFetch(`/api/admin/kyc/${selectedDriver.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejectionReason }),
      });
      alert('Driver KYC rejected and notification sent.');
      setShowRejectModal(false);
      setSelectedDriver(null);
      setRejectionReason('');
      fetchQueue();
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 pt-2">
      <div className="sticky top-0 z-20 pt-3 md:pt-[max(2rem,env(safe-area-inset-top,28px))] pb-3 bg-[#11151D] border-b border-white/10 -mx-4 px-4 sm:-mx-8 sm:px-8 mb-4">
        <h1 className="text-xl sm:text-3xl font-black text-white">KYC Document Verification</h1>
        <p className="text-xs sm:text-sm text-safar-textMuted mt-0.5">Review driver identity documents before granting platform access.</p>
      </div>

      {loading ? (
        <div className="text-safar-textMuted font-bold py-8">Loading KYC queue...</div>
      ) : queue.length === 0 ? (
        <div className="bg-safar-card p-12 rounded-3xl text-center space-y-3 border border-white/5">
          <FileCheck className="w-12 h-12 text-safar-teal mx-auto opacity-80" />
          <h3 className="text-lg font-bold text-white">No Pending Verification Applications</h3>
          <p className="text-xs text-safar-textMuted">All driver partner documents have been processed.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {queue.map((driver) => (
            <div key={driver.id} className="bg-safar-card p-5 rounded-3xl border border-white/5 space-y-4 shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white text-base">{driver.user?.fullName}</h3>
                  <p className="text-xs text-safar-textMuted">{driver.user?.email}</p>
                  <p className="text-xs text-safar-textMuted">{driver.user?.phone}</p>
                </div>
                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full text-xs font-bold uppercase">
                  {driver.kycStatus}
                </span>
              </div>

              <div className="bg-safar-surface p-3.5 rounded-2xl border border-white/5 space-y-2">
                <div className="text-xs font-bold text-safar-textMuted uppercase">Uploaded Documents ({driver.kycDocuments?.length || 0})</div>
                <div className="space-y-1">
                  {driver.kycDocuments?.map((doc: any) => (
                    <div key={doc.id} className="flex justify-between items-center text-xs text-white">
                      <span>{doc.documentType}</span>
                      <a href={`http://localhost:5000${doc.fileUrl}`} target="_blank" rel="noreferrer" className="text-safar-teal font-bold hover:underline">
                        View File
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => {
                    setSelectedDriver(driver);
                    setShowRejectModal(true);
                  }}
                  className="py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl border border-red-500/20 text-xs flex items-center justify-center space-x-1"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>

                <button
                  onClick={() => handleApprove(driver.id)}
                  className="py-2.5 bg-safar-teal hover:bg-safar-tealHover text-safar-bg font-extrabold rounded-xl text-xs flex items-center justify-center space-x-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-safar-card p-6 rounded-3xl border border-white/10 max-w-md w-full space-y-4">
            <h3 className="text-xl font-black text-white">Reject Driver KYC</h3>
            <p className="text-xs text-safar-textMuted">Provide a clear rejection reason for {selectedDriver?.user?.fullName}.</p>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Aadhaar card photo is blurry. Please re-upload a clear copy."
              className="w-full p-3.5 bg-safar-surface border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-safar-teal"
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="py-3 bg-safar-surface text-safar-textMuted font-bold rounded-xl text-xs"
              >
                Cancel
              </button>

              <button
                onClick={handleReject}
                className="py-3 bg-red-500 text-white font-bold rounded-xl text-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
