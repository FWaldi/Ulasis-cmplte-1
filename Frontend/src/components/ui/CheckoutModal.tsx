import React, { useState } from 'react';
import type { DemoPlan } from '../../types';
import Modal from './Modal';
import { CreditCardIcon, LockIcon } from './Icons';
import DanaPaymentSimulationModal from './DanaPaymentSimulationModal';

interface CheckoutModalProps {
    plan: DemoPlan;
    onClose: () => void;
    onSuccess: (plan: DemoPlan) => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ plan, onClose, onSuccess }) => {
    
    const [isDanaModalOpen, setIsDanaModalOpen] = useState(false);

    const planDetails = {
        free: { name: 'Gratis', price: 0, priceText: 'Rp 0' },
        starter: { name: 'Starter', price: 49000, priceText: 'Rp 49.000' },
        business: { name: 'Business', price: 199000, priceText: 'Rp 199.000' },
    };

    const selectedPlanDetails = planDetails[plan];

    const handlePaymentSuccess = () => {
        setIsDanaModalOpen(false);
        onSuccess(plan);
    };

    return (
        <>
            <Modal title="Konfirmasi Pembayaran" onClose={onClose}>
                <div className="space-y-6">
                    <div>
                        <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">Ringkasan Pesanan</h3>
                        <div className="mt-2 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-2 border border-slate-200 dark:border-slate-600">
                            <div className="flex justify-between">
                                <span className="text-slate-600 dark:text-slate-300">Paket Langganan</span>
                                <span className="font-semibold">{selectedPlanDetails.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600 dark:text-slate-300">Periode</span>
                                <span className="font-semibold">Bulanan</span>
                            </div>
                            <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-600 flex justify-between">
                                <span className="font-bold text-slate-800 dark:text-slate-100">Total</span>
                                <span className="font-bold text-brand-primary">{selectedPlanDetails.priceText}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">Pilih Metode Pembayaran</h3>
                        <div className="mt-2 space-y-2">
                             <button
                                onClick={() => setIsDanaModalOpen(true)} 
                                className="w-full flex items-center p-4 rounded-lg border-2 border-brand-primary bg-brand-primary/10">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/7/72/Logo_dana_blue.svg" alt="DANA Logo" className="h-6" />
                                <span className="ml-4 font-bold text-slate-800 dark:text-slate-100">DANA</span>
                            </button>
                             <button className="w-full flex items-center p-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 cursor-not-allowed opacity-50 relative">
                                <CreditCardIcon className="w-6 h-6 text-slate-500" />
                                <span className="ml-4 font-semibold text-slate-500">Kartu Kredit/Debit</span>
                                <span className="absolute top-2 right-2 text-xs bg-slate-300 dark:bg-slate-600 px-1.5 py-0.5 rounded-full">Segera Hadir</span>
                            </button>
                        </div>
                    </div>
                    <div className="pt-4 flex items-center text-xs text-slate-500 dark:text-slate-400">
                        <LockIcon className="w-4 h-4 mr-2"/>
                        <span>Transaksi aman dan terenkripsi. Dengan melanjutkan, Anda menyetujui Ketentuan Layanan kami.</span>
                    </div>
                </div>
            </Modal>
            {isDanaModalOpen && (
                <DanaPaymentSimulationModal 
                    amount={selectedPlanDetails.price}
                    onClose={() => setIsDanaModalOpen(false)}
                    onSuccess={handlePaymentSuccess}
                />
            )}
        </>
    );
};

export default CheckoutModal;
