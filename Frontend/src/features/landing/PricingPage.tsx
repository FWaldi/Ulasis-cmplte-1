
import React from 'react';
import { CheckIcon } from '../../../components/common/Icons';

interface PricingPageProps {
    onGoToRegister: () => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ onGoToRegister }) => {
    return (
        <main className="py-16 pb-20">
            <section id="pricing" className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-4 text-slate-900 dark:text-white">Harga Fleksibel untuk UKM Indonesia</h1>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-700 dark:text-slate-400">Mulai gratis, lalu pilih paket yang tumbuh bersama bisnis Anda. Tanpa kontrak, tanpa ribet.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center max-w-5xl mx-auto">
                    {/* Pricing Card 1 - Free */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-8 h-full flex flex-col">
                         <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">GRATIS</h4>
                         <p className="text-5xl font-extrabold my-4 text-slate-900 dark:text-white">Rp 0</p>
                         <p className="text-slate-600 dark:text-slate-400 h-12">Untuk coba-coba atau bisnis yang baru mulai.</p>
                         <ul className="space-y-3 text-slate-700 dark:text-slate-300 mt-4 flex-1">
                            <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> 1 Kuesioner Aktif</li>
                            <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> 50 Ulasan / bulan</li>
                            <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> Dashboard KPI Utama</li>
                            <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> Manajemen Ulasan (Inbox)</li>
                            <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> QR Code Standar</li>
                         </ul>
                         <button onClick={onGoToRegister} className="w-full mt-8 py-3 px-6 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Mulai Gratis</button>
                    </div>
                    {/* Pricing Card 2 - Starter (Highlighted) */}
                    <div className="border-2 border-brand-primary rounded-xl p-8 shadow-2xl relative h-full flex flex-col">
                        <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-brand-primary text-white text-xs font-bold px-3 py-1 rounded-full">PALING POPULER</div>
                         <h4 className="text-lg font-bold text-brand-primary">STARTER</h4>
                         <p className="text-5xl font-extrabold my-4 text-slate-900 dark:text-white">Rp 49rb<span className="text-xl font-medium text-slate-600 dark:text-slate-400">/bln</span></p>
                         <p className="text-slate-600 dark:text-slate-400 h-12">Untuk bisnis yang sedang bertumbuh.</p>
                         <ul className="space-y-3 text-slate-700 dark:text-slate-300 mt-4 flex-1">
                            <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> 5 Kuesioner Aktif</li>
                            <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> Ulasan Tak Terbatas</li>
                            <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> Kustomisasi Warna QR Code</li>
                            <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> Analisis Sentimen & Topik</li>
                            <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> Grafik Tren Kinerja</li>
                         </ul>
                         <button onClick={onGoToRegister} className="w-full mt-8 py-3 px-6 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-secondary transition-colors">Pilih Paket</button>
                    </div>
                    {/* Pricing Card 3 - Business */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-8 h-full flex flex-col">
                         <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">BUSINESS</h4>
                         <p className="text-5xl font-extrabold my-4 text-slate-900 dark:text-white">Rp 199rb<span className="text-xl font-medium text-slate-600 dark:text-slate-400">/bln</span></p>
                         <p className="text-slate-600 dark:text-slate-400 h-12">Untuk bisnis dengan banyak cabang dan kebutuhan analisis mendalam.</p>
                         <ul className="space-y-3 text-slate-700 dark:text-slate-300 mt-4 flex-1">
                            <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> Kuesioner Tak Terbatas</li>
                            <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> Kustomisasi Logo QR Code</li>
                            <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> Unduh Laporan PDF</li>
                            <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> Analisis per Sumber Ulasan</li>
                            <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> Manajemen Tim & Peran</li>
                         </ul>
                         <button onClick={onGoToRegister} className="w-full mt-8 py-3 px-6 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Pilih Paket</button>
                    </div>
                </div>
            </section>
        </main>
    );
};

export default PricingPage;