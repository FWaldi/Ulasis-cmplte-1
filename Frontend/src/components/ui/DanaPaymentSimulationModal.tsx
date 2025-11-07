import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Spinner } from './Spinner';
import { CheckIcon, CloseIcon } from './Icons';

interface DanaPaymentSimulationModalProps {
    amount: number;
    onClose: () => void;
    onSuccess: () => void;
}

const DanaPaymentSimulationModal: React.FC<DanaPaymentSimulationModalProps> = ({ amount, onClose, onSuccess }) => {
    const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
    
    const handlePay = () => {
        setStatus('processing');
        setTimeout(() => {
            // Simulate random success/failure
            if (Math.random() > 0.1) { // 90% success rate
                setStatus('success');
            } else {
                setStatus('failed');
            }
        }, 2000);
    };

    useEffect(() => {
        if (status === 'success') {
            const timer = setTimeout(() => {
                onSuccess();
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [status, onSuccess]);
    

    const renderContent = () => {
        switch(status) {
            case 'processing':
                return (
                    <div className="text-center py-10">
                        <Spinner />
                        <p className="mt-4 font-semibold text-slate-700 dark:text-slate-200">Memproses pembayaran...</p>
                    </div>
                );
            case 'success':
                 return (
                    <div className="text-center py-10 animate-fade-in">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                            <CheckIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Pembayaran Berhasil!</h3>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">Anda akan dialihkan kembali.</p>
                    </div>
                );
            case 'failed':
                 return (
                    <div className="text-center py-10 animate-fade-in">
                         <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                            <CloseIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Pembayaran Gagal</h3>
                        <p className="text-slate-600 dark:text-slate-400 mt-1 mb-4">Silakan coba lagi.</p>
                        <button onClick={() => setStatus('idle')} className="px-4 py-2 text-sm font-semibold bg-brand-primary hover:bg-brand-secondary text-white rounded-lg">
                            Coba Lagi
                        </button>
                    </div>
                );
            case 'idle':
            default:
                 return (
                    <div className="space-y-4">
                        <div className="text-center">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/7/72/Logo_dana_blue.svg" alt="DANA Logo" className="h-8 mx-auto mb-2" />
                            <p className="text-sm text-slate-600 dark:text-slate-400">Anda akan membayar sebesar</p>
                            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                                Rp {amount.toLocaleString('id-ID')}
                            </p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <p className="text-sm font-medium">Nomor Telepon DANA</p>
                            <p className="font-semibold">0812 **** 1234</p>
                        </div>
                        <div className="pt-4 flex flex-col sm:flex-row-reverse gap-2">
                             <button onClick={handlePay} className="w-full px-4 py-2 text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
                                Bayar
                            </button>
                             <button type="button" onClick={onClose} className="w-full px-4 py-2 text-sm font-semibold bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500">
                                Batal
                            </button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <Modal title="Simulasi Pembayaran DANA" onClose={status === 'idle' ? onClose : () => {}}>
            {renderContent()}
        </Modal>
    );
};

export default DanaPaymentSimulationModal;
