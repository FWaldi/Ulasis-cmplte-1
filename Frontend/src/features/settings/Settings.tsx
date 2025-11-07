import React, { useState } from 'react';
import type { DemoPlan, Invoice, PaymentMethod, NotificationSettings } from '../../types';
// Temporary inline icons to fix import issues
const UserIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
);

const CreditCardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
);

const BellIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
);

const LockIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
);
import ToggleSwitch from '../../../components/common/ToggleSwitch';
import CheckoutModal from '../../../components/common/CheckoutModal';

const SectionCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md dark:shadow-slate-700/50">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center">
                <div className="text-brand-primary dark:text-brand-accent">{icon}</div>
                <h2 className="ml-3 text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
            </div>
        </div>
        <div className="p-6">
            {children}
        </div>
    </div>
);


const Settings: React.FC<{ demoPlan: DemoPlan; setDemoPlan: (plan: DemoPlan) => void; isDemoMode?: boolean; }> = ({ demoPlan, setDemoPlan, isDemoMode = false }) => {
    
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<DemoPlan>('starter');

    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>({ type: 'DANA', phoneNumber: '**** **** 1234'});
    const [invoices, setInvoices] = useState<Invoice[]>([
        { id: 'INV-2023-010', date: '1 Okt 2023', description: 'Langganan Paket Starter', amount: 49000, status: 'Paid' },
        { id: 'INV-2023-009', date: '1 Sep 2023', description: 'Langganan Paket Starter', amount: 49000, status: 'Paid' },
    ]);
    const [notifications, setNotifications] = useState<NotificationSettings>({
        instantNegative: true,
        dailySummary: true,
        weeklySummary: false,
        productUpdates: true,
    });
    
    const planDetails = {
        free: { name: 'Gratis', price: 'Rp 0', features: ['1 Kuesioner', '50 Ulasan/bln'] },
        starter: { name: 'Starter', price: 'Rp 49rb/bln', features: ['5 Kuesioner', 'Ulasan tak terbatas'] },
        business: { name: 'Business', price: 'Rp 199rb/bln', features: ['Kuesioner tak terbatas', 'Laporan CSV'] },
    };

    const handleUpgradeClick = (plan: DemoPlan) => {
        setSelectedPlan(plan);
        setIsCheckoutModalOpen(true);
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Settings</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Profile Section */}
                    <SectionCard icon={<UserIcon className="w-6 h-6"/>} title="Profil">
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Nama Lengkap</label>
                                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{demoPlan === 'free' ? 'Pengguna Gratis' : 'Fitri Waldi'}</p>
                            </div>
                             <div>
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Email</label>
                                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{demoPlan === 'free' ? 'pengguna@email.com' : 'fitri.w@example.com'}</p>
                            </div>
                        </div>
                    </SectionCard>

                    {/* Billing Section */}
                    <SectionCard icon={<CreditCardIcon className="w-6 h-6"/>} title="Penagihan & Langganan">
                         <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Paket Saat Ini</label>
                                <p className="font-bold text-lg text-brand-primary dark:text-brand-accent mt-1">{planDetails[demoPlan].name}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Metode Pembayaran</label>
                                <div className="mt-1 flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <p className="font-semibold">{paymentMethod.type} - {paymentMethod.phoneNumber}</p>
                                    <button className="text-xs font-semibold text-brand-primary hover:underline">Ubah</button>
                                </div>
                            </div>
                            <div>
                                 <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Riwayat Tagihan</label>
                                 <ul className="mt-1 divide-y divide-slate-200 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg">
                                    {invoices.map(invoice => (
                                        <li key={invoice.id} className="p-3 flex justify-between items-center text-sm">
                                            <div>
                                                <p className="font-semibold">{invoice.description}</p>
                                                <p className="text-xs text-slate-500">{invoice.date}</p>
                                            </div>
                                            <p className="font-semibold">Rp {invoice.amount.toLocaleString('id-ID')}</p>
                                        </li>
                                    ))}
                                 </ul>
                            </div>
                         </div>
                    </SectionCard>

                    {/* Notifications Section */}
                    <SectionCard icon={<BellIcon className="w-6 h-6"/>} title="Notifikasi">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">Notifikasi Ulasan Negatif Instan</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Dapatkan email segera setelah ulasan buruk masuk.</p>
                                </div>
                                <ToggleSwitch enabled={notifications.instantNegative} setEnabled={(val) => setNotifications(p => ({...p, instantNegative: val}))}/>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">Ringkasan Harian</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Laporan ringkasan semua ulasan harian.</p>
                                </div>
                                <ToggleSwitch enabled={notifications.dailySummary} setEnabled={(val) => setNotifications(p => ({...p, dailySummary: val}))}/>
                            </div>
                             <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">Pembaruan Produk & Tips</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Dapatkan info fitur baru dan tips dari ULASIS.</p>
                                </div>
                                <ToggleSwitch enabled={notifications.productUpdates} setEnabled={(val) => setNotifications(p => ({...p, productUpdates: val}))}/>
                            </div>
                        </div>
                    </SectionCard>

                </div>

                {/* Plan Selection Card */}
                 <div className="space-y-4">
                     <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6">
                         <h3 className="font-bold text-lg mb-4">{isDemoMode ? 'Pilih Paket Demo' : 'Ganti Paket Langganan'}</h3>
                         <div className="space-y-3">
                             {(Object.keys(planDetails) as DemoPlan[]).map(plan => (
                                 <button key={plan} onClick={() => {
                                     if (isDemoMode) {
                                         setDemoPlan(plan);
                                     } else if (plan !== demoPlan) {
                                         handleUpgradeClick(plan);
                                     }
                                 }}
                                     className={`w-full text-left p-4 rounded-lg border-2 transition-all ${demoPlan === plan ? 'bg-brand-primary/10 border-brand-primary' : 'hover:border-brand-primary/50'}`}>
                                     <div className="flex justify-between items-center">
                                         <h4 className="font-bold text-slate-800 dark:text-slate-100">{planDetails[plan].name}</h4>
                                         {demoPlan === plan && <span className="text-xs font-bold bg-brand-primary text-white px-2 py-0.5 rounded-full">AKTIF</span>}
                                     </div>
                                     <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{isDemoMode ? 'Demo' : planDetails[plan].price}</p>
                                     <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{planDetails[plan].features.join(' · ')}</p>
                                 </button>
                             ))}
                         </div>
                     </div>
                 </div>

            </div>
            {isCheckoutModalOpen && (
                <CheckoutModal 
                    plan={selectedPlan} 
                    onClose={() => setIsCheckoutModalOpen(false)} 
                    onSuccess={(newPlan) => {
                        setDemoPlan(newPlan);
                        setIsCheckoutModalOpen(false);
                        alert(`Selamat! Anda telah berhasil upgrade ke paket ${planDetails[newPlan].name}.`);
                    }}
                />
            )}
        </div>
    );
};

export default Settings;
