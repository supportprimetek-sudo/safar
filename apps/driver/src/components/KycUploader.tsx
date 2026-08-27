import React, { useState } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { FileCheck, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const KycUploader: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const driver = user?.driverProfile;
  const [uploading, setUploading] = useState<string | null>(null);

  const docTypes = [
    { type: 'AADHAAR_FRONT', label: 'Aadhaar Card Front', category: 'Identity' },
    { type: 'AADHAAR_BACK', label: 'Aadhaar Card Back', category: 'Identity' },
    { type: 'LICENCE_FRONT', label: 'Driving Licence Front', category: 'Licence' },
    { type: 'LICENCE_BACK', label: 'Driving Licence Back', category: 'Licence' },
    { type: 'RC_FRONT', label: 'Vehicle RC Book (Front)', category: 'Vehicle' },
    { type: 'VEHICLE_PHOTO', label: 'Vehicle Photo with Plate', category: 'Vehicle' },
  ];

  const handleFileUpload = async (documentType: string, file: File) => {
    setUploading(documentType);
    const formData = new FormData();
    formData.append('documentType', documentType);
    formData.append('document', file);

    try {
      await apiFetch('/api/kyc/upload', {
        method: 'POST',
        body: formData,
      });
      await refreshUser();
      alert(`Document ${documentType} uploaded successfully`);
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="bg-safar-card p-6 rounded-3xl border border-white/10 shadow-2xl space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 rounded-2xl bg-safar-teal/20 text-safar-teal flex items-center justify-center font-bold">
          <FileCheck className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white">Driver KYC Onboarding</h3>
          <p className="text-xs text-safar-textMuted">Upload government documents for verification.</p>
        </div>
      </div>

      {/* KYC Status Badge */}
      <div className="p-4 rounded-2xl bg-safar-surface border border-white/5 flex items-center justify-between">
        <span className="text-xs font-bold text-safar-textMuted">Verification Status</span>
        <span
          className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
            driver?.kycStatus === 'APPROVED'
              ? 'bg-safar-teal/20 text-safar-teal border border-safar-teal/30'
              : driver?.kycStatus === 'REJECTED'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
          }`}
        >
          {driver?.kycStatus || 'PENDING'}
        </span>
      </div>

      {driver?.kycStatus === 'REJECTED' && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-start space-x-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <strong>KYC Verification Rejected:</strong> Please review rejection reasons and upload clear photo documents.
          </div>
        </div>
      )}

      {/* Document Upload Grids */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {docTypes.map((d) => {
          const doc = driver?.kycDocuments?.find((k) => k.documentType === d.type);
          const isUploaded = !!doc;
          return (
            <div key={d.type} className="p-4 rounded-2xl bg-safar-surface border border-white/5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white">{d.label}</span>
                {isUploaded ? (
                  <CheckCircle2 className="w-4 h-4 text-safar-teal" />
                ) : (
                  <span className="text-[10px] text-yellow-400">Required</span>
                )}
              </div>

              <label className="cursor-pointer block border-2 border-dashed border-white/10 hover:border-safar-teal rounded-xl p-4 text-center transition-colors">
                <Upload className="w-6 h-6 text-safar-teal mx-auto mb-1" />
                <span className="text-xs text-safar-textMuted font-bold">
                  {uploading === d.type ? 'Uploading...' : isUploaded ? 'Re-upload File' : 'Choose File'}
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(d.type, e.target.files[0]);
                    }
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
};
