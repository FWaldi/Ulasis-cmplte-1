import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import type { QRCode as QRCodeType, Questionnaire, DemoPlan } from '../types';
import { DownloadIcon, CloseIcon, LockIcon } from './common/Icons';

interface QRCodePreviewProps {
  qrCode: QRCodeType;
  questionnaire: Questionnaire;
  isDemoMode: boolean;
  demoPlan: DemoPlan;
  onClose: () => void;
}

const QRCodePreview: React.FC<QRCodePreviewProps> = ({ 
  qrCode, 
  questionnaire, 
  isDemoMode, 
  demoPlan, 
  onClose 
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(true);
  const [downloadError, setDownloadError] = useState<string>('');

  // Generate QR code URL
  useEffect(() => {
    const generateQR = async () => {
      try {
        setIsGenerating(true);
        // Create a mock URL for the questionnaire
        const mockUrl = `https://ulasis.app/form/${questionnaire.id}`;
        
        // Generate QR code
        const url = await QRCode.toDataURL(mockUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: qrCode.color || '#007A7A',
            light: '#FFFFFF',
          },
          errorCorrectionLevel: 'M',
        });
        
        setQrCodeUrl(url);
      } catch (error) {
        console.error('Error generating QR code:', error);
        setDownloadError('Gagal generate QR code');
      } finally {
        setIsGenerating(false);
      }
    };

    generateQR();
  }, [qrCode.color, questionnaire.id]);

  const handleDownload = async () => {
    if (isDemoMode) {
      setDownloadError('Download tidak tersedia di mode demo');
      setTimeout(() => setDownloadError(''), 3000);
      return;
    }

    try {
      // Create a canvas with QR code and additional info
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Cannot get canvas context');

      canvas.width = 400;
      canvas.height = 500;

      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add title
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(qrCode.name, canvas.width / 2, 40);

      // Add questionnaire name
      ctx.font = '14px Arial';
      ctx.fillStyle = '#64748b';
      ctx.fillText(questionnaire.name, canvas.width / 2, 65);

      // Add QR code
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 50, 90, 300, 300);

        // Add footer text
        ctx.font = '12px Arial';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Scan untuk memberikan feedback', canvas.width / 2, 420);
        ctx.fillText('Powered by Ulasis', canvas.width / 2, 440);

        // Download the canvas
        const link = document.createElement('a');
        link.download = `qr-${qrCode.name.replace(/\s+/g, '-').toLowerCase()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      };
      img.src = qrCodeUrl;
    } catch (error) {
      console.error('Error downloading QR code:', error);
      setDownloadError('Gagal mengunduh QR code');
      setTimeout(() => setDownloadError(''), 3000);
    }
  };

  const isDownloadDisabled = isDemoMode;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Preview QR Code
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400">Membuat QR Code...</p>
            </div>
          ) : (
            <>
              {/* QR Code Display */}
              <div className="flex flex-col items-center mb-6">
                <div className="p-4 bg-white rounded-lg shadow-md">
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code" 
                    className="w-72 h-72"
                  />
                </div>
              </div>

              {/* QR Code Info */}
              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Nama QR Code</p>
                  <p className="text-base font-semibold text-slate-800 dark:text-slate-100">{qrCode.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Tertaut ke</p>
                  <p className="text-base font-semibold text-slate-800 dark:text-slate-100">{questionnaire.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Pindai</p>
                  <p className="text-base font-semibold text-slate-800 dark:text-slate-100">{qrCode.scans}</p>
                </div>
              </div>

              {/* Error Message */}
              {downloadError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{downloadError}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleDownload}
                  disabled={isDownloadDisabled}
                  className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors ${
                    isDownloadDisabled
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-brand-primary hover:bg-brand-secondary text-white'
                  }`}
                >
                  {isDownloadDisabled ? (
                    <>
                      <LockIcon className="w-4 h-4 mr-2" />
                      Download (Demo)
                    </>
                  ) : (
                    <>
                      <DownloadIcon className="w-4 h-4 mr-2" />
                      Download
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRCodePreview;